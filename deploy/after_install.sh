#!/bin/bash
set -euo pipefail

APP_DIR=/opt/mindo/app
REGION=ap-northeast-2

# 배포 그룹 이름으로 dev/prod를 구분한다. 모르는 그룹이면 잘못된 비밀값을 읽지 않게 멈춘다.
case "$DEPLOYMENT_GROUP_NAME" in
  mindo-dev-dg) ENV_NAME=dev ;;
  mindo-prod-dg) ENV_NAME=prod ;;
  *) echo "unknown deployment group: $DEPLOYMENT_GROUP_NAME" >&2; exit 1 ;;
esac

# 패키지는 서버에서 설치한다. GitHub Actions(x86)와 서버(ARM)의 CPU가 달라서다.
cd "$APP_DIR"
npm ci --omit=dev --workspace backend

# Parameter Store 값을 환경변수 파일로 만든다. 비밀값이 로그에 찍히지 않게 set -x는 쓰지 않는다.
mkdir -p /etc/mindo
umask 077
aws ssm get-parameters-by-path \
  --path "/mindo/$ENV_NAME" \
  --with-decryption \
  --region "$REGION" \
  --query "Parameters[].[Name,Value]" \
  --output text \
  | while IFS=$'\t' read -r name value; do
      echo "${name##*/}=$value"
    done > /etc/mindo/api.env
chown root:mindo /etc/mindo/api.env
chmod 640 /etc/mindo/api.env

cat > /etc/systemd/system/mindo-api.service <<'UNIT'
[Unit]
Description=MEMO:RE API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mindo
Group=mindo
WorkingDirectory=/opt/mindo/app/backend
EnvironmentFile=/etc/mindo/api.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
chown -R mindo:mindo "$APP_DIR"