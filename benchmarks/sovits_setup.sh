#!/usr/bin/env bash
set -uo pipefail

OUT="$(cd "$(dirname "$0")" && pwd)/out"
PULL_LOG="$OUT/pull-sovits.log"
LOG="$OUT/sovits_setup.log"
IMAGE="xxxxrt666/gpt-sovits"
TAG="latest-cu126"

cd "$(dirname "$0")"

image_ada() { docker images --format '{{.Repository}}' | grep -qx "$IMAGE"; }

echo "[wait] memastikan image $IMAGE:$TAG terunduh (log: $PULL_LOG)…" | tee -a "$LOG"
batas=$((SECONDS + 21600))
while ! image_ada; do
    if ! pgrep -f "docker pull $IMAGE" >/dev/null; then
        echo "[pull] menjalankan/melanjutkan docker pull…" | tee -a "$LOG"
        nohup docker pull "$IMAGE:$TAG" >>"$PULL_LOG" 2>&1 &
    fi
    if [ $SECONDS -gt $batas ]; then
        echo "[GAGAL] melebihi batas waktu 6 jam. Cek $PULL_LOG" | tee -a "$LOG"
        exit 1
    fi
    sleep 20
done
echo "[ok] image siap" | tee -a "$LOG"

echo "[up] menyalakan kontainer sovits…" | tee -a "$LOG"
docker compose -f ../docker-compose.sovits.yml up -d >>"$LOG" 2>&1

echo "[wait] menunggu API 127.0.0.1:9880…" | tee -a "$LOG"
code=""
for i in $(seq 1 90); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9880/docs || true)
    [ "$code" = "200" ] && break
    sleep 10
done
[ "$code" = "200" ] && echo "[ok] API hidup" | tee -a "$LOG" || { echo "[GAGAL] API tidak merespon" | tee -a "$LOG"; exit 1; }

echo "[smoke] Zeta — kalimat pertama korpus…" | tee -a "$LOG"
if BENCH_SOVITS=zeta uv run python -W ignore bench_tts.py --engine sovits --corpus <(head -1 korpus_tts.txt) --outdir out/sovits-smoke >>"$LOG" 2>&1; then
    echo "[OK] SMOKE BERHASIL -> benchmarks/out/sovits-smoke/" | tee -a "$LOG"
else
    echo "[GAGAL] smoke test — baca $LOG" | tee -a "$LOG"
    exit 1
fi

echo "[bench] benchmark penuh zeta + pippa…" | tee -a "$LOG"
BENCH_SOVITS=zeta uv run python -W ignore bench_tts.py --engine sovits >>"$LOG" 2>&1 && \
    echo "[ok] zeta selesai" | tee -a "$LOG"
BENCH_SOVITS=pippa uv run python -W ignore bench_tts.py --engine sovits >>"$LOG" 2>&1 && \
    echo "[ok] pippa selesai" | tee -a "$LOG"
echo "[SELESAI] dengarkan di out/sovits/ — nilai via make skor DIR=sovits" | tee -a "$LOG"
