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
    "d0c540e0-5160-4744-b9bb-119cd144035e", # Vinay K S (448s)
    "3115812e-cd0d-4003-91bb-521722a72a7c", # Arrshith A (268s)
    "5acf04f5-c862-480b-829d-431069068a6f", # Vinay (104s)
]

async def check_calls():
    async with httpx.AsyncClient(timeout=15.0) as client:
        for cid in call_ids:
            url = f"{BASE_URL}/external/v1/calls/{cid}/"
            r = await client.get(url, headers=headers)
            print(f"=== CALL {cid} (HTTP {r.status_code}) ===")
            if r.status_code == 200:
                data = r.json()
                print(json.dumps(data, indent=2))
                with open(f"scratch/call_{cid}.json", "w") as f:
                    json.dump(data, f, indent=2)

if __name__ == "__main__":
    asyncio.run(check_calls())
