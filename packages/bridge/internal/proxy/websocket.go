package proxy

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// Config holds proxy settings.
type Config struct {
	IdleTimeout time.Duration // close connection after this long with no messages
}

// Proxy performs transparent bidirectional WebSocket proxying.
type Proxy struct {
	cfg      Config
	upgrader websocket.Upgrader
}

// New creates a Proxy with the given config.
func New(cfg Config) *Proxy {
	return &Proxy{
		cfg: cfg,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true }, // trust sidecar origin
		},
	}
}

// ServeWS upgrades the incoming request to WebSocket, dials upstreamURL,
// and bidirectionally copies frames until either side closes or idle timeout fires.
// extraHeaders are added to the upstream dial (e.g. Authorization).
func (p *Proxy) ServeWS(w http.ResponseWriter, r *http.Request, upstreamURL string, extraHeaders http.Header) {
	client, err := p.upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("proxy: upgrade client", "err", err)
		return
	}
	defer client.Close()

	upstream, _, err := websocket.DefaultDialer.Dial(upstreamURL, extraHeaders)
	if err != nil {
		slog.Error("proxy: dial upstream", "url", upstreamURL, "err", err)
		client.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "upstream unavailable"))
		return
	}
	defer upstream.Close()

	errc := make(chan error, 2)

	copyFrames := func(dst, src *websocket.Conn) {
		for {
			if p.cfg.IdleTimeout > 0 {
				src.SetReadDeadline(time.Now().Add(p.cfg.IdleTimeout))
			}
			mt, msg, err := src.ReadMessage()
			if err != nil {
				errc <- err
				return
			}
			if err := dst.WriteMessage(mt, msg); err != nil {
				errc <- err
				return
			}
		}
	}

	go copyFrames(upstream, client)
	go copyFrames(client, upstream)

	err = <-errc
	// Explicitly close both connections so the second goroutine unblocks immediately.
	client.Close()
	upstream.Close()
	if err != nil && !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
		slog.Debug("proxy: connection closed", "err", err)
	}
}
