#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/out"

case "${1:-help}" in
audisi)
    echo "Audisi suara Wikidepia — catat nama yang terbaik (perempuan, energik)."
    echo "Ctrl+C untuk berhenti kapan saja."
    echo ""
    if [ $# -gt 1 ]; then
        shift
        for nama in "$@"; do
            f=$(ls audition/*_${nama}.wav 2>/dev/null | head -1) || true
            [ -z "$f" ] && { echo "speaker '$nama' tidak ditemukan"; continue; }
            echo "▶ ${f#audition/}"
            mpv --really-quiet "$f"
        done
    else
        for f in audition/*.wav; do
            echo "▶ ${f#audition/}"
            mpv --really-quiet "$f"
        done
    fi
    ;;
piper)
    echo "Re-test Piper (sudah diperbaiki) — nilai rubrik 1-5."
    echo "Kosongkan jawaban untuk melewati kalimat."
    echo ""
    rm -f piper_skor.csv
    for n in $(seq -w 1 12); do
        echo "════ KALIMAT $n ════"
        mpv --really-quiet "piper/$n.wav"
        read -r -p "  skor (1-5): " s
        [ -n "$s" ] && echo "$n,$s" >> piper_skor.csv
    done
    echo ""
    echo "Selesai! Skor tersimpan di out/piper_skor.csv:"
    cat piper_skor.csv
    ;;
skor)
    dir="${2:-}"
    [ -z "$dir" ] || [ ! -d "$dir" ] && { echo "pakai: $0 skor <folder>"; echo "contoh: $0 skor sovits-zeta"; exit 1; }
    csv="${dir}_skor.csv"
    echo "Penilaian folder $dir — rubrik 1-5 (skill benchmark-id)."
    rm -f "$csv"
    i=0
    for f in "$dir"/*.wav; do
        i=$((i+1))
        base=$(basename "$f" .wav)
        echo "════ [$i] $base ════"
        mpv --really-quiet "$f"
        read -r -p "  skor (1-5): " s
        [ -n "$s" ] && echo "$base,$s" >> "$csv"
    done
    echo ""
    echo "Selesai! Skor di $csv:"
    cat "$csv"
    ;;
pitch)
    echo "Audisi pitch hybrid RVC — pilih yang paling feminin & natural."
    for f in rvc-pitch/*.wav; do
        echo "▶ ${f#rvc-pitch/}"
        mpv --really-quiet "$f"
    done
    ;;
ulang)
    nama="${2:-}"
    n="${3:-01}"
    [ -z "$nama" ] && { echo "pakai: $0 ulang <mms|piper> <nomor>"; exit 1; }
    mpv --really-quiet "$nama/$n.wav"
    ;;
*)
    echo "Pemutar benchmark Humi"
    echo ""
    echo "  ./run.sh audisi          putar semua 83 suara Wikidepia (tampil nama)"
    echo "  ./run.sh audisi gadis wibowo   putar speaker tertentu saja"
    echo "  ./run.sh piper           re-test Piper: putar + minta skor otomatis"
    echo "  ./run.sh skor sovits-zeta  nilai folder mana pun (rubrik 1-5)"
    echo "  ./run.sh pitch             audisi 6 varian pitch hybrid RVC"
    echo "  ./run.sh ulang mms 03    putar ulang satu file"
    ;;
esac
