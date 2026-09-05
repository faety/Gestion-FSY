#!/usr/bin/env bash
# PostgreSQL local pour le développement, sans Docker ni service système.
#
#   scripts/postgres-local.sh init     crée le cluster et la base (une fois)
#   scripts/postgres-local.sh start    démarre (port 5433, pour ne pas gêner un PG existant)
#   scripts/postgres-local.sh stop
#   scripts/postgres-local.sh status
#
# DATABASE_URL correspondante, à mettre dans .env :
#   postgresql://app:app@127.0.0.1:5433/app
#
# Le cluster vit dans $PGDATA (par défaut /var/tmp/pgdata-<nom du projet>) :
# hors du projet, donc jamais versionné, et hors de /tmp/claude-* dont les
# permissions sont réécrites par certains environnements.
set -euo pipefail

NOM="$(basename "$(cd "$(dirname "$0")/.." && pwd)")"
PGDATA="${PGDATA:-/var/tmp/pgdata-$NOM}"
PORT="${PGPORT:-5433}"
UTILISATEUR="${PGUSER_APP:-app}"
BASE="${PGDATABASE_APP:-app}"
LOG="$PGDATA.log"

# Binaires : le PATH d'abord, puis les emplacements habituels (Debian/Ubuntu).
BIN="$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl 2>/dev/null | tail -1)")"
[ -x "$BIN/pg_ctl" ] || { echo "pg_ctl introuvable : installez postgresql (apt install postgresql)." >&2; exit 1; }

# Sous root, PostgreSQL refuse de tourner : on passe par l'utilisateur postgres.
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }

case "${1:-}" in
  init)
    if [ -d "$PGDATA" ]; then echo "Cluster déjà présent : $PGDATA"; exit 0; fi
    mkdir -p "$PGDATA"; [ "$(id -u)" = 0 ] && chown postgres "$PGDATA"
    # --auth=trust : base locale de développement, sans mot de passe.
    run "'$BIN/initdb' -D '$PGDATA' -U '$UTILISATEUR' --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
    "$0" start
    run "'$BIN/createdb' -p $PORT -U '$UTILISATEUR' '$BASE'" || true
    echo "Base prête : postgresql://$UTILISATEUR:$UTILISATEUR@127.0.0.1:$PORT/$BASE"
    ;;
  start)
    rm -f "$PGDATA/postmaster.pid"
    run "'$BIN/pg_ctl' -D '$PGDATA' -o '-p $PORT -c listen_addresses=127.0.0.1' -l '$LOG' -w start"
    ;;
  stop)
    run "'$BIN/pg_ctl' -D '$PGDATA' -m fast stop"
    ;;
  status)
    run "'$BIN/pg_ctl' -D '$PGDATA' status" || true
    ;;
  *)
    echo "Usage : $0 init|start|stop|status" >&2; exit 1
    ;;
esac
