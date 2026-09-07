import asyncio
import httpx
import json

API_KEY = "hunar_va_live_sk_h9Wk6V6Rv6DawsyRHcmiXRW8AeiL27Xark3ntv8oKx6lJUqGdWXvxQ"
BASE_URL = "https://api.voice.hunar.ai"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    "User-Agent": "Hunar-Voice-Agents/1.0"
}

async def fetch_recent_calls():
    async with httpx.AsyncClient(timeout=15.0) as client:
        page = 1
        all_calls = []
        while page <= 10:
            url = f"{BASE_URL}/external/v1/calls/?page={page}"
            r = await client.get(url, headers=headers)
            if r.status_code != 200:
                print(f"Page {page} returned {r.status_code}")
                break
            data = r.json()
            results = data.get("results", [])
            if not results:
                break
            for call in results:
                all_calls.append(call)
            if not data.get("next"):
                break
            page += 1

        print(f"Total calls fetched across pages: {len(all_calls)}")
        for idx, c in enumerate(all_calls):
            print(f"[{idx+1}] ID: {c.get('id')} | Name: {c.get('callee_name')} | Phone: {c.get('mobile_number')} | Created: {c.get('created_at')} | Status: {c.get('status')} | Duration: {c.get('duration_seconds')}s")
            # print snippet of custom_data / result
            if any(name.lower() in str(c.get('callee_name', '')).lower() or name.lower() in str(c.get('custom_data', '')).lower() for name in ['vinay', 'arrshith', 'arshith', 'screening']):
                print(f"   MATCH -> custom_data: {c.get('custom_data')}")
                print(f"   MATCH -> result: {c.get('result')}")

        with open("scratch/hunar_recent_calls.json", "w") as f:
            json.dump(all_calls, f, indent=2)
        print("Saved to scratch/hunar_recent_calls.json")

if __name__ == "__main__":
    asyncio.run(fetch_recent_calls())
