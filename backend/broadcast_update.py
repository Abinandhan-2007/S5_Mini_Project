#!/usr/bin/env python3
"""
CarePulse App Version Update Push Notification Broadcaster.
Broadcasts a high-priority FCM notification to all active devices when an app update is released.
Can be run standalone or invoked automatically by deploy_update.py.
"""

import os
import sys
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass
import json
import argparse
from pathlib import Path

# Ensure backend directory is in python path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from notifications.fcm_service import broadcast_app_update_notification

def main():
    parser = argparse.ArgumentParser(description="Broadcast CarePulse app version update push notification to all devices")
    parser.add_argument("--version", type=str, help="Version string (e.g. 1.9.6)")
    parser.add_argument("--message", type=str, help="Custom push notification message body")
    parser.add_argument("--notes", type=str, help="Release notes")
    parser.add_argument("--url", type=str, help="Download URL")
    args = parser.parse_args()

    version = args.version
    release_notes = args.notes
    message = args.message
    download_url = args.url

    # If version not supplied, read from app_version.json
    version_file = BACKEND_DIR / "app_version.json"
    if not version and version_file.exists():
        try:
            with open(version_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                version = data.get("version", "1.0.0")
                if not release_notes:
                    release_notes = data.get("release_notes", "")
        except Exception as e:
            print(f"⚠️ Error reading app_version.json: {e}")

    if not version:
        version = "1.0.0"

    print("=" * 60)
    print(f"📢 CarePulse Push Notification Broadcast: App Version Update v{version}")
    if message:
        print(f"   Custom Message: {message}")
    print("=" * 60)

    result = broadcast_app_update_notification(
        version=version,
        release_notes=release_notes,
        custom_message=message,
        download_url=download_url
    )

    print("\n✅ Broadcast Complete:")
    print(f"   Version:        {result.get('version')}")
    print(f"   Title:          {result.get('title')}")
    print(f"   Body:           {result.get('body')}")
    print(f"   Sent Devices:   {result.get('sent')}")
    print(f"   Failed Devices: {result.get('failed')}")
    print(f"   Total Devices:  {result.get('total_devices')}")

if __name__ == "__main__":
    main()
