from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
from itertools import cycle

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from ws_manager import WebSocketManager
except ModuleNotFoundError:  # pragma: no cover - package import fallback
    from .ws_manager import WebSocketManager

try:
    from analysis_service import describe_screen, ScreenCaptureError
except ModuleNotFoundError:  # pragma: no cover - package import fallback
    from .analysis_service import describe_screen, ScreenCaptureError

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


class AnalyzeRequest(BaseModel):
    task_description: str


class AnalyzeResponse(BaseModel):
    summary: str


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        summary = await asyncio.to_thread(describe_screen, request.task_description)
    except ScreenCaptureError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - runtime safeguard
        raise HTTPException(status_code=500, detail="Failed to analyze the screen.") from error

    return AnalyzeResponse(summary=summary)


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
