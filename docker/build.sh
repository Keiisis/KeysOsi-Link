#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
#   Build KeysOsi Lab Kali image (Linux/macOS)
# ═══════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"

echo
echo "  Construction de l'image aura-lab:latest ..."
echo "  (1ere execution = 10-20 min, telechargement Kali ~500MB)"
echo

docker build -t aura-lab:latest .

echo
echo "  [OK] Image aura-lab:latest prete."
echo "  Lance le serveur KeysOsi-Link, puis clique 'Start Lab' dans l'extension."
