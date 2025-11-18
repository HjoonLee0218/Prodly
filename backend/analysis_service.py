from __future__ import annotations

import base64
import io
import os
from typing import Final

from dotenv import load_dotenv
from groq import Groq
from PIL import Image
from mss import mss, exception as mss_exception

load_dotenv()

GROQ_API_KEY: Final[str | None] = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file.")

client = Groq(api_key=GROQ_API_KEY)


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


def describe_screen(task_description: str) -> str:
    """
    Analyze the user's screen and compare what is shown to the provided task description.
    """

    prompt = (
        "You are an assistant that monitors whether a computer user's activity matches the task "
        "they claim to be focusing on.\n\n"
        f"The user says their task is: \"{task_description.strip() or 'No task provided'}\".\n"
        "Look at the screenshot and respond with:\n"
        "1. A concise description (1-2 sentences) of what you see them doing.\n"
        "2. Whether that seems aligned with the stated task (Yes/No/Unsure).\n"
        "3. A short suggestion to get back on track if they appear distracted.\n"
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
        max_tokens=500,
        temperature=0.7,
    )

    return response.choices[0].message.content.strip()
