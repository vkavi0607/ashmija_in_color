import json
import urllib.request

req = urllib.request.Request(
    "http://127.0.0.1:5000/api/generate-reply",
    data=json.dumps({"review": "Amazing mural art, loved the colors!", "customer_name": "Test User"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
r = urllib.request.urlopen(req)
print("Status:", r.status)
print("Response:", r.read().decode("utf-8")[:500])