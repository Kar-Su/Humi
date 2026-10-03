import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarCanvas } from "./components/AvatarCanvas";
import { Icon } from "./components/Icon";
import { Toast } from "./components/Toast";
import { TypingDots } from "./components/TypingDots";
import { useAudioQueue } from "./hooks/useAudioQueue";
import { useMicCapture } from "./hooks/useMicCapture";
import { useToast } from "./hooks/useToast";
import { emotionLabel, isEmphasised } from "./lib/emotionLabel";
import type { Emotion, Outbound } from "./lib/protocol";

type Status = "menyambung" | "terhubung" | "terputus";
type Pesan =
  | { id: number; kind: "user"; teks: string }
  | { id: number; kind: "ai"; teks: string; emotion: Emotion };

/** Status pill: dot plus label, so the state is not carried by colour alone. */
const gayaStatus: Record<Status, { pill: string; dot: string; label: string }> = {
  menyambung: {
    pill: "bg-warn/10 text-warn",
    dot: "bg-warn",
    label: "Menyambung",
  },
  terhubung: {
    pill: "bg-ok/10 text-ok",
    dot: "bg-ok",
    label: "Terhubung",
  },
  terputus: {
    pill: "bg-bad/10 text-bad",
    dot: "bg-bad",
    label: "Terputus",
  },
};

