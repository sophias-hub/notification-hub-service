#!/usr/bin/env python3
"""Smoke example against a local or remote Notification Hub API."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from notification_hub import NotificationClient, NotificationHubError


def main() -> int:
    api_key = sys.argv[1] if len(sys.argv) > 1 else "secure-token-123"
    base_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"

    print("Initializing Notification SDK client...")
    client = NotificationClient(api_key, base_url)

    try:
        print("\n--- Test 1: Requesting Available Templates ---")
        templates = client.get_templates()
        print("Templates successfully received from API:")
        for template in templates:
            print(f"  {template}")

        print("\n--- Test 2: Dispatching Notification via SDK ---")
        response = client.send_notification(
            "alex@example.com",
            "email",
            "welcome-email",
            {"name": "Alexander"},
        )
        print("API successfully processed SDK request:")
        print(f"  {response}")
        print("\nAll SDK integration tests completed successfully!")
        return 0
    except NotificationHubError as exc:
        print("\nAn error occurred during SDK execution test:", file=sys.stderr)
        print(exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
