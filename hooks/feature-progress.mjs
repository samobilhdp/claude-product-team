#!/usr/bin/env node
// Gibt eine Fortschrittszeile für den laufenden /feature-Ablauf aus (für die Statuszeile).
// Aufruf: node feature-progress.mjs <projektordner>. Ohne laufenden Ablauf: keine Ausgabe.
// Die Hauptsession schreibt den Stand nach <git-dir>/feature-progress.json; dort wird er nie committet.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const PHASES = ["Vorbereitung", "Spec", "Design", "Plan", "Umsetzung", "QA", "Review", "Abnahme", "Abschluss"];
// Gewicht je Phase in Prozent; die Umsetzung zählt anteilig nach erledigten Plan-Aufgaben.
const WEIGHTS = [5, 10, 10, 10, 35, 10, 8, 7, 5];

try {
  const cwd = process.argv[2] || process.cwd();
  const gitDir = execFileSync("git", ["-C", cwd, "rev-parse", "--absolute-git-dir"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  }).trim();
  const file = path.join(gitDir, "feature-progress.json");
  const s = JSON.parse(readFileSync(file, "utf8"));

  // Abgeschlossene Abläufe nach einer Stunde ausblenden.
  if (s.state === "fertig" && Date.now() - statSync(file).mtimeMs > 3600_000) process.exit(0);

  const done = new Set(s.done ?? []);
  let pct = WEIGHTS.reduce((sum, w, i) => sum + (done.has(i) ? w : 0), 0);
  if (s.phase === 4 && !done.has(4) && s.tasks_total > 0) pct += (WEIGHTS[4] * s.tasks_done) / s.tasks_total;
  if (s.state === "fertig") pct = 100;
  pct = Math.min(100, Math.round(pct));

  const filled = Math.round(pct / 10);
  const bar = "▓".repeat(filled) + "░".repeat(10 - filled);
  const parts = [`${s.feature ?? "Feature"} ${bar} ${pct} %`, `Phase ${s.phase}/8 ${PHASES[s.phase] ?? ""}`.trim()];
  if (s.phase === 4 && s.tasks_total > 0) parts.push(`Aufgaben ${s.tasks_done}/${s.tasks_total}`);
  if (s.activity) parts.push(s.activity);

  const waiting = s.state === "wartet";
  const color = s.state === "fertig" ? "\x1b[32m" : waiting ? "\x1b[33m" : "\x1b[36m";
  const line = parts.join(" · ") + (waiting ? " · ⏸ wartet auf dich" : "");
  process.stdout.write(`${color}${line}\x1b[0m`);
} catch {
  // Kein Repo, keine Datei oder kaputtes JSON: Statuszeile bleibt einfach ohne Fortschritt.
}
