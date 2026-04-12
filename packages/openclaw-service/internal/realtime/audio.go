package realtime

type AudioChunk struct {
	Data       string `json:"data"`
	Encoding   string `json:"encoding"`
	SampleRate int    `json:"sample_rate"`
}
