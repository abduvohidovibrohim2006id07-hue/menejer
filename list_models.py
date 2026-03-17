import os
import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("GROQ_API_KEY not found")
    exit(1)

url = "https://api.groq.com/openai/v1/models"
headers = {"Authorization": f"Bearer {api_key}"}

try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        models = response.json().get("data", [])
        print("Available Models:")
        for m in sorted([x['id'] for x in models]):
            print(f"- {m}")
    else:
        print(f"Error: {response.status_code} {response.text}")
except Exception as e:
    print(f"Failed: {e}")
