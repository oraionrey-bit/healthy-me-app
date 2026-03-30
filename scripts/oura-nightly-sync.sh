#!/bin/bash
# Nightly Oura sync — captures the full day's data before midnight
curl -s -X POST "https://xkdagrpbgyjsbnzbpkxb.supabase.co/functions/v1/oura-sync" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"e454325f-b8e6-4251-9a49-9d706eef99c3\",\"start_date\":\"$(date '+%Y-%m-%d')\",\"end_date\":\"$(date '+%Y-%m-%d')\"}" \
  > /tmp/oura-nightly-sync.log 2>&1
