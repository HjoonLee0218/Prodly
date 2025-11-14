from groq import Groq
from PIL import ImageGrab
import base64
import io
import time
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def analyze_screen():
    # Capture screen
    screenshot = ImageGrab.grab()
    screenshot.thumbnail((800, 800))
    
    # Convert RGBA to RGB if needed
    if screenshot.mode == 'RGBA':
        screenshot = screenshot.convert('RGB')
    
    # Convert to base64
    buffered = io.BytesIO()
    screenshot.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    response = client.chat.completions.create(
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "Describe what the user appears to be working on or doing in 1-2 sentences."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_str}"}}
            ]
        }],
        model="meta-llama/llama-4-maverick-17b-128e-instruct",
        max_tokens=500,  
        temperature=0.7,
    )
    
    return response.choices[0].message.content

print("Screen analyzer starting...")

try:
    while True:
        start = time.time()
        description = analyze_screen()
        processing_time = time.time() - start
        
        print(f"\n[{time.strftime('%H:%M:%S')}] ({processing_time:.1f}s)")
        print(f"{description}")
        print("Waiting 10 seconds...")
        time.sleep(10)
        
except KeyboardInterrupt:
    print("\nStopped.")