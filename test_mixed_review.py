import json
import urllib.request

# Test 1: Mixed review with "good but damaged"
req1 = urllib.request.Request(
    "http://127.0.0.1:5000/api/generate-reply",
    data=json.dumps({"review": "the art is good but it is damaged", "customer_name": "Karthik"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
r1 = urllib.request.urlopen(req1)
print("=== Review: 'the art is good but it is damaged' ===")
print("Status:", r1.status)
data1 = json.loads(r1.read().decode("utf-8"))
print("Reply:", data1["reply"])
print("Sentiment:", data1["sentiment"])
print()

# Test 2: Pure positive review
req2 = urllib.request.Request(
    "http://127.0.0.1:5000/api/generate-reply",
    data=json.dumps({"review": "Amazing mural art, loved it!", "customer_name": "Test User"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
r2 = urllib.request.urlopen(req2)
print("=== Review: 'Amazing mural art, loved it!' ===")
data2 = json.loads(r2.read().decode("utf-8"))
print("Reply:", data2["reply"])
print("Sentiment:", data2["sentiment"])
print()

# Test 3: Pure negative review
req3 = urllib.request.Request(
    "http://127.0.0.1:5000/api/generate-reply",
    data=json.dumps({"review": "The painting arrived damaged", "customer_name": "Priya"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
r3 = urllib.request.urlopen(req3)
print("=== Review: 'The painting arrived damaged' ===")
data3 = json.loads(r3.read().decode("utf-8"))
print("Reply:", data3["reply"])
print("Sentiment:", data3["sentiment"])