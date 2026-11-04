---
name: max-weiter
description: Setzt einen unterbrochenen Max-Run aus HANDOFF.md auf hoher Effort-Stufe fort. Wird nur ueber /max-weiter gestartet.
argument-hint: [Freigabe oder Hinweis]
effort: high
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Edit(./**)
  - Write(./**)
  - Bash(node .claude/skills/max-run/scripts/limit-check.mjs *)
  - PowerShell(node .claude/skills/max-run/scripts/limit-check.mjs *)
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git show *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git switch *)
  - Bash(git branch *)
  - PowerShell(git status *)
  - PowerShell(git diff *)
  - PowerShell(git log *)
  - PowerShell(git show *)
  - PowerShell(git add *)
  - PowerShell(git commit *)
  - PowerShell(git switch *)
  - PowerShell(git branch *)
  - Bash(dotnet *)
  - Bash(npm *)
  - Bash(npx *)
  - Bash(ng *)
  - Bash(openspec *)
  - PowerShell(dotnet *)
  - PowerShell(npm *)
  - PowerShell(npx *)
  - PowerShell(ng *)
  - PowerShell(openspec *)
hooks:
  PostToolUse:
    - matcher: "*"
      hooks:
        - type: command
          command: node
          args: ["${CLAUDE_PROJECT_DIR}/.claude/skills/max-run/scripts/limit-check.mjs", "post-tool"]
          timeout: 40
  Stop:
    - hooks:
        - type: command
          command: node
          args: ["${CLAUDE_PROJECT_DIR}/.claude/skills/max-run/scripts/limit-check.mjs", "stop"]
          timeout: 10
  StopFailure:
    - hooks:
        - type: command
          command: node
          args: ["${CLAUDE_PROJECT_DIR}/.claude/skills/max-run/scripts/limit-check.mjs", "stop-failure"]
          timeout: 10
---

# Max-Run fortsetzen

Hinweis des Users: $ARGUMENTS

1. Lies `HANDOFF.md`. Fehlt sie oder steht sie auf `DONE`, sage das dem User und hoere auf.
2. Lies `.claude/skills/max-run/SKILL.md`. Abschnitte "Arbeitsschleife", "Grenzen", "Ende" und die Vorlage gelten unveraendert.
3. Vergleiche die Datei mit der Wirklichkeit, denn sie kann mitten im Schritt stehen geblieben sein: `git status`, `git branch --show-current`, `git log --oneline -10`, `git diff`. Bei einem Widerspruch gilt das Repo. Korrigiere die Datei und notiere die Abweichung. Ein Commit mit `WIP` oder eine `ABBRUCH`-Zeile heisst: Dieser Schritt ist nicht fertig, pruefe ihn zuerst.
4. Miss das Limit: `node .claude/skills/max-run/scripts/limit-check.mjs meter`. Bei `STOPP` lass den Status unveraendert, nenne dem User Stand und Resetzeit und hoere auf.
5. Trage einen Hinweis oder eine Freigabe des Users mit Datum unter "Auftrag" ein und entferne den Punkt aus "Wartet auf euch". Fortsetzen ist keine pauschale Freigabe: Offene Punkte dort bleiben offen, solange der User sie nicht nennt.
6. Steht der Run auf `BLOCKED` und der Grund besteht weiter, nenne dem User die offene Entscheidung und hoere auf.
7. Setze `Status: RUNNING`, trage `ABBRUCH`-Zeilen als erledigt aus und arbeite ab "Naechster Schritt" in der Arbeitsschleife weiter.
