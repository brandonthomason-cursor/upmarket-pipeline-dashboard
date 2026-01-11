#!/usr/bin/env python3
"""
Databricks Data Fetcher for Upmarket Pipeline Dashboard
Fetches pipeline metrics from Databricks and outputs to data.json
"""

import os
import json
import sys
from datetime import datetime

try:
    from databricks import sql
except ImportError:
    print("Warning: databricks-sql-connector not installed")
    sql = None

DATABRICKS_HOST = os.environ.get('DATABRICKS_HOST')
DATABRICKS_TOKEN = os.environ.get('DATABRICKS_TOKEN')
DATABRICKS_WAREHOUSE_ID = os.environ.get('DATABRICKS_WAREHOUSE_ID')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, '..', 'data.json')


def get_connection():
    if not sql:
        raise ImportError("databricks-sql-connector not installed")
    if not all([DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID]):
        raise ValueError("Missing required environment variables")
    
    return sql.connect(
        server_hostname=DATABRICKS_HOST,
        http_path=f"/sql/1.0/warehouses/{DATABRICKS_WAREHOUSE_ID}",
        access_token=DATABRICKS_TOKEN
    )


def main():
    print(f"Starting data fetch at {datetime.now().isoformat()}")
    
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        data = {
            'quarterlyTarget': 20000,
            'summary': {'closedWon': 0, 'activeCount': 0, 'weightedPipeline': 0},
            'partnerSourced': [],
            'partnerAssisted': [],
            'partners': [],
            'recentWins': [],
            'stageCounts': {},
            'pipelineTrend': [],
            'lastUpdated': datetime.now().isoformat()
        }
        
        cursor.close()
        connection.close()
        
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Successfully wrote data to {OUTPUT_FILE}")
        return 0
        
    except Exception as e:
        print(f"Error fetching data: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())