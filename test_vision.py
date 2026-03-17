import os
import requests
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8')

api_key = os.getenv("GROQ_API_KEY")
model_name = "meta-llama/llama-4-scout-17b-16e-instruct"
image_url = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" # A red shoe

def test_model(model_name):
    print(f"\n--- Testing Model: {model_name} ---")
    try:
        img_resp = requests.get(image_url, timeout=10)
        base64_image = base64.b64encode(img_resp.content).decode('utf-8')
        content_type = img_resp.headers.get('content-type', 'image/jpeg')
    except Exception as e:
        print(f"Fetch Error: {e}")
        return

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is the color of the object in this image? Give 1 word answer."},
                    {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{base64_image}"}}
                ]
            }
        ],
        "temperature": 0.1
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("Vision Success!")
            print("AI Response:", result['choices'][0]['message']['content'])
            return True
        else:
            print(f"Error Result: {response.text}")
            return False
    except Exception as e:
        print(f"Request Error: {e}")
        return False

if __name__ == "__main__":
    test_model(model_name)
