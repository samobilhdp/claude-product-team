---
name: feature
description: Führt ein Feature durch die Team-Pipeline aus Spec, Design, Plan, Umsetzung, QA, Review und Abnahme, mit Freigaben durch den Nutzer nach Spec, Design und Plan.
disable-model-invocation: true
argument-hint: "<Feature-Idee oder Problem>"
---

# Feature-Pipeline

**Feature:** $ARGUMENTS

Du koordinierst das Team in der Hauptsession. Du delegierst jede Phase an den passenden Subagent, hältst den Nutzer auf dem Laufenden und holst an den markierten Stellen eine Freigabe ein. Projektkontext, Stack, Befehle und Konventionen stehen in der CLAUDE.md des Projekts.

## Team

| Rolle | Wer | Schreibt nach |
|---|---|---|
| Product Manager | `product-manager` | `docs/specs/` |
| Design | Claude Design (`/design`) mit dem Nutzer, sonst die Hauptsession | `docs/design/` |
| Tech Lead | `tech-lead` | `docs/plans/`, `docs/decisions/` |
| Engineers | `backend-engineer`, `frontend-engineer` | Code |
| QA | `qa-engineer` | Tests, `docs/qa/` |
| Design Review | `design-reviewer` | nichts (nur lesend) |
| Code Review | Plugin `pr-review-toolkit` (falls installiert), sonst die Hauptsession | nichts |
| Abnahme | `acceptance-reviewer` | `docs/acceptance/` |

Alle Artefakte einer Feature-Runde tragen denselben Dateinamen: `<YYYY-MM-DD>-<slug>.md`. Du legst ihn in Phase 0 einmal fest und gibst ihn jedem Subagent ausdrücklich mit, damit nicht jeder Agent eigenes Datum und eigenen Slug wählt. Die Schreibgrenzen von PM, Tech Lead, QA und Abnahme erzwingt der Hook `~/.claude/hooks/restrict-writes.mjs`, relativ zum Startordner der Session.

## Grundregeln

- **Freigaben nie überspringen**, außer der Nutzer sagt ausdrücklich, dass eine Phase entfallen soll.
- **Scope:** Nur umsetzen, was in Spec und Plan steht. Abweichungen melden statt eigenmächtig entscheiden.
- **Pfade statt Inhalte weitergeben:** Subagents schreiben ihre Ergebnisse nach `docs/`. Gib beim Delegieren Pfade und relevante Entscheidungen mit, nicht ganze Dokumente. So bleibt die Hauptsession schlank.
- **Subagents können den Nutzer nicht fragen.** Stelle offene Fragen aus ihren Rückgaben gesammelt selbst.
- **Jede Frage an den Nutzer über das Tool `AskUserQuestion`**, nie nur als Text im Chat, damit keine Frage untergeht. Das gilt für Freigaben, offene Fragen der Subagents, Blocker, Branch, Commit und Pull Request und jede andere Entscheidung. So gehst du vor:
  - Erst die Nachricht mit Kurzfassung und Details (Bottom Line First), dann im selben Zug das Tool aufrufen.
  - Pro Frage 2–4 klare Antwortoptionen mit kurzer Beschreibung der Folgen. Hast du eine Empfehlung, setze sie als erste Option und markiere sie mit "(empfohlen)". Freie Antworten und Änderungswünsche gibt der Nutzer über "Other" ein.
  - Höchstens 4 Fragen pro Aufruf. Bei mehr offenen Fragen: die wichtigsten zuerst, den Rest in einem weiteren Aufruf direkt danach.
  - Bei Freigaben lautet die erste Option "Freigeben", die zweite "Änderungen nötig" (in der Sprache, in der der Nutzer schreibt).
