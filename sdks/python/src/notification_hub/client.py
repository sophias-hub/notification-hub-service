"""Thin HTTP client for the Notification Hub API."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class NotificationTemplate:
    id: str
    name: str
    channel: str


@dataclass
class NotificationResponse:
    status: str
    messageId: str
    processedAt: str


class NotificationHubError(RuntimeError):
    def __init__(self, message: str, status_code: int = 0) -> None:
        super().__init__(message)
        self.status_code = status_code


class NotificationClient:
    """HTTP client for the Notification Hub API.

    Example:
        client = NotificationClient("secure-token-123", "http://localhost:3000")
        templates = client.get_templates()
    """

    def __init__(self, api_key: str, base_url: str = "http://localhost:3000") -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    def get_templates(self) -> list[NotificationTemplate]:
        """Fetch all available notification templates."""
        data = self._request("GET", "/api/v1/templates")
        if not isinstance(data, list):
            raise NotificationHubError("Unexpected templates response shape")
        return [
            NotificationTemplate(
                id=item["id"],
                name=item["name"],
                channel=item["channel"],
            )
            for item in data
        ]

    def send_notification(
        self,
        recipient: str,
        channel: str,
        template_id: str,
        template_data: Optional[dict[str, Any]] = None,
    ) -> NotificationResponse:
        """Send a template-driven notification."""
        payload = {
            "recipient": recipient,
            "channel": channel,
            "templateId": template_id,
            "templateData": template_data or {},
        }
        data = self._request("POST", "/api/v1/send", payload)
        return NotificationResponse(
            status=data["status"],
            messageId=data["messageId"],
            processedAt=data["processedAt"],
        )

    def send(self, recipient: str, channel: str, raw_message: str) -> NotificationResponse:
        """Deprecated: use send_notification instead."""
        return self.send_notification(
            recipient,
            channel,
            "legacy-raw-template",
            {"body": raw_message},
        )

    def _request(
        self,
        method: str,
        path: str,
        payload: Optional[dict[str, Any]] = None,
    ) -> Any:
        url = f"{self._base_url}{path}"
        headers = {
            "X-API-Key": self._api_key,
            "Accept": "application/json",
        }
        body: Optional[bytes] = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(payload).encode("utf-8")

        request = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            message = exc.reason
            try:
                err_body = exc.read().decode("utf-8")
                parsed = json.loads(err_body)
                message = parsed.get("message", err_body or message)
            except Exception:
                pass
            action = "fetch templates" if path.endswith("/templates") else "send notification"
            raise NotificationHubError(
                f"Failed to {action}: {exc.code} - {message}",
                status_code=exc.code,
            ) from exc
        except urllib.error.URLError as exc:
            raise NotificationHubError(f"HTTP request failed: {exc.reason}") from exc
