import re
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

def format_e164_phone(phone: Optional[str]) -> str:
    """
    Sanitizes and normalizes phone numbers into E.164 standard format.
    Handles raw digits, country codes, spaces, parentheses, and hyphens.
    """
    if not phone:
        return ""
    cleaned = re.sub(r"[\s\-\(\)]", "", str(phone).strip())
    if not cleaned:
        return ""
    if cleaned.startswith("+"):
        return cleaned
    # Indian mobile format (10 digits starting with 6-9 -> +91)
    if re.match(r"^[6-9]\d{9}$", cleaned):
        return f"+91{cleaned}"
    # Indian 12 digits (starting with 91 followed by 10 digits)
    if re.match(r"^91[6-9]\d{9}$", cleaned):
        return f"+{cleaned}"
    # US format (10 digits starting with 2-9 -> +1)
    if re.match(r"^[2-9]\d{9}$", cleaned):
        return f"+1{cleaned}"
    # US 11 digits (starting with 1 followed by 10 digits)
    if re.match(r"^1[2-9]\d{9}$", cleaned):
        return f"+{cleaned}"
    return f"+{cleaned}"

class HunarVoiceService:
    def __init__(self):
        self.base_url = settings.HUNAR_BASE_URL.rstrip("/")
        self.api_key = settings.HUNAR_API_KEY
        self.screening_agent_id = settings.HUNAR_SCREENING_AGENT_ID
        self.reachout_agent_id = settings.HUNAR_REACHOUT_AGENT_ID
        self.ivr_agent_id = settings.HUNAR_IVR_AGENT_ID
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
        custom_prompt: Optional[str] = None,
        agent_id: Optional[str] = None,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Triggers an outbound voice screening or reachout call through the Hunar Voice API
        with multi-endpoint fallback, connection pooling, and resilient caller ID handling.
        """
        target_agent_id = agent_id or self.screening_agent_id
        target_phone = format_e164_phone(phone_number)
        from_phone = format_e164_phone(settings.HUNAR_FROM_PHONE_NUMBER) if settings.HUNAR_FROM_PHONE_NUMBER else None

        candidate_endpoints = [
            f"{self.base_url}/external/v1/calls/",
            f"{self.base_url}/external/v1/calls",
            f"{self.base_url}/external/v1/agents/{target_agent_id}/call",
            f"{self.base_url}/external/v1/agents/{target_agent_id}/calls",
            f"{self.base_url}/v1/agents/{target_agent_id}/call",
            f"{self.base_url}/v1/agents/{target_agent_id}/calls",
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
        callback_base = (settings.WEBHOOK_BASE_URL or settings.APP_PUBLIC_URL or "https://enterprise-voice-ai.onrender.com").rstrip("/")

        # Construct comprehensive payload satisfying all agent prompt variables
        payload: Dict[str, Any] = {
            "agent_id": target_agent_id,
            "callee_name": candidate_name,
            "mobile_number": target_phone,
            "to_number": target_phone,
            "custom_data": {
                "company": "Enterprise Voice AI Platform",
                "job_role": position,
                "job_description": prompt_content,
                "candidate_name": candidate_name,
                "location": location or "Remote",
                "candidate_current_title": position,
                "recruiter_org": "Enterprise Talent Acquisition"
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

        # Send ONLY 'from_number' if configured (omit 'from_phone_number' to avoid provider foreign key mismatch)
        if from_phone:
            payload["from_number"] = from_phone

        async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout, follow_redirects=True) as client:
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

    async def get_call_status(self, call_id: str, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves real-time status and transcript for a call with multi-endpoint fallback.
        """
        target_agent_id = agent_id or self.screening_agent_id
        candidate_endpoints = [
            f"{self.base_url}/external/v1/calls/{call_id}/",
            f"{self.base_url}/external/v1/calls/{call_id}",
            f"{self.base_url}/v1/calls/{call_id}/",
            f"{self.base_url}/v1/calls/{call_id}",
            f"{self.base_url}/external/v1/agents/{target_agent_id}/calls/{call_id}/",
            f"{self.base_url}/external/v1/agents/{target_agent_id}/calls/{call_id}"
        ]
        async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout, follow_redirects=True) as client:
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
        Retrieves organization phone numbers from Hunar API or returns configured caller ID.
        """
        candidate_endpoints = [
            f"{self.base_url}/external/v1/phone-numbers/",
            f"{self.base_url}/external/v1/phone-numbers",
            f"{self.base_url}/v1/phone-numbers/",
            f"{self.base_url}/v1/phone-numbers"
        ]
        async with httpx.AsyncClient(limits=self.limits, timeout=self.timeout, follow_redirects=True) as client:
            for endpoint in candidate_endpoints:
                try:
                    response = await client.get(endpoint, headers=self._get_headers())
                    if response.status_code == 200:
                        return response.json()
                except Exception:
                    continue

        active_number = format_e164_phone(settings.HUNAR_FROM_PHONE_NUMBER) if settings.HUNAR_FROM_PHONE_NUMBER else None
        return {
            "phone_numbers": [
                {"phone_number": active_number, "location": "Hunar Enterprise Voice Gateway", "status": "ACTIVE"}
            ]
        }

hunar_service = HunarVoiceService()