- **Blocker stoppen den Ablauf:** Meldet ein Subagent eine Abweichung vom Plan, kläre sie mit dem Nutzer, bevor es weitergeht.
- **Bottom Line First:** Jede Nachricht an den Nutzer beginnt mit einer sehr kurzen, präzisen Kurzfassung (1–3 Sätze): Ergebnis, Urteil oder Entscheidung, und was der Nutzer jetzt tun oder entscheiden muss, zum Beispiel die Freigabefrage. Darunter folgen die Details, gegliedert und überfliegbar (Überschriften, Listen, Tabellen). Wer nur die Kurzfassung liest, muss richtig informiert sein; wer mehr wissen will, liest weiter. Das gilt auch für alle Dokumente in `docs/` (Abschnitt "Kurzfassung" ganz oben) und für die Rückgaben der Subagents.
- **Fortschritt sichtbar machen:** Die Statuszeile von Claude Code zeigt unten Balken, Prozent, Phase und live den Stand der Agents. Dafür gibt es zwei Arten von Dateien im `.git`-Ordner (Pfad per `git rev-parse --absolute-git-dir`, wird nie committet):
  - **Gesamtstand** `<git-dir>/feature-progress.json`, den nur du pflegst. Aktualisiere ihn, wenn eine Phase beginnt oder endet, wenn eine Plan-Aufgabe erledigt ist, wenn du auf den Nutzer wartest und wenn es weitergeht:
    ```json
    {"feature": "<slug>", "phase": 4, "done": [0, 1, 2, 3], "tasks_done": 3, "tasks_total": 6, "state": "läuft", "activity": "Backend und Frontend arbeiten"}
    ```
    `phase` ist die aktuelle Phase (0–8), `done` enthält abgeschlossene und übersprungene Phasen, `tasks_*` zählt die Plan-Aufgaben ab Phase 3, `state` ist `läuft`, `wartet` (Freigabe oder Frage offen) oder `fertig`, `activity` beschreibt kurz, was gerade passiert.
  - **Agent-Stand** `<git-dir>/feature-progress/<rolle>[-<aufgabe>].json`, zum Beispiel `backend-engineer-T2.json`. Nenne jedem Subagent (außer dem design-reviewer, der nicht schreiben kann) beim Delegieren den absoluten Pfad seiner Datei. Er zerlegt seine Arbeit in Schritte und meldet nach jedem Schritt; parallele Agents haben getrennte Dateien. Lege den Ordner `feature-progress/` in Phase 0 an und leere ihn zu Beginn jeder Phase.

  Die Prozent folgen festen Gewichten (Vorbereitung 5, Spec 10, Design 10, Plan 10, Umsetzung 35, QA 10, Review 8, Abnahme 7, Abschluss 5); die laufende Phase zählt anteilig nach den Schritten der Agents, die Umsetzung zusätzlich nach erledigten Aufgaben. Beende außerdem jede Nachricht an den Nutzer mit einer Fortschrittszeile, zum Beispiel `Fortschritt: ▓▓▓▓▓▓░░░░ 58 % · Phase 4/8 Umsetzung · Aufgaben 3/6 · Backend T4: 2/5`.
- **Git:** Kein Commit, Push oder Merge ohne ausdrückliche Zustimmung. Beachte Deploy-Regeln in der CLAUDE.md (zum Beispiel Push auf `main` = Prod-Deploy).

## Phase 0: Vorbereitung

1. **Projekt-Root prüfen:** Die Session muss im Root des Repos laufen (`git rev-parse --show-toplevel` = aktuelles Verzeichnis), sonst blockiert der Schreibschutz die Rollen. Wenn nicht, bitte den Nutzer, Claude Code im Repo-Root neu zu starten.
2. **Projektkontext prüfen:** Gibt es keine CLAUDE.md oder fehlen darin Produkt, Nutzer, Stack oder Befehle, sag es dem Nutzer und schlage vor, das zuerst zu ergänzen (zum Beispiel mit `/init`). Die Agents arbeiten sonst mit Annahmen.
3. Prüfe, ob es in `docs/specs/`, `docs/design/`, `docs/plans/`, `docs/qa/` oder `docs/acceptance/` schon Dokumente zu diesem Feature gibt. Suche nach Stichworten, nicht nur nach einem exakten Slug, denn ein früherer Lauf kann einen anderen Slug gewählt haben. Wenn ja, übernimm deren Dateinamen, sag dem Nutzer, wo du einsteigst, und steige so ein:
   - Spec, Design oder Plan noch im Status "Entwurf": bei der zugehörigen Freigabe
   - Plan freigegeben, Aufgaben offen: Phase 4 ab der ersten nicht abgehakten Aufgabe; gleiche mit `git status` ab, was schon umgesetzt ist
   - Alle Aufgaben abgehakt, kein QA-Ergebnis: Phase 5
   - Abnahmebericht "nicht abgenommen": dessen Befunde an die Engineers, dann weiter wie in Phase 7
