#!/bin/bash
set -euo pipefail

# 최대 60초 동안 /health가 응답하는지 확인한다. 실패하면 배포 실패로 처리되어 롤백된다.
for _ in $(seq 1 20); do
  if curl -fsS http://localhost:3000/health > /dev/null; then
    echo "healthy"
    exit 0
  fi
  sleep 3
done

echo "health check failed" >&2
journalctl -u mindo-api -n 50 --no-pager >&2 || true
exit 1