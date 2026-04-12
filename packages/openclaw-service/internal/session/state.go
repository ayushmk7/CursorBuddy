package session

type State string

const (
	StateCreated           State = "created"
	StateAwaitingInput     State = "awaiting_input"
	StateReceivingAudio    State = "receiving_audio"
	StateFinalizingInput   State = "finalizing_input"
	StateAwaitingToolResult State = "awaiting_tool_result"
	StateComposingResponse State = "composing_response"
	StateEmittingResponse  State = "emitting_response"
	StateClosed            State = "closed"
	StateErrored           State = "errored"
)
