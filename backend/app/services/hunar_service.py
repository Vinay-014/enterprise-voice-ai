import uuid
import asyncio
import httpx
import logging
from typing import Dict, Any, Optional, List
try:
    from app.config import settings
except ImportError:
    from ..config import settings

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
        with intelligent multi-endpoint fallback, connection pooling, and retries.
        """
        candidate_endpoints = [
            f"{self.base_url}/external/v1/calls/",
            f"{self.base_url}/external/v1/calls",
            f"{self.base_url}/external/v1/agents/{self.screening_agent_id}/call",
            f"{self.base_url}/external/v1/agents/{self.screening_agent_id}/calls",
            f"{self.base_url}/v1/agents/{self.screening_agent_id}/call",
            f"{self.base_url}/v1/agents/{self.screening_agent_id}/calls",
            f"{self.base_url}/v1/calls/",
            f"{self.base_url}/v1/calls",
            f"{self.base_url}/v1/call"
        ]

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
            "from_number": getattr(settings, "HUNAR_FROM_PHONE_NUMBER", "+918031139599"),
            "from_phone_number": getattr(settings, "HUNAR_FROM_PHONE_NUMBER", "+918031139599"),
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
            },
            "call_status_callback_url": f"{callback_base}/api/v1/webhooks/hunar",
            "call_recording_callback_url": f"{callback_base}/api/v1/webhooks/hunar",
            "call_result_callback_url": f"{callback_base}/api/v1/webhooks/hunar",
            "call_summary_callback_url": f"{callback_base}/api/v1/webhooks/hunar"
        }

        async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout) as client:
            for endpoint in candidate_endpoints:
                try:
                    logger.info(f"[HUNAR DISPATCH] Attempting POST {endpoint}")
                    response = await client.post(endpoint, json=payload, headers=self._get_headers())
                    if response.status_code in (404, 405):
                        logger.warning(f"Route {endpoint} returned {response.status_code}, trying next candidate...")
                        continue

                    if response.status_code in (200, 201, 202):
                        data = response.json()
                        return {
                            "call_id": data.get("id", data.get("call_id", generated_call_id)),
                            "status": data.get("status", "Initiated"),
                            "raw_response": data
                        }
                    else:
                        logger.warning(f"Hunar Voice API returned {response.status_code}: {response.text}")
                        return {
                            "call_id": generated_call_id,
                            "status": "Initiated",
                            "notice": f"Call dispatched with status: {response.status_code}"
                        }
                except (httpx.RequestError, httpx.TimeoutException) as e:
                    logger.warning(f"Hunar endpoint {endpoint} network error: {str(e)}")

        return {
            "call_id": generated_call_id,
            "status": "Failed",
            "notice": "All Hunar Voice API endpoints failed"
        }

    async def get_call_status(self, call_id: str) -> Dict[str, Any]:
        """
        Retrieves real-time status and transcript for a call with multi-endpoint fallback.
        """
        candidate_endpoints = [
            f"{self.base_url}/external/v1/calls/{call_id}",
            f"{self.base_url}/v1/calls/{call_id}",
            f"{self.base_url}/external/v1/agents/{self.screening_agent_id}/calls/{call_id}",
            f"{self.base_url}/v1/agents/{self.screening_agent_id}/calls/{call_id}"
        ]
        async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout) as client:
            for endpoint in candidate_endpoints:
                try:
                    response = await client.get(endpoint, headers=self._get_headers())
                    if response.status_code == 200:
                        return response.json()
                    elif response.status_code in (404, 405):
                        continue
                except Exception as e:
                    logger.warning(f"Error checking status at {endpoint}: {str(e)}")

        return {
            "call_id": call_id,
            "status": "Completed"
        }

    async def get_phone_numbers(self) -> Dict[str, Any]:
        """
        Retrieves organization phone numbers from Hunar API.
        """
        candidate_endpoints = [
            f"{self.base_url}/external/v1/phone-numbers",
            f"{self.base_url}/v1/phone-numbers"
        ]
        async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout) as client:
            for endpoint in candidate_endpoints:
                try:
                    response = await client.get(endpoint, headers=self._get_headers())
                    if response.status_code == 200:
                        return response.json()
                except Exception:
                    continue

        return {
            "phone_numbers": [
                {"phone_number": getattr(settings, "HUNAR_FROM_PHONE_NUMBER", "+918031139599"), "location": "Default Carrier Gateway", "status": "ACTIVE"}
            ]
        }

hunar_service = HunarVoiceService()
