"use client";

/**
 * Audio transport for meeting rooms. Carrying voice between participants needs a media server
 * (an SFU such as LiveKit or mediasoup) on the backend. Until it is wired in, this local transport
 * keeps the microphone on the user's own device — the room, presence, mute and admin controls all
 * work; only the voice itself is not relayed.
 *
 * Backend integration: replace `localTransport` with one that connects to the media server using a
 * short-lived room token from the API, publishes `stream`, and plays remote tracks.
 */
export type AudioTransport = {
  /** True once voice is actually relayed between participants. */
  relays: boolean;
  connect(meetingId: string, userId: string, stream: MediaStream): void;
  disconnect(): void;
};

const localTransport: AudioTransport = {
  relays: false,
  connect() {},
  disconnect() {},
};

export const audioTransport: AudioTransport = localTransport;
