#!/usr/bin/env node
// Gibt eine Fortschrittszeile für den laufenden /feature-Ablauf aus (für die Statuszeile).
// Aufruf: node feature-progress.mjs <projektordner>. Ohne laufenden Ablauf: keine Ausgabe.
// Die Hauptsession schreibt den Gesamtstand nach <git-dir>/feature-progress.json, jeder Subagent
// seinen eigenen Stand nach <git-dir>/feature-progress/<rolle>[-<aufgabe>].json. Nichts davon wird committet.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const PHASES = ["Vorbereitung", "Spec", "Design", "Plan", "Umsetzung", "QA", "Review", "Abnahme", "Abschluss"];
// Gewicht je Phase in Prozent; die laufende Phase zählt anteilig nach den Meldungen der Agents.
const WEIGHTS = [5, 10, 10, 10, 35, 10, 8, 7, 5];
const ROLE_LABELS = {
  "product-manager": "PM",
  "tech-lead": "Tech Lead",
  "backend-engineer": "Backend",
  "frontend-engineer": "Frontend",
  "qa-engineer": "QA",
  "acceptance-reviewer": "Abnahme",
};
const STALE_MS = 30 * 60_000; // Agent-Meldungen ohne Update seit 30 Minuten gelten als beendet.

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

try {
  const cwd = process.argv[2] || process.cwd();
  const gitDir = execFileSync("git", ["-C", cwd, "rev-parse", "--absolute-git-dir"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).trim();
  const file = path.join(gitDir, "feature-progress.json");
  const s = readJson(file);

  // Abgeschlossene Abläufe nach einer Stunde ausblenden.
  if (s.state === "fertig" && Date.now() - statSync(file).mtimeMs > 3600_000) process.exit(0);

  // Laufende Agents: Datei frisch und noch nicht alle Schritte erledigt.
  const agents = [];
  const dir = path.join(gitDir, "feature-progress");
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.name.endsWith(".json"));
  } catch {}
  for (const name of entries) {
    const p = path.join(dir, name.name);
    try {
      const a = readJson(p);
      const total = Number(a.steps_total) || 0;
      const doneSteps = Math.min(Number(a.steps_done) || 0, total);
      if (total > 0 && doneSteps < total && Date.now() - statSync(p).mtimeMs < STALE_MS) {
        agents.push({ ...a, total, doneSteps, fraction: doneSteps / total });
      }
    } catch {}
  }

  const done = new Set(s.done ?? []);
  let pct = WEIGHTS.reduce((sum, w, i) => sum + (done.has(i) ? w : 0), 0);
  if (!done.has(s.phase) && s.state !== "fertig") {
    if (s.phase === 4 && s.tasks_total > 0) {
      // Erledigte Aufgaben plus der Anteil der Aufgaben, an denen Engineers gerade arbeiten.
      const inFlight = agents.reduce((sum, a) => sum + a.fraction, 0);
      pct += (WEIGHTS[4] * Math.min(s.tasks_total, (s.tasks_done ?? 0) + inFlight)) / s.tasks_total;
    } else if (agents.length) {
      pct += WEIGHTS[s.phase] * Math.max(...agents.map((a) => a.fraction));
    }
  }
  if (s.state === "fertig") pct = 100;
  pct = Math.min(100, Math.round(pct));

  const filled = Math.round(pct / 10);
  const bar = "▓".repeat(filled) + "░".repeat(10 - filled);
  const parts = [`${s.feature ?? "Feature"} ${bar} ${pct} %`, `Phase ${s.phase}/8 ${PHASES[s.phase] ?? ""}`.trim()];
  if (s.phase === 4 && s.tasks_total > 0) parts.push(`Aufgaben ${s.tasks_done ?? 0}/${s.tasks_total}`);
  if (agents.length) {
    for (const a of agents) {
      const who = [ROLE_LABELS[a.role] ?? a.role, a.task].filter(Boolean).join(" ");
      parts.push(`${who}: ${a.doneSteps}/${a.total}${a.step ? ` ${a.step}` : ""}`);
    }
  } else if (s.activity) {
    parts.push(s.activity);
  }

  const waiting = s.state === "wartet";
  const color = s.state === "fertig" ? "\x1b[32m" : waiting ? "\x1b[33m" : "\x1b[36m";
  const line = parts.join(" · ") + (waiting ? " · ⏸ wartet auf dich" : "");
  process.stdout.write(`${color}${line}\x1b[0m`);
} catch {
  // Kein Repo, keine Datei oder kaputtes JSON: Statuszeile bleibt einfach ohne Fortschritt.
}
