#!/bin/sh
# Build and (re)start the prototype on fddatateam, port 8070 (reachable on the campus VPN only).
#   ./deploy.sh            # over the campus VPN (fddatateam = 128.104.149.145)
#   ADDR=100.94.191.86 ./deploy.sh   # over Tailscale instead
set -e
HOST=${HOST:-fddatateam}
ADDR=${ADDR:-128.104.149.145}
SSH="ssh -o HostName=$ADDR"
PORT=${PORT:-8070}
NAME=vault-portal-prototype
rsync -az --delete --exclude .git -e "$SSH" ./ "$HOST:~/$NAME/"
$SSH "$HOST" "cd ~/$NAME && docker build -q -t $NAME:latest . && \
  (docker rm -f $NAME >/dev/null 2>&1 || true) && \
  docker run -d --name $NAME --restart unless-stopped -p $PORT:80 $NAME:latest >/dev/null && \
  echo \"$NAME running on port $PORT\""