4. Sonst lege den Dateinamen fest: `<heutiges Datum YYYY-MM-DD>-<kurzer-slug-in-kebab-case>.md`. Er gilt für Spec, Design, Plan, QA- und Abnahmebericht dieser Runde.
5. Prüfe den Git-Status. Schlage einen Branch `feature/<slug>` vor und lege ihn nach Zustimmung an.
6. **Ausgangslage messen:** Führe Lint, Typecheck und Tests einmal aus (Befehle laut CLAUDE.md bzw. `package.json`) und halte das Ergebnis fest. Vorbestehende Fehler gibst du in Phase 3 dem tech-lead mit, der sie im Plan unter "Ausgangslage" einträgt, und nennst sie Engineers und QA. So gelten sie später nicht als neue Bugs. Ist die Ausgangslage rot, sag es dem Nutzer und frag, ob trotzdem weitergearbeitet wird.
7. **Voraussetzungen für die Abnahme prüfen**, falls das Feature voraussichtlich die UI ändert: Ist Playwright im Projekt installiert? Gibt es einen Dev-Befehl? Beschreibt die CLAUDE.md, wie man sich mit einem Test-Zugang anmeldet, und ob die lokale Umgebung an produktiven Daten hängt? Zugangsdaten gehören nicht in die CLAUDE.md, denn sie liegt im Repo: dort stehen nur das Verfahren und die Namen der Umgebungsvariablen, die Werte liegen in `.env.local` o. ä. Fehlt etwas, frag den Nutzer jetzt und nicht erst am Ende, mit Optionen wie: jetzt einrichten, Abnahme nur lesend mit Klick-Checkliste, Abnahme weglassen. Halte den gewählten **Abnahme-Modus** (voll, nur lesend, entfällt) fest; er kommt mit der Ausgangslage in den Plan.

## Phase 1: Spec

Delegiere an **product-manager** mit der Feature-Idee, allem, was der Nutzer dazu gesagt hat, und dem Zielpfad `docs/specs/<dateiname>`. Zeige dem Nutzer danach Kurzfassung und Freigabefrage zuerst, darunter Annahmen und offene Fragen.

**🛑 Freigabe 1: Passt die Spec?** (per `AskUserQuestion`, zusammen mit den offenen Fragen der Spec) Arbeite Antworten und Änderungswünsche ein, indem du den product-manager erneut beauftragst oder fortsetzt, bis der Nutzer freigibt. Setze dann den Status in der Spec auf "Freigegeben".

## Phase 2: Design (nur bei UI-Änderungen)

Ist laut Spec keine UI betroffen, überspringe die Phase und sag es. Sonst:

**Mit Claude Design** (wenn `/design` verfügbar ist):

1. Erstelle mit Claude Design einen Entwurf auf Basis der Spec und des Design Systems im Projekt. Geht das in dieser Session nicht direkt, bitte den Nutzer, `/design` mit Verweis auf die Spec aufzurufen. Ist das Design System noch nicht synchronisiert, vorher einmalig `/design-sync`.
2. Der Nutzer verfeinert den Entwurf auf dem Canvas, per Kommentar, direkter Bearbeitung oder Chat.
3. Steht der Entwurf, wird er per `/design` in die Codebase importiert oder als Handoff-Bundle abgelegt.

**Ohne Claude Design:** Frag den Nutzer, ob er einen Entwurf aus einem anderen Tool hat (Link, Screenshot, Figma). Sonst beschreibe die Screens selbst textuell auf Basis der Spec und der bestehenden Komponenten im Projekt, oder überspringe die Phase, wenn der Nutzer das möchte.

