"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicState = "idle" | "requesting" | "ready" | "denied" | "unavailable";

/**
 * Microphone access with a live input level (0–1) for meters and a "speaking" ring.
 * `enabled` mutes at the track, so nothing leaves the device while muted.
 */
export function useMicrophone() {
  const [state, setState] = useState<MicState>("idle");
  const [level, setLevel] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return null;
    }
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(analyser);
      ctxRef.current = ctx;
      const buf = new Uint8Array(analyser.fftSize);
      let last = 0;
      const tick = (t: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (t - last < 90) return; // ~11 updates a second is plenty for a meter
        last = t;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        const enabled = s.getAudioTracks()[0]?.enabled ?? false;
        setLevel(enabled ? Math.min(1, Math.sqrt(sum / buf.length) * 4) : 0);
      };
      rafRef.current = requestAnimationFrame(tick);
      setStream(s);
      setState("ready");
      return s;
    } catch (e) {
      setState(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "unavailable");
      return null;
    }
  }, []);

  const setEnabled = useCallback(
    (on: boolean) => {
      stream?.getAudioTracks().forEach((t) => (t.enabled = on));
    },
    [stream],
  );

  useEffect(() => stop, [stop]);

  return { state, level, stream, start, stop, setEnabled };
}
