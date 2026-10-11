#!/usr/bin/env bash
# Kopiert das Product Team nach ~/.claude/. Vorhandene Dateien gleichen Namens werden vorher gesichert (*.bak).
set -euo pipefail
cd "$(dirname "$0")"
DEST="$HOME/.claude"
mkdir -p "$DEST/skills" "$DEST/agents" "$DEST/hooks"
backup() { [ -e "$1" ] && cp -R "$1" "$1.bak" && echo "Gesichert: $1.bak" || true; }
backup "$DEST/skills/feature"
for f in agents/*.md hooks/*.mjs; do backup "$DEST/$f"; done
cp -R skills/feature "$DEST/skills/"
cp agents/*.md "$DEST/agents/"
cp hooks/restrict-writes.mjs "$DEST/hooks/"
command -v node >/dev/null || echo "WARNUNG: Node.js nicht gefunden. Der Schreibschutz-Hook braucht node und blockiert sonst alle Schreibzugriffe der Rollen."
echo "Fertig. Claude Code neu starten, dann /feature verwenden."
