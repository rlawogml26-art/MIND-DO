#!/bin/bash
set -euo pipefail

# 첫 배포에는 서비스가 없으므로 실패해도 넘어간다.
systemctl stop mindo-api 2>/dev/null || true