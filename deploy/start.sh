#!/bin/bash
set -euo pipefail

systemctl enable mindo-api
systemctl restart mindo-api