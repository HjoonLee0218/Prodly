from __future__ import annotations

import time

try:
    from analysis_service import describe_screen
except ModuleNotFoundError:  # pragma: no cover - package import fallback
    from .analysis_service import describe_screen

print("Screen analyzer starting...")

try:
    while True:
        start = time.time()
        description = describe_screen("Describe the user's activity.")
        processing_time = time.time() - start
        
        print(f"\n[{time.strftime('%H:%M:%S')}] ({processing_time:.1f}s)")
        print(f"{description}")
        print("Waiting 10 seconds...")
        time.sleep(10)
        
except KeyboardInterrupt:
    print("\nStopped.")
