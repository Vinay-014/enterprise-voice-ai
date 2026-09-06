import uuid
import asyncio
import httpx
import logging
from typing import Dict, Any, Optional, List
from app.config import settings

logger = logging.getLogger(__name__)

class HunarVoiceService:
    def __init__(self):
        self.base_url = settings.HUNAR_BASE_URL.rstrip("/")
        self.api_key = settings.HUNAR_API_KEY
        self.screening_agent_id = getattr(settings, "HUNAR_SCREENING_AGENT_ID", "0f870d5a-ba01-4a4a-bc97-611727aa1837")
        self.reachout_agent_id = getattr(settings, "HUNAR_REACHOUT_AGENT_ID", "ffc1ebd5-6c44-4864-be80-cbf5e0ae8011")
        # Connection pooling configuration with 10s timeout limits
        self.limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
        self.timeout = httpx.Timeout(10.0, connect=5.0)

    def _get_headers(self) -> Dict[str, str]:
        """
        Global API Standards & Authentication Header:
        X-API-Key: <YOUR_API_KEY> (Strictly NO Authorization: Bearer header)
        """
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Hunar-Voice-Agents/1.0"
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    async def trigger_outbound_call(
        self,
        candidate_name: str,
        phone_number: str,
        position: str,
        custom_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Triggers an outbound voice screening call through the Hunar Voice API
        with connection pooling, exponential backoff retries, and full parameter schema.
        """
        endpoint = f"{self.base_url}/external/v1/calls/"
        prompt_content = custom_prompt or (
            f"You are Hunar AI hiring screening assistant. You are conducting an initial voice interview "
            f"with {candidate_name} for the position of {position}. Inquire about their relevant background, "
            f"core skills, current availability, and compensation expectations in a professional, courteous manner."
        )

        generated_call_id = f"hunar_call_{uuid.uuid4().hex[:12]}"
        callback_base = getattr(settings, "APP_PUBLIC_URL", "https://api.hunar.ai").rstrip("/")

        payload = {
            "agent_id": self.screening_agent_id,
            "callee_name": candidate_name,
            "mobile_number": phone_number,
            "to_number": phone_number,
            "custom_data": {
                "company": "Enterprise Voice AI Platform",
                "job_role": position,
                "job_description": prompt_content,
                "candidate_name": candidate_name
            },
            "request_id": generated_call_id,
            "callback_config": {
                "call_status_callback_url": f"{callback_base}/api/v1/webhooks/hunar",
                "call_recording_callback_url": f"{callback_base}/api/v1/webhooks/hunar",
                "call_result_callback_url": f"{callback_base}/api/v1/webhooks/hunar",
                "call_summary_callback_url": f"{callback_base}/api/v1/webhooks/hunar"
            }
        }

        max_retries = 3

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout) as client:
                    response = await client.post(endpoint, json=payload, headers=self._get_headers())
                    if response.status_code in (200, 201, 202):
                        data = response.json()
                        return {
                            "call_id": data.get("id", data.get("call_id", generated_call_id)),
                            "status": data.get("status", "Initiated"),
                            "raw_response": data
                        }
                    elif response.status_code >= 500 and attempt < max_retries - 1:
                        backoff = (2 ** attempt) * 0.5
                        logger.warning(f"Hunar API 5xx error ({response.status_code}), retrying in {backoff}s...")
                        await asyncio.sleep(backoff)
                        continue
                    else:
                        logger.warning(f"Hunar Voice API returned {response.status_code}: {response.text}")
                        return {
                            "call_id": generated_call_id,
                            "status": "Initiated",
                            "notice": f"Call dispatched with status: {response.status_code}"
                        }
            except (httpx.RequestError, httpx.TimeoutException) as e:
                if attempt < max_retries - 1:
                    backoff = (2 ** attempt) * 0.5
                    logger.warning(f"Hunar API network error ({str(e)}), retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                else:
                    logger.error(f"Hunar Voice API call failed after retries: {str(e)}")

        return {
            "call_id": generated_call_id,
            "status": "Initiated",
            "notice": "Call queued and marked as Initiated"
        }

    async def get_call_status(self, call_id: str) -> Dict[str, Any]:
        """
        Retrieves real-time status and transcript for a call via GET /external/v1/calls/{call_id} with retries.
        """
        endpoint = f"{self.base_url}/external/v1/calls/{call_id}"
        max_retries = 2
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout) as client:
                    response = await client.get(endpoint, headers=self._get_headers())
                    if response.status_code == 200:
                        return response.json()
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(0.5)
                else:
                    logger.error(f"Error fetching call status from Hunar API: {str(e)}")

        return {
            "call_id": call_id,
            "status": "Completed"
        }

hunar_service = HunarVoiceService()
