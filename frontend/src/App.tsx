import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarCanvas } from "./components/AvatarCanvas";
import { Toast } from "./components/Toast";
import { useAudioQueue } from "./hooks/useAudioQueue";
import { useMicCapture } from "./hooks/useMicCapture";
import { useToast } from "./hooks/useToast";
import { logger } from "./lib/logger";
import type { Emotion, Outbound } from "./lib/protocol";

type Status = "menyambung" | "terhubung" | "terputus";
type Pesan =
  | { id: number; kind: "user"; teks: string }
  | { id: number; kind: "ai"; teks: string; emotion: string };

const gayaStatus: Record<Status, string> = {
  menyambung: "bg-yellow-500/20 text-yellow-300",
  terhubung: "bg-green-500/20 text-green-300",
  terputus: "bg-red-500/20 text-red-300",
};

export default function App() {
  const [status, setStatus] = useState<Status>("menyambung");
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [draft, setDraft] = useState("");
  const [rec, setRec] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const idBerikut = useRef(0);

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
      logger.ws.info("connect", url, `attempt=${attempt + 1}`);
      ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      socketRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus("terhubung");
        logger.ws.info("open", url);
        clearPing();
        pingTimer = window.setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
              logger.ws.debug("ping sent");
            } catch (e) {
              logger.ws.warn("ping send failed", e);
            }
          }
        }, 25000);
      };

      ws.onclose = (ev) => {
        clearPing();
        logger.ws.warn("close", `code=${ev.code} reason=${ev.reason} clean=${ev.wasClean}`);
        if (socketRef.current === ws) socketRef.current = null;
        if (cancelled) {
          setStatus("terputus");
          return;
        }
        if (ev.code !== 1000)
          toastRef.current.show(`WS terputus (code ${ev.code}) — reconnect...`, 3000);
        scheduleReconnect();
      };

      ws.onerror = (ev) => {
        logger.ws.error("error", ev);
        setStatus("terputus");
      };

      ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          const len = (event.data as ArrayBuffer).byteLength;
          logger.ws.debug("recv binary", `len=${len}`);
          aqRef.current.onFrame(event.data as ArrayBuffer);
          return;
        }
        if (typeof event.data === "string") {
          const raw = event.data as string;
          logger.ws.debug("recv text", raw.slice(0, 300));
          let msg: Outbound;
          try {
            msg = JSON.parse(raw) as Outbound;
          } catch {
            logger.ws.warn("recv non-JSON", raw.slice(0, 200));
            toastRef.current.show(raw as string, 3000);
            return;
          }
          if ((msg as unknown as { type: string }).type === "pong") {
            logger.ws.debug("pong received");
            return;
          }
          logger.ws.info("recv", `type=${msg.type}`);
          if (msg.type === "llm_sentence") {
            const emo = (msg.emotion ?? "netral") as Emotion;
            setTimeout(() => setEmotion(emo), 300);
            setPesan((prev) => [
              ...prev,
              { id: idBerikut.current++, kind: "ai", teks: msg.text ?? "", emotion: emo },
            ]);
          } else if (msg.type === "tts_start") {
            aqRef.current.onTtsStart(msg.seq, msg.sample_rate);
          } else if (msg.type === "tts_end") {
            aqRef.current.onTtsEnd(msg.seq);
          } else if (msg.type === "turn_end") {
            logger.ws.info("turn_end");
          } else if (msg.type === "session_ready") {
            logger.ws.info("session_ready", msg.config);
          } else if (msg.type === "error") {
            logger.ws.error("server error", msg.message);
            toastRef.current.show(msg.message ?? "Terjadi kesalahan", 3000);
          } else if (msg.type === "stt_final") {
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
    logger.ws.info("kirim attempt", `text="${teks.slice(0, 80)}" wsState=${ws?.readyState}`);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const state = ws
        ? (["menyambung", "terhubung", "menutup", "terputus"][ws.readyState] ??
          String(ws.readyState))
        : "tanpa koneksi";
      logger.ws.warn("kirim blocked — not open", `state=${state}`);
      // badge desync: status masih "terhubung" tapi socket sudah menutup/tertutup
      // sync badge segera + tutup socket biar onclose → reconnect terjadwal
      setStatus("terputus");
      if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      } else if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      toast.show(`Belum terhubung (ws: ${state}) — reconnect...`, 3000);
      return;
    }
    aqRef.current.ensureCtx();
    setPesan((prev) => [...prev, { id: idBerikut.current++, kind: "user", teks }]);
    try {
      const payload = JSON.stringify({ type: "text", text: teks });
      ws.send(payload);
      logger.ws.info("kirim sent", `len=${payload.length}`);
    } catch (e) {
      logger.ws.error("kirim failed", e);
      toast.show("Gagal kirim — koneksi terputus, coba lagi", 3000);
      setStatus("terputus");
      try {
        ws.close();
      } catch {
        // ignore
      }
      return;
    }
    setDraft("");
  };

  const interupsi = () => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      logger.ws.warn("interupsi blocked — not open");
      return;
    }
    logger.ws.info("interupsi sent");
    socketRef.current.send(JSON.stringify({ type: "interrupt" }));
    aqRef.current.interrupt();
    setEmotion("netral");
  };

  const mulaiRec = async () => {
    if (status !== "terhubung" || rec) return;
    logger.audio.info("mic start");
    try {
      aqRef.current.interrupt();
      await mic.start();
      setRec(true);
      logger.audio.info("mic started");
    } catch (e) {
      logger.audio.error("mic error", e);
      toast.show("mic error: izin ditolak", 3000);
    }
  };

  const selesaiRec = () => {
    if (!rec) return;
    logger.audio.info("mic stop");
    setRec(false);
    mic.stop();
  };

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col gap-4 p-6">
      <Toast items={toast.items} />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Humi {aq.isSpeaking ? "🔊" : ""}</h1>
        <span className={`rounded-full px-3 py-1 text-xs ${gayaStatus[status]}`}>WS: {status}</span>
      </header>

      <AvatarCanvas emotion={emotion} analyser={aq.analyser} />

      <section className="flex-1 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        {pesan.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Fase C — ketik atau tahan 🎙 untuk bicara. Audio TTS streaming per kalimat.
          </p>
        ) : (
          <ul className="space-y-2">
            {pesan.map((p) =>
              p.kind === "user" ? (
                <li
                  key={p.id}
                  className="ml-10 rounded-lg bg-indigo-700 px-3 py-2 text-sm text-white"
                >
                  {p.teks}
                </li>
              ) : (
                <li key={p.id} className="mr-10 rounded-lg bg-neutral-800 px-3 py-2 text-sm">
                  <span className="text-[11px] text-neutral-500">{p.emotion}</span> {p.teks}
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <footer className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && kirim()}
          placeholder={status === "terhubung" ? "Tulis pesan…" : "Menunggu koneksi…"}
          disabled={status !== "terhubung"}
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={kirim}
          disabled={status !== "terhubung"}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          Kirim
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
          disabled={status !== "terhubung"}
          className={`rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${rec ? "bg-red-600 text-white" : "border border-neutral-700"}`}
          title="Tahan untuk bicara"
        >
          🎙
        </button>
        <button
          type="button"
          onClick={interupsi}
          disabled={status !== "terhubung"}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm disabled:opacity-50"
          title="Interupsi turn berjalan"
        >
          ⏹
        </button>
      </footer>
    </main>
  );
}
