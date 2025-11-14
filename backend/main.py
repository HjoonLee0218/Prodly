from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
from itertools import cycle

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

try:
    from ws_manager import WebSocketManager
except ModuleNotFoundError:  # pragma: no cover - package import fallback
    from .ws_manager import WebSocketManager

manager = WebSocketManager()


async def _broadcast_loop() -> None:
    state_cycle = cycle(["on_task", "off_task"])
    while True:
        state = next(state_cycle)
        await manager.broadcast({"state": state})
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(_: FastAPI):
    broadcast_task = asyncio.create_task(_broadcast_loop())
    try:
        yield
    finally:
        broadcast_task.cancel()
        with suppress(asyncio.CancelledError):
            await broadcast_task


app = FastAPI(title="FocusAgent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, RuntimeError):
        await manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
