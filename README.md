# Claude Code Product Team (/feature)

Ein Ablauf aus sieben Rollen-Agents (Product Manager, Tech Lead, Frontend, Backend, QA, Design Review, Abnahme), gestartet über den Skill `/feature`.
Ein Schreibschutz-Hook begrenzt, wohin Product Manager, Tech Lead, QA und Abnahme schreiben dürfen (z. B. PM nur in `docs/specs/`). Er greift bei den Datei-Tools (Write/Edit). QA und Abnahme haben zusätzlich Bash; dort gilt die Grenze nur als Anweisung im Agent, nicht technisch erzwungen. Die Engineers haben keine Schreibgrenze.

Kommunikation: Bottom Line First. Jede Nachricht an den Nutzer, jede Rückgabe der Agents und jedes Dokument in `docs/` beginnt mit einer Kurzfassung in 1–3 Sätzen; die Details folgen darunter.

## Installation
```bash
git clone https://github.com/samobilhdp/claude-product-team.git
cd claude-product-team && bash install.sh
```
Danach eine neue Claude-Code-Session starten. Updates: `git pull && bash install.sh`.

Ohne Git: ZIP entpacken, `bash install.sh` ausführen, neue Session starten.

Voraussetzung: Node.js (für den Hook). Claude Code im Repo-Root starten.

Optional: Claude Design (`/design`) für die Design-Phase und das Plugin `pr-review-toolkit` für das Code-Review. Playwright im Projekt für die Abnahme im Browser (die Abnahme fängt schreibende Requests ab, damit keine echten Daten verändert werden). Ohne diese Dinge läuft der Ablauf mit Fallbacks weiter.

## ponytail (eingebaut)
Die Engineers arbeiten nach den Regeln von ponytail (github.com/DietrichGebert/ponytail, MIT, © 2026 DietrichGebert): kleinste vollständige Änderung, Bestehendes vor Neuem, nie an Validierung, Fehlerbehandlung oder Sicherheit sparen. Die Regeln stehen direkt in den Engineer-Agents, das Plugin muss nicht installiert werden. Lizenz: `skills/feature/licenses/ponytail-LICENSE`.

## Inhalt
- `skills/feature/SKILL.md`: der /feature-Ablauf
- `agents/*.md`: die sieben Rollen
- `hooks/restrict-writes.mjs`: der Schreibschutz (wird aus dem Agent-Frontmatter aufgerufen, keine settings.json-Änderung nötig)
