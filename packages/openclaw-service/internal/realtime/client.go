package realtime

type Client struct {
	APIKey string
	Model  string
}

func NewClient(apiKey, model string) *Client {
	return &Client{APIKey: apiKey, Model: model}
}
