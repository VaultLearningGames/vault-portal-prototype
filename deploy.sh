#!/bin/sh
# Build and (re)start the prototype on fddatateam, port 8070 (reachable on the campus VPN / Tailscale only).
#   ./deploy.sh            # deploys to host "fddatateam" from ~/.ssh/config
set -e
HOST=${HOST:-fddatateam}
PORT=${PORT:-8070}
NAME=vault-portal-prototype
rsync -az --delete --exclude .git ./ "$HOST:~/$NAME/"
ssh "$HOST" "cd ~/$NAME && docker build -q -t $NAME:latest . && \
  (docker rm -f $NAME >/dev/null 2>&1 || true) && \
  docker run -d --name $NAME --restart unless-stopped -p $PORT:80 $NAME:latest >/dev/null && \
  echo \"$NAME running on port $PORT\""