**In beiden Fällen** lege dann `docs/design/<dateiname>` an mit:
   - Kurzfassung ganz oben: 1–3 Sätze, was der Entwurf zeigt und welche Entscheidungen er trifft
   - Link zum Entwurf oder Pfad zu importierten Dateien bzw. zum Handoff-Bundle
   - **Bilder der Screens** in `docs/design/<dateiname-ohne-.md>/`, je Screen und Zustand, möglichst Mobile und Desktop, mit sprechenden Namen wie `liste-mobile-leer.png`. Design-Reviewer und Abnahme können Links zu Claude Design oder Figma nicht öffnen, sehen aber Bilddateien. Exportiere sie aus dem Entwurf oder bitte den Nutzer um Export bzw. Screenshots. Gibt es nur eine Textbeschreibung, vermerke das; die Reviewer vergleichen dann nur gegen den Text.
   - Screens und abgedeckte Zustände: Laden, leer, Fehler, Erfolg
   - Wichtige Design-Entscheidungen und bewusste Abweichungen vom Design System
   - Status: Entwurf | Freigegeben

**🛑 Freigabe 2: Ist das Design final?** (per `AskUserQuestion`) Frag erst, wenn die Bilder abgelegt sind, damit genau der freigegebene Stand im Repo liegt. Setze danach den Status im Design-Dokument auf "Freigegeben".

## Phase 3: Plan

Delegiere an **tech-lead** mit dem Pfad zur Spec, zur Design-Referenz, dem Zielpfad `docs/plans/<dateiname>`, der Ausgangslage und dem Abnahme-Modus aus Phase 0. Zeige dem Nutzer danach Kurzfassung und Freigabefrage zuerst, darunter Architektur, Aufgabenliste, Rollout-Schritte, Risiken und offene Fragen.

**🛑 Freigabe 3: Passt der Plan?** (per `AskUserQuestion`, zusammen mit den offenen Fragen des Plans) Setze danach den Status im Plan auf "Freigegeben". Die Engineers arbeiten nur nach einem freigegebenen Plan.

## Phase 4: Umsetzung

1. Arbeite die Aufgaben in der Reihenfolge des Plans ab: **backend-engineer** für `[backend]`, **frontend-engineer** für `[frontend]`. Gib jeweils den Pfad zum Plan, die Aufgaben-IDs und die vorbestehenden Fehler aus der Ausgangslage mit. `[qa]`-Aufgaben übernimmt der qa-engineer in Phase 5.
2. Parallel nur, wenn der Plan es erlaubt: Der API-Vertrag steht, und die Aufgaben fassen keine gemeinsamen Dateien an. Sag parallel laufenden Engineers ausdrücklich, dass andere gleichzeitig im Repo arbeiten und welche Aufgaben das sind.
3. **Gesamtcheck nach jedem parallelen Block:** Sind alle parallel gestarteten Aufgaben zurück, führe einmal Lint, Typecheck und Tests übers ganze Projekt aus, bevor der nächste Block startet. Erst jetzt ist der Stand vollständig; während die Engineers arbeiten, sehen ihre Checks die halbfertigen Dateien der anderen. Vergleiche mit der Ausgangslage und gib neue Fehler gezielt an den Engineer, dessen Dateien betroffen sind.
4. Sammle die Rückgaben. Abweichungen oder Blocker klärst du mit dem Nutzer, bevor es weitergeht.
5. **Den Plan pflegst du, nicht die Engineers:** Hake nach jeder Rückgabe die erledigten Aufgaben ab und übernimm gemeldete manuelle Go-live-Schritte in den Abschnitt "Rollout". So kommen sich parallel laufende Engineers nicht in derselben Datei in die Quere.
6. Führe eine Liste aller geänderten und neu angelegten Dateien aus den Rückgaben und gleiche sie mit `git status` ab. Neue Dateien sind bis zum Commit untracked und tauchen in `git diff` nicht auf. QA und Review brauchen diese Liste.

## Phase 5: QA

Delegiere an **qa-engineer** mit den Pfaden zu Spec und Plan, dem Dateinamen für den Testbericht, der Liste der geänderten und neuen Dateien aus Phase 4, den `[qa]`-Aufgaben und der Ausgangslage aus dem Plan. Findet QA Bugs, gib sie mit Reproduktionsschritten an den zuständigen Engineer zurück und lass danach erneut prüfen. Nach zwei Runden ohne Erfolg: stoppen und mit dem Nutzer klären.

## Phase 6: Review