/** Focus ring shared by every control, so keyboard order is visible on all of them. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export default function App() {
  const [status, setStatus] = useState<Status>("menyambung");
  const [lang, setLang] = useState<"id" | "en">(
    () => (localStorage.getItem("humi_lang") as "id" | "en" | null) ?? "id",
  );
  useEffect(() => {
    localStorage.setItem("humi_lang", lang);
  }, [lang]);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [draft, setDraft] = useState("");
  const [rec, setRec] = useState(false);
  const [isHumiTyping, setIsHumiTyping] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const idBerikut = useRef(0);
  const typingControlRef = useRef<{ clearAll: () => void } | null>(null);

  const aq = useAudioQueue();
  const aqRef = useRef(aq);
  useEffect(() => {
    aqRef.current = aq;
  }, [aq]);
  const [emotion, setEmotion] = useState<Emotion>("netral");
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll trigger on pesan/isHumiTyping
  useEffect(() => {
    sectionRef.current?.scrollTo({ top: sectionRef.current.scrollHeight, behavior: "smooth" });
  }, [pesan, isHumiTyping]);
  useEffect(() => {
    if (!isHumiTyping) return;
    const t = window.setTimeout(() => setIsHumiTyping(false), 15000);
    return () => clearTimeout(t);
  }, [isHumiTyping]);
  const sendJson = useCallback((s: string) => socketRef.current?.send(s), []);
  const sendBin = useCallback((b: ArrayBuffer) => socketRef.current?.send(b), []);
  const mic = useMicCapture(sendJson, sendBin);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let pingTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let attempt = 0;

    const clearPing = () => {
      if (pingTimer !== null) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      setStatus("terputus");
      attempt += 1;
      const delay = Math.min(1000 * 1.5 ** (attempt - 1), 10000);
      reconnectTimer = window.setTimeout(() => connect(), delay);
    };

    const connect = () => {
      if (cancelled) return;
      setStatus("menyambung");
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${location.host}/ws`;
      ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      socketRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus("terhubung");
        clearPing();
        pingTimer = window.setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch {}
          }
        }, 25000);
      };

      ws.onclose = (ev) => {
        clearPing();
        if (socketRef.current === ws) socketRef.current = null;
        if (cancelled) {
          setStatus("terputus");
          return;
        }
        if (ev.code !== 1000)
          toastRef.current.show(`WS terputus (code ${ev.code}) - reconnect...`, 3000);
        scheduleReconnect();
      };

      ws.onerror = () => {
        setStatus("terputus");
      };

      const TTS_LEAD_MS = 1500;
      const pendingText = new Map<number, { text: string; emotion: Emotion }>();
      let typingTimer: number | null = null;
      const typingQueue: Array<{ text: string; emotion: Emotion; duration: number }> = [];
      let isTyping = false;
      const typingDelayTimers: number[] = [];
      const clearTyping = () => {
        if (typingTimer !== null) {
          clearInterval(typingTimer);
          typingTimer = null;
        }
        isTyping = false;
      };
      const clearPendingDelays = () => {
        for (const t of typingDelayTimers) clearTimeout(t);
        typingDelayTimers.length = 0;
      };
      typingControlRef.current = {
        clearAll: () => {
          clearTyping();
          clearPendingDelays();
          typingQueue.length = 0;
          pendingText.clear();
          setIsHumiTyping(false);
        },
      };
      const drainQueue = () => {
        if (isTyping || typingQueue.length === 0) return;
        // biome-ignore lint/style/noNonNullAssertion: guarded by length check above
        const next = typingQueue.shift()!;
        isTyping = true;
        setIsHumiTyping(false);
        setEmotion(next.emotion);
        const bubbleId = idBerikut.current++;
        setPesan((prev) => [
          ...prev,
          { id: bubbleId, kind: "ai", teks: "", emotion: next.emotion },
        ]);
        const totalMs = Math.max(
          400,
          Math.min(4000, next.duration > 0 ? next.duration * 1000 : next.text.length * 40),
        );
        const perChar = Math.max(16, Math.min(60, totalMs / Math.max(1, next.text.length)));
        let idx = 0;
        typingTimer = window.setInterval(() => {
          idx += 1;
          const slice = next.text.slice(0, idx);
          setPesan((prev) => prev.map((p) => (p.id === bubbleId ? { ...p, teks: slice } : p)));
          if (idx >= next.text.length) {
            clearInterval(typingTimer as unknown as number);
            typingTimer = null;
            isTyping = false;
            drainQueue();
          }
        }, perChar) as unknown as number;
      };
      const startTyping = (chunkText: string, chunkEmotion: Emotion, duration: number) => {
        if (!chunkText) return;
        typingQueue.push({ text: chunkText, emotion: chunkEmotion, duration });
        drainQueue();
      };

      ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          aqRef.current.onFrame(event.data as ArrayBuffer);
          return;
        }
        if (typeof event.data === "string") {
          const raw = event.data as string;
          let msg: Outbound;
          try {
            msg = JSON.parse(raw) as Outbound;
          } catch {
            toastRef.current.show(raw as string, 3000);
            return;
          }
          if (msg.type === "pong") return;
          if (msg.type === "llm_sentence") {
            pendingText.set(msg.seq, {
              text: msg.text ?? "",
              emotion: (msg.emotion ?? "netral") as Emotion,
            });
            return;
          }
          if (msg.type === "tts_start") {
            aqRef.current.onTtsStart(msg.seq, msg.sample_rate);
            const seqs = (msg as unknown as { seqs?: number[] }).seqs ?? [msg.seq];
            const dur = (msg as unknown as { duration?: number }).duration ?? 0;
            const emo = (msg as unknown as { emotion?: string }).emotion as Emotion | undefined;
            const parts: string[] = [];
            let chunkEmo: Emotion | undefined = emo as Emotion | undefined;
            for (const s of seqs) {
              const p = pendingText.get(s);
              if (p) {
                parts.push(p.text);
                if (!chunkEmo) chunkEmo = p.emotion;
                pendingText.delete(s);
              }
            }
            const chunkText = parts.join(" ");
            if (chunkText) {
              const tid = window.setTimeout(() => {
                setIsHumiTyping(false);
                startTyping(chunkText, (chunkEmo ?? "netral") as Emotion, dur);
              }, TTS_LEAD_MS);
              typingDelayTimers.push(tid);
            }
            return;
          }
          if (msg.type === "tts_end") {
            aqRef.current.onTtsEnd(msg.seq);
            return;
          }
          if (msg.type === "turn_end") {
            if (pendingText.size > 0) {
              for (const v of pendingText.values()) {
                typingQueue.push({ text: v.text, emotion: v.emotion as Emotion, duration: 0 });
              }
              pendingText.clear();
              drainQueue();
            } else if (typingQueue.length === 0 && typingDelayTimers.length === 0) {
              setIsHumiTyping(false);
            }
            return;
          }
          if (msg.type === "session_ready") return;
          if (msg.type === "error") {
            clearTyping();
            clearPendingDelays();
            typingQueue.length = 0;
            pendingText.clear();
            setIsHumiTyping(false);
            toastRef.current.show(msg.message ?? "Terjadi kesalahan", 3000);
            return;
          }
          if (msg.type === "stt_final") {
            setPesan((prev) => [
              ...prev,
              { id: idBerikut.current++, kind: "ai", teks: `stt: ${msg.text}`, emotion: "netral" },
            ]);
          }
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearPing();
      typingControlRef.current?.clearAll();
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      socketRef.current = null;
    };
  }, []);

  const kirim = () => {
    const teks = draft.trim();
    if (!teks) return;
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const state = ws
        ? (["menyambung", "terhubung", "menutup", "terputus"][ws.readyState] ??
          String(ws.readyState))
        : "tanpa koneksi";
      setStatus("terputus");
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      toast.show(`Belum terhubung (ws: ${state}) - reconnect...`, 3000);
      return;
    }
    aqRef.current.ensureCtx();
    typingControlRef.current?.clearAll();
    setIsHumiTyping(true);
    setPesan((prev) => [...prev, { id: idBerikut.current++, kind: "user", teks }]);
    try {
      ws.send(JSON.stringify({ type: "text", text: teks, lang }));
    } catch {
      toast.show("Gagal kirim - koneksi terputus, coba lagi", 3000);
      setStatus("terputus");
      try {
        ws.close();
      } catch {}
      return;
    }
    setDraft("");
  };

  const interupsi = () => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "interrupt" }));
    aqRef.current.interrupt();
    typingControlRef.current?.clearAll();
    setEmotion("netral");
  };

  const mulaiRec = async () => {
    if (status !== "terhubung" || rec) return;
    try {
      aqRef.current.interrupt();
      await mic.start();
      setRec(true);
    } catch {
      toast.show("mic error: izin ditolak", 3000);
    }
  };

  const selesaiRec = () => {
    if (!rec) return;
    setRec(false);
    mic.stop();
  };

  const statusGaya = gayaStatus[status];
  const terhubung = status === "terhubung";

  return (
    <main className="grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] gap-3 bg-canvas p-3 text-ink sm:gap-4 sm:p-4 lg:grid-cols-[3fr_2fr] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-6 lg:p-6">
      <Toast items={toast.items} />

      <header className="flex items-center justify-between gap-3 lg:col-span-2">
        <h1 className="flex items-center gap-2 font-display text-title font-semibold">
          Humi
          {aq.isSpeaking && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-caption font-medium text-live-ink"
              role="status"
            >
              <span className="size-1.5 rounded-full bg-live-ink motion-safe:animate-pulse" />
              Bicara
            </span>
          )}
        </h1>

        <div className="flex items-center gap-2">
          {/* fieldset rather than role="group": it is the semantic element for a set of
              related controls sharing one label, so screen readers announce the group name
              from the DOM instead of from an ARIA override. */}
          <fieldset className="m-0 flex rounded-full border border-edge p-0.5">
            <legend className="sr-only">Bahasa jawaban Humi</legend>
            {(["id", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`cursor-pointer rounded-full px-3 py-1 text-caption font-medium uppercase transition-colors duration-150 ${FOCUS} ${
                  lang === code ? "bg-brand text-brand-ink" : "text-ink-subtle hover:text-ink"
                }`}
              >
                {code}
              </button>
            ))}
          </fieldset>

          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-caption font-medium ${statusGaya.pill}`}
            role="status"
            aria-live="polite"
          >
            <span className={`size-2 rounded-full ${statusGaya.dot}`} aria-hidden="true" />
            {statusGaya.label}
          </span>
        </div>
      </header>

      <AvatarCanvas emotion={emotion} analyser={aq.analyser} speaking={aq.isSpeaking} />

      <section
        ref={sectionRef as unknown as React.RefObject<HTMLDivElement>}
        aria-label="Riwayat percakapan"
        aria-live="polite"
        className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel"
      >
        {pesan.length === 0 ? (
          <p className="px-4 py-4 text-body-sm text-ink-subtle">
            Ketik pesan di bawah, atau tahan tombol mikrofon untuk bicara. Suara Humi mengalir per
            kalimat, jadi responsnya mulai terdengar sebelum kalimat selesai.
          </p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {pesan.map((p) =>
              p.kind === "user" ? (
                <li key={p.id} className="flex justify-end">
                  <span className="max-w-[75ch] rounded-md rounded-tr-sm border border-line bg-bubble px-3.5 py-2.5 text-body text-ink">
                    {p.teks}
                  </span>
                </li>
              ) : (
                <li key={p.id} className="flex flex-col items-start gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-caption ${
                      isEmphasised(p.emotion)
                        ? "bg-emotion text-emotion-ink"
                        : "bg-raised text-ink-subtle"
                    }`}
                  >
                    {emotionLabel(p.emotion)}
                  </span>
                  <span className="max-w-[75ch] rounded-md rounded-tl-sm bg-raised px-3.5 py-2.5 text-body text-ink">
                    {p.teks}
                  </span>
                </li>
              ),
            )}
            {isHumiTyping && (
              <li className="flex items-center gap-2 self-start rounded-md rounded-tl-sm bg-raised px-3.5 py-2.5 text-body-sm text-ink-subtle">
                <TypingDots />
                Humi sedang mengetik
              </li>
            )}
          </ul>
        )}
        {pesan.length === 0 && isHumiTyping && (
          <div className="m-4 mt-0 flex items-center gap-2 self-start rounded-md rounded-tl-sm bg-raised px-3.5 py-2.5 text-body-sm text-ink-subtle">
            <TypingDots />
            Humi sedang mengetik
          </div>
        )}
      </section>

      {/* min-w-0 on the input is what lets the row shrink. Without it the flex item keeps
          its intrinsic text width and the whole document overflows narrow viewports. */}
      <footer className="flex flex-wrap items-center gap-2 lg:col-span-2">
        <label htmlFor="composer" className="sr-only">
          Tulis pesan untuk Humi
        </label>
        <input
          id="composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && kirim()}
          placeholder={terhubung ? "Tulis pesan..." : "Menunggu koneksi..."}
          disabled={!terhubung}
          className={`min-w-[12rem] flex-1 rounded-sm border border-edge bg-panel px-3.5 py-3 text-body text-ink transition-colors duration-150 placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:opacity-50 lg:text-body-sm ${FOCUS}`}
        />
        <button
          type="button"
          onClick={kirim}
          disabled={!terhubung}
          aria-label="Kirim pesan"
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 font-medium text-brand-ink transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
        >
          <Icon name="send" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
        <button
          type="button"
          onMouseDown={mulaiRec}
          onMouseUp={selesaiRec}
          onMouseLeave={selesaiRec}
          onTouchStart={(e) => {
            e.preventDefault();
            void mulaiRec();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            selesaiRec();
          }}
          disabled={!terhubung}
          aria-pressed={rec}
          aria-label={rec ? "Hentikan rekaman" : "Tahan untuk bicara"}
          className={`inline-flex cursor-pointer items-center justify-center rounded-md px-3.5 py-3 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${
            rec
              ? "bg-brand text-brand-ink"
              : "border border-edge bg-transparent text-ink hover:bg-raised"
          }`}
        >
          <Icon name={rec ? "stop" : "mic"} />
        </button>
        <button
          type="button"
          onClick={interupsi}
          disabled={!terhubung}
          aria-label="Hentikan jawaban Humi sekarang"
          className={`inline-flex cursor-pointer items-center justify-center rounded-md border border-edge bg-transparent px-3.5 py-3 text-ink transition-colors duration-150 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
        >
          <Icon name="stop" />
        </button>
      </footer>
    </main>
  );
}
