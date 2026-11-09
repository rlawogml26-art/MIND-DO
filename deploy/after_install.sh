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

# t4g.micro(메모리 910MB, 스왑 없음)에서 npm ci가 메모리 부족으로 강제 종료돼(11/7 배포 d-6IE1HSCI9, exit 137) 스왑 1GB를 둔다.
# XFS에서는 fallocate로 만든 파일을 swapon이 거부할 수 있어 dd로 만든다.
# ECS 전환 후 삭제.
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  if [ ! -f /swapfile ]; then
    dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
fi

npm ci --omit=dev --workspace backend

# Parameter Store 값을 환경변수 파일로 만든다. 비밀값이 로그에 찍히지 않게 set -x는 쓰지 않는다.
mkdir -p /etc/mindo
# RDS TLS 검증용 공개 인증서. 비밀값이 아니고 서비스 사용자(mindo)도 읽어야 해서 644로 둔다.
install -m 644 "$APP_DIR/deploy/certs/rds-global-bundle.pem" /etc/mindo/rds-ca.pem
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

# 마이그레이션은 서버 시작(ApplicationStart) 전에 적용한다. 실패하면 배포가 실패로 끝나고 새 서버는 시작되지 않는다.
# env 파일 전체를 source하지 않고 DATABASE_URL 한 줄만 읽는다. 값에 셸 특수문자가 있어도 실행되지 않게 하기 위해서다.
# prisma migrate는 DB_SSL_CA_PATH를 읽지 않으므로 URL 파라미터로 인증서 검증 TLS를 켠다. 완성된 URL은 출력하지 않는다.
db_url=$(sed -n 's/^DATABASE_URL=//p' /etc/mindo/api.env | head -n 1)
if [ -z "$db_url" ]; then
  echo "DATABASE_URL not found in Parameter Store (/mindo/$ENV_NAME)" >&2
  exit 1
fi
case "$db_url" in
  *\?*) sep='&' ;;
  *) sep='?' ;;
esac
DATABASE_URL="${db_url}${sep}sslcert=/etc/mindo/rds-ca.pem&sslaccept=strict" \
  npm run migrate:deploy --workspace backend
unset db_url

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
Environment=DB_SSL_CA_PATH=/etc/mindo/rds-ca.pem
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
chown -R mindo:mindo "$APP_DIR"