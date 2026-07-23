#!/usr/bin/env bash
# Compatibility launcher. GitCron's canonical gate is PowerShell on Windows.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec pwsh -NoProfile -File "$SCRIPT_DIR/gates.ps1" "${1:-full}"
