let recording: any = null;

export interface AudioOptions {
  sampleRate?: number;
  onChunk: (pcmBuffer: Buffer) => void;
  onError: (err: Error) => void;
}

export function startRecording(opts: AudioOptions): void {
  if (recording) return;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const recorder = require('node-record-lpcm16');
  recording = recorder.record({
    sampleRate: opts.sampleRate ?? 16000,
    channels: 1,
    audioType: 'raw',
    encoding: 'signed-integer',
    bits: 16,
    endian: 'little',
  });

  // Catch errors on both the child process (e.g. sox ENOENT) and the stream.
  recording.process?.on('error', (err: Error) => opts.onError(err));
  recording.stream()
    .on('data', (chunk: Buffer) => opts.onChunk(chunk))
    .on('error', (err: Error) => opts.onError(err));
}

export function stopRecording(): void {
  recording?.stop();
  recording = null;
}
