from __future__ import annotations

import base64
import io
import json
import os
import re
from dataclasses import dataclass
from typing import Final, Literal

from dotenv import load_dotenv
from groq import Groq
from PIL import Image
from mss import mss, exception as mss_exception

load_dotenv()

GROQ_API_KEY: Final[str | None] = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file.")

client = Groq(api_key=GROQ_API_KEY)

FocusState = Literal["on_task", "off_task"]


@dataclass
class ScreenAnalysis:
    summary: str
    state: FocusState


class ScreenCaptureError(RuntimeError):
    """Raised when the screen cannot be captured."""


def _capture_screen_base64() -> str:
    try:
        with mss() as sct:
            monitor = sct.monitors[0]
            raw = sct.grab(monitor)
    except mss_exception.ScreenShotError as error:  # pragma: no cover - system specific failure
        raise ScreenCaptureError(
            "Unable to capture the screen. Ensure a display is accessible to the backend process."
        ) from error

    screenshot = Image.frombytes("RGB", raw.size, raw.rgb)
    screenshot.thumbnail((800, 800))

    buffered = io.BytesIO()
    screenshot.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode()


def _parse_response_content(content: str) -> dict[str, str]:
    content = content.strip()
    if not content:
        return {}

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def describe_screen(task_description: str) -> ScreenAnalysis:
    """
    Analyze the user's screen and compare what is shown to the provided task description.
    """

    prompt = (
        "You monitor whether a computer user's screen activity matches the task they claim to be "
        "working on.\n\n"
        f"The task they provided is: \"{task_description.strip() or 'No task provided'}\".\n"
        "Carefully inspect the screenshot and respond with a **single JSON object** containing:\n"
        '  "summary": A concise 1-2 sentence description + advice.\n'
        '  "alignment": Either "on_task" if they appear to be working on the task or "off_task" '
        "if they look distracted/unsure.\n"
    )

    img_str = _capture_screen_base64()

    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_str}"}},
                ],
            }
        ],
        model="meta-llama/llama-4-maverick-17b-128e-instruct",
        max_tokens=400,
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    raw_content = response.choices[0].message.content or ""

    try:
        parsed = _parse_response_content(raw_content)
    except json.JSONDecodeError:
        return ScreenAnalysis(summary=raw_content.strip() or "Unable to parse model response.", state="off_task")

    alignment = str(parsed.get("alignment", "")).strip().lower()
    state: FocusState = "on_task" if alignment == "on_task" else "off_task"
    summary = str(parsed.get("summary", "")).strip() or "No summary provided."

    return ScreenAnalysis(summary=summary, state=state)
