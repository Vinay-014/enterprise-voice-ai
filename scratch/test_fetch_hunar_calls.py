import asyncio
import httpx
import json

API_KEY = "hunar_va_live_sk_h9Wk6V6Rv6DawsyRHcmiXRW8AeiL27Xark3ntv8oKx6lJUqGdWXvxQ"
BASE_URL = "https://api.voice.hunar.ai"
AGENT_ID = "0f870d5a-ba01-4a4a-bc97-611727aa1837"
REACHOUT_AGENT_ID = "ffc1ebd5-6c44-4864-be80-cbf5e0ae8011"
IVR_AGENT_ID = "845421cc-5b74-43bc-a9ae-2aaf78b4e403"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    "User-Agent": "Hunar-Voice-Agents/1.0"
}

endpoints_to_test = [
    f"{BASE_URL}/external/v1/calls",
    f"{BASE_URL}/external/v1/calls/",
    f"{BASE_URL}/v1/calls",
    f"{BASE_URL}/v1/calls/",
    f"{BASE_URL}/external/v1/agents/{AGENT_ID}/calls",
    f"{BASE_URL}/v1/agents/{AGENT_ID}/calls",
    f"{BASE_URL}/external/v1/agents/{REACHOUT_AGENT_ID}/calls",
    f"{BASE_URL}/external/v1/agents/{IVR_AGENT_ID}/calls",
    f"{BASE_URL}/external/v1/logs",
    f"{BASE_URL}/external/v1/history",
    f"{BASE_URL}/v1/history",
]

async def main():
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for ep in endpoints_to_test:
            try:
                r = await client.get(ep, headers=headers)
                print(f"GET {ep} -> HTTP {r.status_code}")
                if r.status_code == 200:
                    try:
                        data = r.json()
                        print(f"Data type: {type(data)}")
                        preview = json.dumps(data, indent=2)[:1000]
                        print(f"Response preview:\n{preview}\n---")
                        if isinstance(data, list):
                            print(f"Found {len(data)} calls in list!")
                            for item in data:
                                print(f"Call item: {item.get('id') or item.get('call_id')}, name: {item.get('callee_name') or item.get('candidate_name') or item.get('name')}, phone: {item.get('to_number') or item.get('mobile_number') or item.get('phone_number')}")
                        elif isinstance(data, dict):
                            items = data.get("calls") or data.get("data") or data.get("results") or data.get("items")
                            if items and isinstance(items, list):
                                print(f"Found {len(items)} calls in dict list!")
                                for item in items:
                                    print(f"Call item: {item.get('id') or item.get('call_id')}, name: {item.get('callee_name') or item.get('candidate_name') or item.get('name')}, phone: {item.get('to_number') or item.get('mobile_number') or item.get('phone_number')}")
                    except Exception as ex:
                        print(f"Error parsing JSON: {ex}, text: {r.text[:300]}")
            except Exception as e:
                print(f"GET {ep} failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
