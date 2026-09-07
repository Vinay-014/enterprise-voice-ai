import json

with open("scratch/hunar_recent_calls.json", "r") as f:
    calls = json.load(f)

print(f"Total calls: {len(calls)}")
screening_calls = [c for c in calls if c.get("agent_id") == "0f870d5a-ba01-4a4a-bc97-611727aa1837"]
print(f"Found {len(screening_calls)} screening calls with agent 0f870d5a-ba01-4a4a-bc97-611727aa1837:")

for c in screening_calls:
    print(f"- ID: {c.get('id')} | Name: {c.get('callee_name')} | Phone: {c.get('mobile_number')} | Created: {c.get('created_at')} | Status: {c.get('status')} | Duration: {c.get('duration_seconds')}s")
    print(f"  Result: {c.get('result')}")
    print(f"  Custom Data: {c.get('custom_data')}")
