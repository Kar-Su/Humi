import json
import logging
import time

from fastapi import FastAPI, WebSocket

from app import protocol
from app.pipeline import Pipeline

logger = logging.getLogger("ai-service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

app = FastAPI(title="ai-service", version="0.2.0")


@app.get("/health")
def health() -> dict[str, str]:
    logger.debug("[health] hit")
    return {"status": "ok", "service": "ai-service"}


@app.websocket("/ws/session")
async def session(ws: WebSocket) -> None:
    await ws.accept()
    t0 = time.monotonic()
    logger.info("[ws] session accepted client=%s", ws.client)
    try:
        pipe = Pipeline(
            emit=lambda msg: _send_json(ws, msg),
            emit_audio=lambda frame: _send_bytes(ws, frame),
        )
        await pipe.start()
        logger.info("[ws] pipeline started model=%s", pipe.llm.model)
    except Exception as e:
        logger.error("[ws] pipeline init failed: %s", e, exc_info=True)
        await _send_json(ws, {"type": "error", "message": f"init: {e}"})
        await ws.close(code=1011)
        return
    try:
        while True:
            raw = await ws.receive()
            if raw.get("bytes"):
                blen = len(raw["bytes"])
                logger.info("[ws] recv binary len=%d elapsed=%.1fs", blen, time.monotonic() - t0)
                await pipe.handle(protocol.Inbound(type="audio_chunk"), raw["bytes"])
            elif raw.get("text"):
                txt = raw["text"]
                preview = txt[:200] + "…" if len(txt) > 200 else txt
                logger.info(
                    "[ws] recv text len=%d msg=%s elapsed=%.1fs",
                    len(txt),
                    preview,
                    time.monotonic() - t0,
                )
                try:
                    msg = protocol.Inbound.model_validate_json(txt)
                except Exception as e:
                    logger.warning("[ws] invalid inbound json: %s raw=%s", e, preview)
                    await _send_json(ws, {"type": "error", "message": f"invalid message: {e}"})
                    continue
                await pipe.handle(msg)
            else:
                logger.warning("[ws] recv unknown frame keys=%s", list(raw.keys()))
    except Exception as e:
        logger.info("[ws] session ended: %s elapsed=%.1fs", e, time.monotonic() - t0)
        try:
            await _send_json(ws, {"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        logger.info("[ws] session cleanup elapsed=%.1fs", time.monotonic() - t0)
        await pipe.stop()


async def _send_json(ws: WebSocket, msg: dict) -> None:
    preview = json.dumps(msg)
    if len(preview) > 300:
        preview = preview[:300] + "…"
    logger.debug("[ws] send_json type=%s len=%d msg=%s", msg.get("type"), len(preview), preview)
    await ws.send_text(json.dumps(msg))


async def _send_bytes(ws: WebSocket, frame: bytes) -> None:
    logger.debug("[ws] send_bytes len=%d", len(frame))
    await ws.send_bytes(frame)
