"""
Inspection and Safe Initialization Script for CoastGuard AI Database
Safely inspects or populates synthetic demonstration coastal incidents.
Strictly preserves user-created reports and application records.

Usage:
    python database/seed_data.py --inspect       # Read-only state inspection
    python database/seed_data.py                 # Safe populate if empty (non-destructive)
"""

import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from database.database import inspect_database_status, seed_database_safely


def main():
    args = sys.argv[1:]

    # Inspect mode
    if "--inspect" in args or "-i" in args:
        print("\n=======================================================")
        print(" COASTGUARD AI DATABASE INSPECTION REPORT (READ-ONLY) ")
        print("=======================================================")
        status = inspect_database_status()
        print(f"Database File:           {status['db_file']}")
        print(f"Total Incidents:         {status['total_incidents']}")
        print(f"  ├─ Demonstration Data: {status['demonstration_incidents']}")
        print(f"  └─ User-Created Data:  {status['user_created_incidents']}")
        print(f"Active Clusters:         {status['total_clusters']}")
        print(f"Alerts / Notifications:  {status['total_alerts']}")
        print(f"Audit Logs:              {status['total_audit_logs']}")
        print(f"Status:                  {'EMPTY - Ready for safe initialization' if status['is_empty'] else 'POPULATED'}")
        print("=======================================================\n")
        return

    # Check state before running any operation
    status_before = inspect_database_status()
    print("\n[+] Current Database State:")
    print(f"    Total Incidents:         {status_before['total_incidents']}")
    print(f"    User-Created Incidents:  {status_before['user_created_incidents']}")
    print(f"    Demonstration Incidents: {status_before['demonstration_incidents']}")

    if not status_before['is_empty']:
        print("\n[!] Database already contains records.")
        print("[!] In accordance with data safety policies, existing records are PRESERVED.")
        print("[!] No records were deleted, modified, or duplicated.")
        return

    # Safe populate empty database
    print("\n[*] Database is empty. Performing safe non-destructive initialization with 50 synthetic demo incidents...")
    result = seed_database_safely(allow_reset_demo_only=False)
    print(f"[+] Result: {result['message']}")
    print(f"[+] Demonstration incidents inserted: {result['new_inserted']}")
    print(f"[+] User-created incidents preserved: {result['user_records_preserved']}")


if __name__ == "__main__":
    main()
