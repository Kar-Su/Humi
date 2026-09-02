import { useCallback, useRef, useState } from "react";
import { HEADER_BYTES } from "../lib/protocol";

export function useAudioQueue() {
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const queueRef = useRef<AudioBuffer[]>([]);
  const pendingRef = useRef<Map<number, { sr: number; chunks: Uint8Array[] }>>(new Map());
  const [speaking, setSpeaking] = useState(false);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const ctx = ensureCtx();
    const buf = queueRef.current.shift() as AudioBuffer;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    srcRef.current = src;
    src.onended = () => {
      srcRef.current = null;
      playNext();
    };
    src.start();
  }, [ensureCtx]);

  const onTtsStart = useCallback(
    (seq: number, sr: number) => {
      pendingRef.current.set(seq, { sr, chunks: [] });
      ensureCtx();
    },
    [ensureCtx],
  );

  const onFrame = useCallback((ab: ArrayBuffer) => {
    const u8 = new Uint8Array(ab);
    if (u8.length < HEADER_BYTES) return;
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const seq = v.getUint32(0, true);
    const len = v.getUint32(4, true);
    if (u8.length < HEADER_BYTES + len) return;
    const payload = u8.slice(HEADER_BYTES, HEADER_BYTES + len);
    const entry = pendingRef.current.get(seq);
    if (entry) entry.chunks.push(payload);
    else pendingRef.current.set(seq, { sr: 32000, chunks: [payload] });
  }, []);

  const onTtsEnd = useCallback(
    (seq: number) => {
      const entry = pendingRef.current.get(seq);
      if (!entry || entry.chunks.length === 0) return;
      pendingRef.current.delete(seq);
      const total = entry.chunks.reduce((a, c) => a + c.length, 0);
      const pcm = new Uint8Array(total);
      let o = 0;
      for (const c of entry.chunks) {
        pcm.set(c, o);
        o += c.length;
      }
      const ctx = ensureCtx();
      const len = pcm.length / 2;
      const buf = ctx.createBuffer(1, len, entry.sr);
      const ch = buf.getChannelData(0);
      const dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      for (let i = 0; i < len; i++) ch[i] = dv.getInt16(i * 2, true) / 32768;
      queueRef.current.push(buf);
      if (!srcRef.current) playNext();
    },
    [ensureCtx, playNext],
  );

  const interrupt = useCallback(() => {
    if (srcRef.current) {
      try {
        srcRef.current.stop();
      } catch {
        // already stopped
      }
      srcRef.current = null;
    }
    queueRef.current = [];
    pendingRef.current.clear();
    setSpeaking(false);
  }, []);

  return { onTtsStart, onFrame, onTtsEnd, interrupt, isSpeaking: speaking, ensureCtx };
}
