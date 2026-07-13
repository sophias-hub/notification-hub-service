#!/usr/bin/env python3
"""Smoke example covering the learning-path flow."""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from notification_hub import NotificationClient, NotificationHubError


def main() -> int:
    api_key = sys.argv[1] if len(sys.argv) > 1 else "secure-token-123"
    base_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"

    print("Initializing Notification SDK client...")
    client = NotificationClient(api_key, base_url)
    template_id = f"sdk-demo-{int(time.time())}"

    try:
        print("\n--- Create template ---")
        created = client.create_template(template_id, "SDK Demo", "email", body="Hello {{name}}")
        print(f"Created: {created.id}")

        print("\n--- Retrieve template ---")
        retrieved = client.get_template(created.id)
        print(f"Retrieved: {retrieved.name}")

        print("\n--- Set preference ---")
        prefs = client.set_preferences("sdk@example.com", email=True, sms=False, push=False)
        print(f"Preferences: {prefs}")

        print("\n--- Send notification ---")
        response = client.send_notification(
            "sdk@example.com",
            "email",
            created.id,
            {"name": "Alexander"},
        )
        print(f"Sent: {response}")

        print("\n--- Check record status ---")
        record = client.get_record(response.recordId)
        print(f"Status: {record.status}")

        print("\nAll SDK integration tests completed successfully!")
        return 0
    except NotificationHubError as exc:
        print("\nAn error occurred during SDK execution test:", file=sys.stderr)
        print(exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
