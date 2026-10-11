#!/usr/bin/env node
// PreToolUse-Hook: Erlaubt einer Rolle Schreibzugriffe nur in freigegebenen Pfaden.
// Globale Variante: liegt in ~/.claude/hooks/ und gilt für alle Projekte.
// Aufruf aus dem Agent-Frontmatter: node "$HOME/.claude/hooks/restrict-writes.mjs" <profil> || exit 2
// Exit 0 = erlaubt, Exit 2 = blockiert (die Meldung auf stderr geht an Claude zurück).
// Das "|| exit 2" im Aufruf sorgt dafür, dass auch ein Absturz oder eine fehlende Datei blockiert
// statt still durchzulassen (Claude Code blockiert nur bei Exit 2).
import path from "node:path";

// Pfade relativ zum Projekt-Root (Startordner der Claude-Session), als reguläre Ausdrücke.
// Jede Rolle darf ihre eigene Fortschrittsdatei im .git-Ordner schreiben (für die Statuszeile).
const PROGRESS = /^\.git\/feature-progress\/[\w.-]+\.json$/;

const PROFILES = {
  "product-manager": [/^docs\/specs\//],
  "tech-lead": [/^docs\/plans\//, /^docs\/decisions\//],
  "qa-engineer": [
    /(^|\/)(tests?|e2e|__tests__|__mocks__)\//,
    /\.(test|spec)\.[cm]?[jt]sx?$/,
    /^(playwright|vitest|jest)\.config\.[cm]?[jt]s$/,
    /^docs\/qa\//,
  ],
  "acceptance-reviewer": [/^docs\/acceptance\//],
};

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

const profile = process.argv[2];
const allowed = PROFILES[profile];
if (!allowed) block(`restrict-writes: unbekanntes Profil "${profile}".`);

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  block("restrict-writes: Hook-Eingabe nicht lesbar, Schreibzugriff blockiert.");
}

const toolInput = input.tool_input ?? {};
const target = toolInput.file_path ?? toolInput.notebook_path ?? toolInput.path;
if (!target) block("restrict-writes: kein Zielpfad erkennbar, Schreibzugriff blockiert.");

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");

if (rel.startsWith("..") || path.isAbsolute(rel)) {
  block(
    `Rolle "${profile}" darf nicht außerhalb des Projekts schreiben: ${target} ` +
      `(Projekt-Root: ${root}). Läuft die Session nicht im Repo-Root, dort neu starten.`
  );
}

if (PROGRESS.test(rel) || allowed.some((pattern) => pattern.test(rel))) process.exit(0);

block(
  `Rolle "${profile}" darf nicht nach ${rel} schreiben. ` +
    `Erlaubt: ${allowed.map(String).join(", ")}. ` +
    `Melde die nötige Änderung stattdessen in deiner Rückgabe an die Hauptsession.`
);
