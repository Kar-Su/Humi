import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioQueue } from "./hooks/useAudioQueue";
import { useMicCapture } from "./hooks/useMicCapture";
import type { Outbound } from "./lib/protocol";

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
  const sendJson = useCallback((s: string) => socketRef.current?.send(s), []);
  const sendBin = useCallback((b: ArrayBuffer) => socketRef.current?.send(b), []);
  const mic = useMicCapture(sendJson, sendBin);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.binaryType = "arraybuffer";
    socketRef.current = ws;
    ws.onopen = () => setStatus("terhubung");
    ws.onclose = () => setStatus("terputus");
    ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        aq.onFrame(event.data as ArrayBuffer);
        return;
      }
      if (typeof event.data === "string") {
        let msg: Outbound;
        try {
          msg = JSON.parse(event.data) as Outbound;
        } catch {
          setPesan((prev) => [
            ...prev,
            { id: idBerikut.current++, kind: "ai", teks: event.data as string, emotion: "netral" },
          ]);
          return;
        }
        if (msg.type === "llm_sentence") {
          setPesan((prev) => [
            ...prev,
            {
              id: idBerikut.current++,
              kind: "ai",
              teks: msg.text ?? "",
              emotion: msg.emotion ?? "netral",
            },
          ]);
        } else if (msg.type === "tts_start") {
          aq.onTtsStart(msg.seq, msg.sample_rate);
        } else if (msg.type === "tts_end") {
          aq.onTtsEnd(msg.seq);
        } else if (msg.type === "turn_end") {
          // ponytail: scroll ke bawah di sini bila perlu
        } else if (msg.type === "error") {
          setPesan((prev) => [
            ...prev,
            {
              id: idBerikut.current++,
              kind: "ai",
              teks: `error: ${msg.message}`,
              emotion: "netral",
            },
          ]);
        } else if (msg.type === "stt_final") {
          setPesan((prev) => [
            ...prev,
            { id: idBerikut.current++, kind: "ai", teks: `stt: ${msg.text}`, emotion: "netral" },
          ]);
        }
      }
    };
    return () => ws.close();
  }, [aq]);

  const kirim = () => {
    const teks = draft.trim();
    if (!teks || socketRef.current?.readyState !== WebSocket.OPEN) return;
    aq.ensureCtx();
    setPesan((prev) => [...prev, { id: idBerikut.current++, kind: "user", teks }]);
    socketRef.current.send(JSON.stringify({ type: "text", text: teks }));
    setDraft("");
  };

  const interupsi = () => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "interrupt" }));
    aq.interrupt();
  };

  const mulaiRec = async () => {
    if (status !== "terhubung" || rec) return;
    try {
      aq.interrupt();
      await mic.start();
      setRec(true);
    } catch {
      setPesan((prev) => [
        ...prev,
        { id: idBerikut.current++, kind: "ai", teks: "mic error: izin ditolak", emotion: "netral" },
      ]);
    }
  };

  const selesaiRec = () => {
    if (!rec) return;
    setRec(false);
    mic.stop();
  };

  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Humi {aq.isSpeaking ? "🔊" : ""}</h1>
        <span className={`rounded-full px-3 py-1 text-xs ${gayaStatus[status]}`}>WS: {status}</span>
      </header>

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