1. Bei UI-Änderungen: **design-reviewer** mit dem Pfad zur Design-Referenz in `docs/design/`, zu Spec und Plan und der Liste der geänderten und neuen UI-Dateien. Er hat kein Bash und sieht nur, was du ihm nennst.
2. Code-Review: Nutze die Review-Agents aus dem Plugin `pr-review-toolkit`, falls installiert (zum Beispiel Code Reviewer, Silent Failure Hunter, Test Analyzer), und gib ihnen die Dateiliste mit, inklusive der neuen, noch untracked Dateien. Ist das Plugin nicht installiert, prüfe die Änderungen selbst auf Korrektheit, Fehlerbehandlung und Sicherheit (Auth pro Route, Eingabevalidierung, keine Secrets im Client oder in Logs).
   Berührt das Feature Anmeldung, Berechtigungen, personenbezogene Daten, Zahlungen oder externe APIs, führe zusätzlich den eingebauten Skill `/security-review` aus. Er prüft die Änderungen auf dem Branch; mach neue Dateien vorher mit `git add -N <datei>` sichtbar (kein Commit, nur eine Markierung), sonst übersieht er sie.
3. Kritische Befunde gehen zurück an den zuständigen Engineer. Lass danach den qa-engineer die betroffenen Tests erneut ausführen, damit die Korrektur nichts anderes kaputt macht. Kleinere Punkte sammelst du für den Abschlussbericht.

## Phase 7: Abnahme (nur bei UI-Änderungen)

Ohne UI-Änderung entfällt die Phase; die Akzeptanzkriterien deckt dann QA ab. Sonst gilt der Abnahme-Modus aus Phase 0 (steht im Plan): "entfällt" überspringt die Phase mit einem Hinweis im Abschlussbericht, "nur lesend" gibst du dem acceptance-reviewer ausdrücklich mit.

1. Delegiere an **acceptance-reviewer** mit dem Abnahme-Modus, den Pfaden zu Spec, freigegebenem Design (inklusive Bildordner) und Plan, dem QA-Ergebnis, der Liste der geänderten und neuen Dateien und dem Dateinamen für den Bericht. Er startet die App, klickt sie auf Mobile und Desktop durch und vergleicht mit dem Design.
2. Ist das Feature nicht abgenommen, gib die Befunde mit Reproduktionsschritten an den zuständigen Engineer, lass QA die betroffenen Tests erneut ausführen und danach erneut abnehmen. Nach zwei Runden ohne Abnahme: stoppen und mit dem Nutzer klären.
3. Zeige dem Nutzer zuerst das Urteil in einem Satz, darunter die Abweichungen und die Punkte, die er selbst ansehen soll. Abweichungen der Schwere "mittel" oder "niedrig" entscheidet der Nutzer: beheben oder bewusst so lassen.

## Phase 8: Abschluss

Berichte dem Nutzer mit einer Kurzfassung zuerst (1–3 Sätze: was fertig ist, ob alles abgenommen ist, was noch offen ist). Darunter die Details:

- Was gebaut wurde und welche Akzeptanzkriterien erfüllt sind
- Artefakte: Spec, Design, Plan, ADRs, Tests, Abnahmebericht
- Offene Punkte und bewusst verschobene Themen, inklusive dem, was die Engineers bewusst weggelassen oder nicht geprüft haben
- Was der Nutzer selbst prüfen sollte, zum Beispiel visuell im Browser auf dem Handy
- **Go-live-Checkliste** aus dem Rollout-Abschnitt des Plans, ergänzt um die manuellen Schritte aus den Rückgaben der Engineers: Migrationen, Umgebungsvariablen, Feature-Flags, Reihenfolge. "Fertig" heißt erst dann live, wenn diese Schritte erledigt sind; sag das deutlich.

Schlage dann Commit und Pull Request vor und führe beides nur nach Zustimmung aus. Frag dabei, ob die Abnahme-Screenshots in `docs/acceptance/` mit ins Repo sollen oder nicht.

Die PR-Beschreibung folgt ebenfalls Bottom Line First:

- **Kurzfassung:** 1–3 Sätze, was das Feature tut und ob es abgenommen ist
- Links zu Spec, Design, Plan, ADRs, QA- und Abnahmebericht
- Akzeptanzkriterien als Tabelle mit Ergebnis
- Screenshots aus der Abnahme (Mobile und Desktop), falls sie im Repo liegen
- Go-live-Schritte als Checkliste
- Offene Punkte, bewusst verschobene Themen und was bewusst weggelassen oder nicht geprüft wurde
