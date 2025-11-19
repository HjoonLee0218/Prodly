from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from ws_manager import WebSocketManager
except ModuleNotFoundError:  # pragma: no cover - package import fallback
    from .ws_manager import WebSocketManager

try:
    from analysis_service import ScreenAnalysis, describe_screen, ScreenCaptureError
except ModuleNotFoundError:  # pragma: no cover - package import fallback
    from .analysis_service import ScreenAnalysis, describe_screen, ScreenCaptureError

FocusState = Literal["on_task", "off_task"]
SESSION_INTERVAL_SECONDS = 10

manager = WebSocketManager()


@dataclass
class ActiveSession:
    task_description: str
    ends_at: datetime
    last_summary: str | None = None
    last_state: FocusState | None = None
    last_updated: datetime | None = None

    @property
    def seconds_remaining(self) -> int:
        return max(int((self.ends_at - datetime.now(timezone.utc)).total_seconds()), 0)

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.ends_at


class SessionStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._session: ActiveSession | None = None

    async def get(self) -> ActiveSession | None:
        async with self._lock:
            return self._session

    async def set(self, task_description: str, duration_minutes: int) -> ActiveSession:
        trimmed_task = task_description.strip()
        ends_at = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
        async with self._lock:
            self._session = ActiveSession(task_description=trimmed_task, ends_at=ends_at)
            return self._session

    async def clear(self) -> None:
        async with self._lock:
            self._session = None

    async def update_result(self, summary: str, state: FocusState) -> ActiveSession | None:
        async with self._lock:
            if not self._session:
                return None
            self._session.last_summary = summary
            self._session.last_state = state
            self._session.last_updated = datetime.now(timezone.utc)
            return self._session


session_store = SessionStore()


async def _analysis_loop() -> None:
    while True:
        await asyncio.sleep(SESSION_INTERVAL_SECONDS)
        session = await session_store.get()
        if not session:
            continue

        if session.is_expired:
            await session_store.clear()
            await manager.broadcast({"state": "on_task", "session_active": False})
            continue

        try:
            analysis: ScreenAnalysis = await asyncio.to_thread(
                describe_screen, session.task_description
            )
        except ScreenCaptureError as error:
            await manager.broadcast(
                {
                    "state": session.last_state or "on_task",
                    "task": session.task_description,
                    "session_active": True,
                    "error": str(error),
                }
            )
            continue
        except Exception:  # pragma: no cover - runtime safeguard
            continue

        await session_store.update_result(analysis.summary, analysis.state)
        await manager.broadcast(
            {
                "state": analysis.state,
                "summary": analysis.summary,
                "task": session.task_description,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_active": True,
            }
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    analysis_task = asyncio.create_task(_analysis_loop())
    try:
        yield
    finally:
        analysis_task.cancel()
        with suppress(asyncio.CancelledError):
            await analysis_task


app = FastAPI(title="FocusAgent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_session_info(session: ActiveSession) -> "SessionInfo":
    return SessionInfo(
        task_description=session.task_description,
        ends_at=session.ends_at,
        seconds_remaining=session.seconds_remaining,
        last_summary=session.last_summary,
        last_state=session.last_state,
        session_active=True,
    )


@app.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}


class AnalyzeRequest(BaseModel):
    task_description: str


class AnalyzeResponse(BaseModel):
    summary: str
    state: FocusState


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        analysis = await asyncio.to_thread(describe_screen, request.task_description)
    except ScreenCaptureError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - runtime safeguard
        raise HTTPException(status_code=500, detail="Failed to analyze the screen.") from error

    return AnalyzeResponse(summary=analysis.summary, state=analysis.state)


class SessionStartRequest(BaseModel):
    task_description: str
    duration_minutes: int = Field(..., ge=1, le=480)


class SessionInfo(BaseModel):
    task_description: str
    ends_at: datetime
    seconds_remaining: int
    last_summary: str | None = None
    last_state: FocusState | None = None
    session_active: bool = True


class SessionEndResponse(BaseModel):
    status: str = "ended"


@app.post("/session", response_model=SessionInfo)
async def start_session(request: SessionStartRequest) -> SessionInfo:
    if not request.task_description.strip():
        raise HTTPException(status_code=400, detail="Task description cannot be empty.")

    session = await session_store.set(request.task_description, request.duration_minutes)
    await manager.broadcast(
        {
            "state": session.last_state or "on_task",
            "task": session.task_description,
            "session_active": True,
        }
    )
    return _build_session_info(session)


@app.get("/session", response_model=SessionInfo)
async def get_session() -> SessionInfo:
    session = await session_store.get()
    if not session or session.is_expired:
        await session_store.clear()
        raise HTTPException(status_code=404, detail="No active session.")
    return _build_session_info(session)


@app.delete("/session", response_model=SessionEndResponse)
async def end_session() -> SessionEndResponse:
    await session_store.clear()
    await manager.broadcast({"state": "on_task", "session_active": False})
    return SessionEndResponse()


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
