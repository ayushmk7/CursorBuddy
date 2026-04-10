package proxy_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/cursorbuddy/bridge/internal/proxy"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

// startUpstream starts a test WebSocket server that echoes messages.
func startUpstream(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			mt, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			conn.WriteMessage(mt, msg) // echo
		}
	}))
	return srv
}

func TestProxy_EchosMessage(t *testing.T) {
	upstream := startUpstream(t)
	defer upstream.Close()

	// Convert http:// to ws://
	upstreamWS := "ws" + strings.TrimPrefix(upstream.URL, "http")

	// Start proxy server
	p := proxy.New(proxy.Config{IdleTimeout: 5 * time.Second})
	proxySrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p.ServeWS(w, r, upstreamWS, nil)
	}))
	defer proxySrv.Close()

	// Connect client to proxy
	proxyWS := "ws" + strings.TrimPrefix(proxySrv.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(proxyWS, nil)
	if err != nil {
		t.Fatalf("dial proxy: %v", err)
	}
	defer conn.Close()

	// Send message through proxy → upstream → back
	conn.WriteMessage(websocket.TextMessage, []byte("hello"))
	conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if string(msg) != "hello" {
		t.Errorf("got %q want hello", msg)
	}
}
