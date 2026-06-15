import requests

url = "http://localhost:8000/batch-predict"
headers = {"X-API-Key": "demo-key-123"}

with open("data/processed/cleaned.csv", "rb") as f:
    files = {"file": ("cleaned.csv", f, "text/csv")}
    response = requests.post(url, headers=headers, files=files)
    print(response.status_code)
    print(response.json())
