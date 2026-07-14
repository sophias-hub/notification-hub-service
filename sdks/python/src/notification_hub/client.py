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
    """A reusable message definition stored in the template catalog.

    **NOTE**: Templates live only in memory for this mock service, so they disappear when the process restarts.

    Attributes:
        id: Identifies the template in other API calls.

            **NOTE**: Use lowercase letters, digits, and hyphens only (for example, ``welcome-email``).
        name: Names the template for UIs and operator tools.
        channel: Defines which delivery channel this template is written for (``email``, ``sms``, or ``push``).
        subject: Sets the subject line when the channel is ``email``.

            **NOTE**: Other channels typically leave this empty.
        body: Defines the message content that will be sent.

            **NOTE**: Placeholders such as ``{{name}}`` are filled from ``templateData`` when you call `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)`.
    """

    id: str
    name: str
    channel: str
    subject: Optional[str] = None
    body: Optional[str] = None


@dataclass
class NotificationResponse:
    """Confirmation returned when a send is accepted.

    Attributes:
        status: Reports that the send was accepted. On HTTP ``200`` this value is ``success``.
        recordId: Identifies the delivery record created for this send (for example, ``rec-abc123xyz``).

            **NOTE**: Use this value with `[`GET /api/v1/records/{recordId}`](https://sophias-hub.github.io/docs-api/#/Records/GetRecord)` to look up status later.
        processedAt: Reports when the service accepted the send, as an ISO-8601 timestamp in UTC.
    """

    status: str
    recordId: str
    processedAt: str


@dataclass
class DeliveryRecord:
    """A stored receipt for one send attempt.

    **NOTE**: You can look records up after calling `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)` to see who was contacted and whether delivery finished.

    Attributes:
        recordId: Identifies this delivery record.

            **NOTE**: This value originally came from `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)`.
        recipient: Identifies the address, phone number, or token that was targeted.
        channel: Reports which channel was used for this send (``email``, ``sms``, or ``push``).
        templateId: Identifies the template that was rendered for this send.
        status: Reports the current delivery state (``queued``, ``delivered``, or ``failed``).
        processedAt: Reports when the send was accepted, as an ISO-8601 timestamp in UTC.
        templateData: Contains the placeholder values that were supplied with the original send, if any.
    """

    recordId: str
    recipient: str
    channel: str
    templateId: str
    status: str
    processedAt: str
    templateData: Optional[dict[str, Any]] = None


@dataclass
class Preferences:
    """Which channels a recipient is willing to receive.

    If you have never set preferences for someone, every channel is treated as allowed (``True``).

    Attributes:
        recipient: Identifies the recipient these preferences belong to.
        email: Sets whether email is allowed.

            **NOTE**: When ``False``, `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)` rejects email with ``CHANNEL_OPTED_OUT``.
        sms: Sets whether SMS is allowed.

            **NOTE**: When ``False``, `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)` rejects SMS with ``CHANNEL_OPTED_OUT``.
        push: Sets whether push is allowed.

            **NOTE**: When ``False``, `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)` rejects push with ``CHANNEL_OPTED_OUT``.
    """

    recipient: str
    email: bool
    sms: bool
    push: bool


@dataclass
class Webhook:
    """A registered webhook endpoint.

    This mock service stores the registration and invents delivery attempts; it does not make real outbound HTTP calls.

    Attributes:
        id: Identifies this webhook (for example, ``wh-abc123``).
        url: Specifies the callback address your system would listen on.

            **NOTE**: It must be an ``http://`` or ``https://`` URL.
        events: Lists the event names this webhook is interested in.

            **NOTE**: If you omit ``events`` when creating a webhook with `[`POST /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/CreateWebhook)`, the service defaults to ``["record.delivered"]``.
        createdAt: Reports when the webhook was registered, as an ISO-8601 timestamp in UTC.
    """

    id: str
    url: str
    events: list[str]
    createdAt: str


