#!/bin/bash
set -euo pipefail

# 이전 버전 파일이 섞이지 않게 비우고 시작한다.
rm -rf /opt/mindo/app
mkdir -p /opt/mindo/app