package realtime

import "encoding/json"

type ServerEvent struct {
	Type  string `json:"type"`
	Delta string `json:"delta,omitempty"`
}

func ParseServerEvent(raw []byte) (ServerEvent, error) {
	var event ServerEvent
	err := json.Unmarshal(raw, &event)
	return event, err
}
