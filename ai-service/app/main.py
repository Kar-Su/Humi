import json

from fastapi import FastAPI, WebSocket

from app import protocol
from app.pipeline import Pipeline

app = FastAPI(title="ai-service", version="0.2.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-service"}


@app.websocket("/ws/session")
async def session(ws: WebSocket) -> None:
    await ws.accept()
    try:
        pipe = Pipeline(
            emit=lambda msg: _send_json(ws, msg),
            emit_audio=lambda frame: _send_bytes(ws, frame),
        )
        await pipe.start()
    except Exception as e:
        await _send_json(ws, {"type": "error", "message": f"init: {e}"})
        await ws.close(code=1011)
        return
    try:
        while True:
            raw = await ws.receive()
            if raw.get("bytes"):
                await pipe.handle(protocol.Inbound(type="audio_chunk"), raw["bytes"])
            elif raw.get("text"):
                msg = protocol.Inbound.model_validate_json(raw["text"])
                await pipe.handle(msg)
    except Exception as e:
        try:
            await _send_json(ws, {"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        await pipe.stop()


async def _send_json(ws: WebSocket, msg: dict) -> None:
    await ws.send_text(json.dumps(msg))


async def _send_bytes(ws: WebSocket, frame: bytes) -> None:
    await ws.send_bytes(frame)