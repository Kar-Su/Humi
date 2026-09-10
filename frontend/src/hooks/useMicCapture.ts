import { useCallback, useRef } from "react";
import { logger } from "../lib/logger";

type SendJson = (s: string) => void;
type SendBin = (b: ArrayBuffer) => void;

function pcm16ToBytes(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-32768, Math.min(32767, Math.round((samples[i] ?? 0) * 32767)));
    dv.setInt16(i * 2, v, true);
  }
  return out;
}

export function useMicCapture(sendJson: SendJson, sendBin: SendBin) {
  const ctxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const seqRef = useRef(0);
  const recRef = useRef(false);

  const start = useCallback(async () => {
    if (recRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1 },
    });
    streamRef.current = stream;
    const ctx = new AudioContext({ sampleRate: 16000 });
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    procRef.current = proc;
    seqRef.current = 0;
    recRef.current = true;
    logger.audio.info("audio_start sent");
    sendJson(JSON.stringify({ type: "audio_start", format: "pcm16le", sample_rate: 16000 }));
    proc.onaudioprocess = (e) => {
      if (!recRef.current) return;
      const ch = e.inputBuffer.getChannelData(0);
      const payload = pcm16ToBytes(ch);
      const frame = new Uint8Array(8 + payload.length);
      const dv = new DataView(frame.buffer);
      dv.setUint32(0, seqRef.current++ >>> 0, true);
      dv.setUint32(4, payload.length >>> 0, true);
      frame.set(payload, 8);
      // ArrayBuffer detached-safe: clone
      sendBin(frame.buffer.slice(0) as ArrayBuffer);
    };
    src.connect(proc);
    proc.connect(ctx.destination);
  }, [sendJson, sendBin]);

  const stop = useCallback(() => {
    recRef.current = false;
    if (procRef.current) {
      procRef.current.disconnect();
      procRef.current = null;
    }
    if (ctxRef.current) {
      void ctxRef.current.close();
      ctxRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    logger.audio.info("audio_end sent");
    sendJson(JSON.stringify({ type: "audio_end" }));
  }, [sendJson]);

  const cancel = useCallback(() => {
    if (ctxRef.current) void ctxRef.current.close();
  }, []);

  return { start, stop, cancel };
}