@dataclass
class WebhookDelivery:
    """A simulated attempt to notify a webhook after a send.

    These rows exist so you can practice reading delivery history; no real HTTP request is made.

    Attributes:
        id: Identifies this delivery attempt.
        webhookId: Identifies the webhook that this attempt belongs to.
        recordId: Identifies the send record that triggered the attempt.
        status: Reports whether the simulated attempt is treated as ``delivered`` or ``failed``.
        attemptedAt: Reports when the attempt was recorded, as an ISO-8601 timestamp in UTC.
    """

    id: str
    webhookId: str
    recordId: str
    status: str
    attemptedAt: str


class NotificationHubError(RuntimeError):
    """Raised when the API returns a non-success status or the HTTP request fails.

    The message often includes the stable API code, such as ``TEMPLATE_NOT_FOUND``.

    Attributes:
        status_code: Reports the HTTP status from the API, or ``0`` when no response was received.
        code: Identifies the failure with a stable machine-readable code when the body includes one
            (for example, ``TEMPLATE_NOT_FOUND``).
    """

    def __init__(self, message: str, status_code: int = 0, code: str = "") -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class NotificationClient:
    """HTTP client for the Notification Hub API.

    Every call sends your key in the ``X-API-Key`` header. The demo key is ``secure-token-123``.

    Example:
        client = NotificationClient("secure-token-123", "http://localhost:3000")
    """

    def __init__(self, api_key: str, base_url: str = "http://localhost:3000") -> None:
        """Create a client pointed at a Notification Hub base URL.

        Args:
            api_key: Specifies the secret placed in the ``X-API-Key`` header on every request.
            base_url: Sets the service origin. A trailing slash is optional and will be stripped.

        **NOTE**: Defaults to ``http://localhost:3000``.
        """
        if not api_key:
            raise ValueError("api_key is required")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    def get_templates(self) -> list[NotificationTemplate]:
        """Return every template currently in the catalog, including seeded examples and any templates created at runtime.

        **NOTE**: Calls `[`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates)`.

        Raises:
            NotificationHubError: With code ``UNAUTHORIZED`` when the ``X-API-Key`` header is missing or invalid.
                Send header ``X-API-Key`` with a valid key and retry.
        """
        data = self._request("GET", "/api/v1/templates")
        return [self._template(item) for item in data]

    def get_template(self, template_id: str) -> NotificationTemplate:
        """Look up a single template by its ``id`` and return the full template definition.

        Args:
            template_id: Selects which template to retrieve (for example, ``welcome-email``).

        **NOTE**: Calls `[`GET /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplate)`.

        Raises:
            NotificationHubError: With code ``TEMPLATE_NOT_FOUND`` when no template matched this ``id``.
                List templates with `[`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates)`, confirm the spelling, or create the template
                before retrying.
        """
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
        """Add a new template to the catalog and return the created object.

        **NOTE**: Calls `[`POST /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/CreateTemplate)` (``201``). The call fails if the ``id`` is already taken,
        the channel is unsupported, or the ``id`` or ``name`` is invalid.

        Raises:
            NotificationHubError: The ``code`` attribute may be one of:

                * ``UNAUTHORIZED`` — send header ``X-API-Key`` with a valid key and retry.
                * ``MISSING_FIELDS`` — include ``id``, ``name``, and ``channel``, then retry.
                * ``TEMPLATE_ID_EXISTS`` — choose a new ``id``, or update the existing template with
                  ``PUT`` / ``PATCH`` instead of creating.
                * ``INVALID_CHANNEL`` — use only ``email``, ``sms``, or ``push``, then retry.
                * ``INVALID_TEMPLATE_BODY`` — use a non-empty ``name`` and an ``id`` of lowercase letters,
                  digits, and hyphens only, then retry.
        """
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
        """Replace the ``name``, ``channel``, and optional content of an existing template.

        Args:
            template_id: Selects which existing template to replace.

        **NOTE**: Calls `[`PUT /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/UpdateTemplate)`.

        Raises:
            NotificationHubError: The ``code`` attribute may be one of:

                * ``TEMPLATE_NOT_FOUND`` — list templates with `[`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates)` and confirm the id
                  before retrying.
                * ``MISSING_FIELDS`` — include ``name`` and ``channel`` in the body, then retry.
                * ``INVALID_CHANNEL`` — use only ``email``, ``sms``, or ``push``, then retry.
        """
        payload: dict[str, Any] = {"name": name, "channel": channel}
        if subject is not None:
            payload["subject"] = subject
        if body is not None:
            payload["body"] = body
        return self._template(
            self._request("PUT", f"/api/v1/templates/{urllib.parse.quote(template_id, safe='')}", payload)
        )

    def patch_template(self, template_id: str, **fields: Any) -> NotificationTemplate:
        """Update only the template fields included in the request body and leave everything else unchanged.

        Args:
            template_id: Selects which existing template to change.

        **NOTE**: Calls `[`PATCH /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/PatchTemplate)`.

        Raises:
            NotificationHubError: The ``code`` attribute may be one of:

                * ``TEMPLATE_NOT_FOUND`` — list templates with `[`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates)` and confirm the id
                  before retrying.
                * ``INVALID_TEMPLATE_BODY`` — correct the field shown in ``details`` (for example an empty
                  ``name`` or unsupported ``channel``) and retry.
        """
        return self._template(
            self._request(
                "PATCH",
                f"/api/v1/templates/{urllib.parse.quote(template_id, safe='')}",
                fields,
            )
        )

    def delete_template(self, template_id: str) -> None:
        """Delete a template from the catalog.

        Args:
            template_id: Selects which template to remove.

        **NOTE**: Calls `[`DELETE /api/v1/templates/{id}`](https://sophias-hub.github.io/docs-api/#/Templates/DeleteTemplate)` (``204``).

        Raises:
            NotificationHubError: The ``code`` attribute may be one of:

                * ``TEMPLATE_NOT_FOUND`` — it may already be deleted; list templates to confirm.
                * ``TEMPLATE_IN_USE`` — delivery records still reference this template; delete or wait out
                  those records under `[`GET /api/v1/records`](https://sophias-hub.github.io/docs-api/#/Records/ListRecords)`, then retry the template delete.
        """
        self._request("DELETE", f"/api/v1/templates/{urllib.parse.quote(template_id, safe='')}")

    def send_notification(
        self,
        recipient: str,
        channel: str,
        template_id: str,
        template_data: Optional[dict[str, Any]] = None,
    ) -> NotificationResponse:
        """Accept a notification send, create a delivery record, and return the new ``recordId``.

        Args:
            recipient: Specifies who should receive the notification.
            channel: Defines which channel to deliver on (``email``, ``sms``, or ``push``).
            template_id: Selects which catalog template to render and send.
            template_data: Supplies key/value pairs that fill ``{{placeholders}}`` in the template ``subject``
                and ``body``.

        **NOTE**: Calls `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)`. Before accepting the request, the service checks preferences,
        that the template exists, that the channel is valid, and that you are within the send rate limit.

        Raises:
            NotificationHubError: The ``code`` attribute may be one of:

                * ``MISSING_FIELDS`` — include ``recipient``, ``channel``, and ``templateId``, then retry.
                * ``CHANNEL_OPTED_OUT`` — check preferences with `[`GET /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/GetPreferences)`,
                  allow the channel with ``PUT``/``PATCH``, or choose a different channel.
                * ``TEMPLATE_NOT_FOUND`` — list templates with `[`GET /api/v1/templates`](https://sophias-hub.github.io/docs-api/#/Templates/GetTemplates)` or create the template
                  before sending.
                * ``INVALID_CHANNEL`` — use only ``email``, ``sms``, or ``push``, then retry.
                * ``RATE_LIMITED`` — wait for the seconds in ``details.retryAfterSeconds`` (and honor
                  ``Retry-After``), then retry.
        """
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
        """Deprecated. Prefer :meth:`send_notification`.

        Sends through the legacy path by using template id ``legacy-raw-template``
        and ``{"body": raw_message}``.
        """
        return self.send_notification(
            recipient,
            channel,
            "legacy-raw-template",
            {"body": raw_message},
        )

    def get_record(self, record_id: str) -> DeliveryRecord:
        """Return one delivery record so you can inspect status and related send details.

        Args:
            record_id: Selects which record to retrieve (the id returned by `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)`, for example
                ``rec-abc123xyz``).

        **NOTE**: Calls `[`GET /api/v1/records/{recordId}`](https://sophias-hub.github.io/docs-api/#/Records/GetRecord)`.

        Raises:
            NotificationHubError: With code ``RECORD_NOT_FOUND`` when no delivery record matched this ``recordId``.
                Confirm the id from the send response, or list records with `[`GET /api/v1/records`](https://sophias-hub.github.io/docs-api/#/Records/ListRecords)`.
        """
        data = self._request("GET", f"/api/v1/records/{urllib.parse.quote(record_id, safe='')}")
        return self._record(data)

    def list_records(
        self,
        recipient: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[DeliveryRecord]:
        """List delivery records that were created by earlier `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)` calls.

        Args:
            recipient: Limits results to this exact recipient when provided.
            status: Limits results to this lifecycle state when provided (``queued``, ``delivered``, or ``failed``).

        **NOTE**: Calls `[`GET /api/v1/records`](https://sophias-hub.github.io/docs-api/#/Records/ListRecords)`. You can narrow the list by ``recipient``, by ``status``, or by both.
        """
        params: dict[str, str] = {}
        if recipient:
            params["recipient"] = recipient
        if status:
            params["status"] = status
        qs = f"?{urllib.parse.urlencode(params)}" if params else ""
        data = self._request("GET", f"/api/v1/records{qs}")
        return [self._record(item) for item in data]

    def delete_record(self, record_id: str) -> None:
        """Remove a delivery record from the in-memory store.

        Args:
            record_id: Selects which record to delete.

        **NOTE**: Calls `[`DELETE /api/v1/records/{recordId}`](https://sophias-hub.github.io/docs-api/#/Records/DeleteRecord)` (``204``).

        Raises:
            NotificationHubError: With code ``RECORD_NOT_FOUND`` when no delivery record matched this ``recordId``.
                It may already be deleted; list records to confirm.
        """
        self._request("DELETE", f"/api/v1/records/{urllib.parse.quote(record_id, safe='')}")

    def get_preferences(self, recipient: str) -> Preferences:
        """Return the channel preferences for a recipient.

        Args:
            recipient: Selects whose preferences to read. URL-encode special characters if needed.

        **NOTE**: Calls `[`GET /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/GetPreferences)`. If you have never saved preferences for them,
        every channel defaults to allowed (``True``).
        """
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
        """Replace all three channel preference flags for the recipient with the values in the request body.

        Args:
            recipient: Selects whose preferences to overwrite.

        **NOTE**: Calls `[`PUT /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/SetPreferences)`.

        Raises:
            NotificationHubError: With code ``MISSING_FIELDS`` when required preference flags were omitted.
                Include boolean ``email``, ``sms``, and ``push``, then retry.
        """
        data = self._request(
            "PUT",
            f"/api/v1/preferences/{urllib.parse.quote(recipient, safe='')}",
            {"email": email, "sms": sms, "push": push},
        )
        return self._prefs(data)

    def patch_preferences(self, recipient: str, **fields: bool) -> Preferences:
        """Change only the preference flags included in the request body and leave the others unchanged.

        Args:
            recipient: Selects whose preferences to adjust.

        **NOTE**: Calls `[`PATCH /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/PatchPreferences)`.

        Raises:
            NotificationHubError: With code ``INVALID_TEMPLATE_BODY`` when a preference value was not a boolean.
                Send only ``True`` or ``False`` for ``email``, ``sms``, and/or ``push``, then retry.
        """
        data = self._request(
            "PATCH",
            f"/api/v1/preferences/{urllib.parse.quote(recipient, safe='')}",
            fields,
        )
        return self._prefs(data)

    def reset_preferences(self, recipient: str) -> Preferences:
        """Clear any stored preferences for the recipient so the defaults apply again (all channels allowed).

        Args:
            recipient: Selects whose stored preferences should be removed.

        **NOTE**: Calls `[`DELETE /api/v1/preferences/{recipient}`](https://sophias-hub.github.io/docs-api/#/Preferences/ResetPreferences)`.
        """
        data = self._request(
            "DELETE", f"/api/v1/preferences/{urllib.parse.quote(recipient, safe='')}"
        )
        return self._prefs(data)

    def unsubscribe(self, recipient: str, channel: str) -> Preferences:
        """Turn off one channel for a recipient by setting that channel's preference to ``False``.

        **NOTE**: Calls `[`POST /api/v1/unsubscribe`](https://sophias-hub.github.io/docs-api/#/Preferences/Unsubscribe)`.

        Raises:
            NotificationHubError: The ``code`` attribute may be one of:

                * ``MISSING_FIELDS`` — include ``recipient`` and ``channel``, then retry.
                * ``INVALID_CHANNEL`` — use only ``email``, ``sms``, or ``push``, then retry.
        """
        data = self._request(
            "POST", "/api/v1/unsubscribe", {"recipient": recipient, "channel": channel}
        )
        return self._prefs(data)

    def create_webhook(self, url: str, events: Optional[list[str]] = None) -> Webhook:
        """Register a webhook URL so the mock can associate later `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)` calls with that endpoint.

        Args:
            url: Specifies the callback URL to register. It must start with ``http://`` or ``https://``.
            events: Selects which event names to subscribe to. When omitted, the service uses ``["record.delivered"]``.

        **NOTE**: Calls `[`POST /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/CreateWebhook)` (``201``). The service records fake delivery attempts for practice;
        it does not call the URL.

        Raises:
            NotificationHubError: The ``code`` attribute may be one of:

                * ``MISSING_FIELDS`` — provide an ``http://`` or ``https://`` callback URL, then retry.
                * ``INVALID_TEMPLATE_BODY`` — correct ``url`` to a valid ``http://`` or ``https://`` address
                  and retry.
        """
        payload: dict[str, Any] = {"url": url}
        if events is not None:
            payload["events"] = events
        data = self._request("POST", "/api/v1/webhooks", payload)
        return self._webhook(data)

    def list_webhooks(self) -> list[Webhook]:
        """Return every webhook that is currently registered in the in-memory store.

        **NOTE**: Calls `[`GET /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhooks)`.
        """
        data = self._request("GET", "/api/v1/webhooks")
        return [self._webhook(item) for item in data]

    def get_webhook(self, webhook_id: str) -> Webhook:
        """Look up one registered webhook by its ``id``.

        Args:
            webhook_id: Selects which webhook to retrieve (for example, ``wh-abc123``).

        **NOTE**: Calls `[`GET /api/v1/webhooks/{id}`](https://sophias-hub.github.io/docs-api/#/Webhooks/GetWebhook)`.

        Raises:
            NotificationHubError: With code ``WEBHOOK_NOT_FOUND`` when no webhook matched this ``id``.
                List webhooks with `[`GET /api/v1/webhooks`](https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhooks)`, or create one before looking it up.
        """
        data = self._request("GET", f"/api/v1/webhooks/{urllib.parse.quote(webhook_id, safe='')}")
        return self._webhook(data)

    def delete_webhook(self, webhook_id: str) -> None:
        """Remove a webhook registration from the in-memory store.

        Args:
            webhook_id: Selects which webhook to delete.

        **NOTE**: Calls `[`DELETE /api/v1/webhooks/{id}`](https://sophias-hub.github.io/docs-api/#/Webhooks/DeleteWebhook)` (``204``).

        Raises:
            NotificationHubError: With code ``WEBHOOK_NOT_FOUND`` when no webhook matched this ``id``.
                It may already be deleted; list webhooks to confirm.
        """
        self._request("DELETE", f"/api/v1/webhooks/{urllib.parse.quote(webhook_id, safe='')}")

    def list_webhook_deliveries(self) -> list[WebhookDelivery]:
        """Return the simulated webhook delivery attempts that were recorded after recent `[`POST /api/v1/send`](https://sophias-hub.github.io/docs-api/#/Send/SendNotification)` calls.

        **NOTE**: Calls `[`GET /api/v1/webhooks/deliveries`](https://sophias-hub.github.io/docs-api/#/Webhooks/ListWebhookDeliveries)`.
        """
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
