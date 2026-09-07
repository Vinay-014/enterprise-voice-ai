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

call_ids = [
    "2fe12fa0-b6ce-4db3-9136-d55e67e505e6",
    "d0c540e0-5160-4744-b9bb-119cd144035e",
    "3115812e-cd0d-4003-91bb-521722a72a7c",
    "5acf04f5-c862-480b-829d-431069068a6f"
]

async def check_all():
    async with httpx.AsyncClient(timeout=15.0) as client:
        for cid in call_ids:
            url = f"{BASE_URL}/external/v1/calls/{cid}/"
            r = await client.get(url, headers=headers)
            if r.status_code == 200:
                data = r.json()
                with open(f"scratch/call_{cid}.json", "w") as f:
                    json.dump(data, f, indent=2)
                print(f"=== CALL {cid} ===")
                print(f"Name: {data.get('callee_name')}")
                print(f"Duration: {data.get('duration_seconds')}s")
                print(f"Recording: {data.get('recording_url')}")
                print(f"Result: {data.get('result')}")
                print(f"System Data: {data.get('system_data')}")
                print(f"Custom Data: {data.get('custom_data')}")

if __name__ == "__main__":
    asyncio.run(check_all())
