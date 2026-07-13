"""Thin HTTP client for the Notification Hub API."""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class NotificationTemplate:
    id: str
    name: str
    channel: str
    subject: Optional[str] = None
    body: Optional[str] = None


@dataclass
class NotificationResponse:
    status: str
    recordId: str
    processedAt: str


@dataclass
class DeliveryRecord:
    recordId: str
    recipient: str
    channel: str
    templateId: str
    status: str
    processedAt: str
    templateData: Optional[dict[str, Any]] = None


@dataclass
class Preferences:
    recipient: str
    email: bool
    sms: bool
    push: bool


@dataclass
class Webhook:
    id: str
    url: str
    events: list[str]
    createdAt: str


@dataclass
class WebhookDelivery:
    id: str
    webhookId: str
    recordId: str
    status: str
    attemptedAt: str


class NotificationHubError(RuntimeError):
    def __init__(self, message: str, status_code: int = 0, code: str = "") -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code


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
        return [self._template(item) for item in data]

    def get_template(self, template_id: str) -> NotificationTemplate:
        """Retrieve one template by id."""
        data = self._request("GET", f"/api/v1/templates/{urllib.parse.quote(template_id, safe='')}")
        return self._template(data)

    def create_template(
        self,
        template_id: str,
        name: str,
        channel: str,
        subject: Optional[str] = None,
        body: Optional[str] = None,
    ) -> NotificationTemplate:
        """Create a notification template."""
        payload: dict[str, Any] = {"id": template_id, "name": name, "channel": channel}
        if subject is not None:
            payload["subject"] = subject
        if body is not None:
            payload["body"] = body
        return self._template(self._request("POST", "/api/v1/templates", payload))

    def update_template(
        self,
        template_id: str,
        name: str,
        channel: str,
        subject: Optional[str] = None,
        body: Optional[str] = None,
    ) -> NotificationTemplate:
        """Replace a template."""
        payload: dict[str, Any] = {"name": name, "channel": channel}
        if subject is not None:
            payload["subject"] = subject
        if body is not None:
            payload["body"] = body
        return self._template(
            self._request("PUT", f"/api/v1/templates/{urllib.parse.quote(template_id, safe='')}", payload)
        )

    def patch_template(self, template_id: str, **fields: Any) -> NotificationTemplate:
        """Partially update a template."""
        return self._template(
            self._request(
                "PATCH",
                f"/api/v1/templates/{urllib.parse.quote(template_id, safe='')}",
                fields,
            )
        )

    def delete_template(self, template_id: str) -> None:
        """Delete a template."""
        self._request("DELETE", f"/api/v1/templates/{urllib.parse.quote(template_id, safe='')}")

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
            recordId=data["recordId"],
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

    def get_record(self, record_id: str) -> DeliveryRecord:
        """Retrieve a delivery record by id."""
        data = self._request("GET", f"/api/v1/records/{urllib.parse.quote(record_id, safe='')}")
        return self._record(data)

    def list_records(
        self,
        recipient: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[DeliveryRecord]:
        """List delivery records with optional filters."""
        params: dict[str, str] = {}
        if recipient:
            params["recipient"] = recipient
        if status:
            params["status"] = status
        qs = f"?{urllib.parse.urlencode(params)}" if params else ""
        data = self._request("GET", f"/api/v1/records{qs}")
        return [self._record(item) for item in data]

    def delete_record(self, record_id: str) -> None:
        """Delete a delivery record."""
        self._request("DELETE", f"/api/v1/records/{urllib.parse.quote(record_id, safe='')}")

    def get_preferences(self, recipient: str) -> Preferences:
        """Get channel preferences for a recipient."""
        data = self._request(
            "GET", f"/api/v1/preferences/{urllib.parse.quote(recipient, safe='')}"
        )
        return self._prefs(data)

    def set_preferences(
        self,
        recipient: str,
        email: bool,
        sms: bool,
        push: bool,
    ) -> Preferences:
        """Replace channel preferences."""
        data = self._request(
            "PUT",
            f"/api/v1/preferences/{urllib.parse.quote(recipient, safe='')}",
            {"email": email, "sms": sms, "push": push},
        )
        return self._prefs(data)

    def patch_preferences(self, recipient: str, **fields: bool) -> Preferences:
        """Partially update preferences."""
        data = self._request(
            "PATCH",
            f"/api/v1/preferences/{urllib.parse.quote(recipient, safe='')}",
            fields,
        )
        return self._prefs(data)

    def reset_preferences(self, recipient: str) -> Preferences:
        """Reset preferences to defaults."""
        data = self._request(
            "DELETE", f"/api/v1/preferences/{urllib.parse.quote(recipient, safe='')}"
        )
        return self._prefs(data)

    def unsubscribe(self, recipient: str, channel: str) -> Preferences:
        """Opt out of a single channel."""
        data = self._request(
            "POST", "/api/v1/unsubscribe", {"recipient": recipient, "channel": channel}
        )
        return self._prefs(data)

    def create_webhook(self, url: str, events: Optional[list[str]] = None) -> Webhook:
        """Register a webhook."""
        payload: dict[str, Any] = {"url": url}
        if events is not None:
            payload["events"] = events
        data = self._request("POST", "/api/v1/webhooks", payload)
        return self._webhook(data)

    def list_webhooks(self) -> list[Webhook]:
        """List registered webhooks."""
        data = self._request("GET", "/api/v1/webhooks")
        return [self._webhook(item) for item in data]

    def get_webhook(self, webhook_id: str) -> Webhook:
        """Retrieve a webhook by id."""
        data = self._request("GET", f"/api/v1/webhooks/{urllib.parse.quote(webhook_id, safe='')}")
        return self._webhook(data)

    def delete_webhook(self, webhook_id: str) -> None:
        """Delete a webhook."""
        self._request("DELETE", f"/api/v1/webhooks/{urllib.parse.quote(webhook_id, safe='')}")

    def list_webhook_deliveries(self) -> list[WebhookDelivery]:
        """List fake webhook delivery attempts."""
        data = self._request("GET", "/api/v1/webhooks/deliveries")
        return [
            WebhookDelivery(
                id=item["id"],
                webhookId=item["webhookId"],
                recordId=item["recordId"],
                status=item["status"],
                attemptedAt=item["attemptedAt"],
            )
            for item in data
        ]

    def _template(self, item: dict[str, Any]) -> NotificationTemplate:
        return NotificationTemplate(
            id=item["id"],
            name=item["name"],
            channel=item["channel"],
            subject=item.get("subject"),
            body=item.get("body"),
        )

    def _record(self, item: dict[str, Any]) -> DeliveryRecord:
        return DeliveryRecord(
            recordId=item["recordId"],
            recipient=item["recipient"],
            channel=item["channel"],
            templateId=item["templateId"],
            status=item["status"],
            processedAt=item["processedAt"],
            templateData=item.get("templateData"),
        )

    def _prefs(self, item: dict[str, Any]) -> Preferences:
        return Preferences(
            recipient=item["recipient"],
            email=item["email"],
            sms=item["sms"],
            push=item["push"],
        )

    def _webhook(self, item: dict[str, Any]) -> Webhook:
        return Webhook(
            id=item["id"],
            url=item["url"],
            events=list(item.get("events") or []),
            createdAt=item["createdAt"],
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
            code = ""
            try:
                err_body = exc.read().decode("utf-8")
                parsed = json.loads(err_body)
                message = parsed.get("message", err_body or message)
                code = parsed.get("code", "")
            except Exception:
                pass
            raise NotificationHubError(
                f"Request failed ({method} {path}): {exc.code} - {message}",
                status_code=exc.code,
                code=code,
            ) from exc
        except urllib.error.URLError as exc:
            raise NotificationHubError(f"HTTP request failed: {exc.reason}") from exc
