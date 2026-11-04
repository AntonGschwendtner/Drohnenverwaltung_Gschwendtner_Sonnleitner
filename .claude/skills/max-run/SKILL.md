---
name: max-run
description: Arbeitet eine grosse Aufgabe auf hoher Effort-Stufe selbststaendig ab, bis sie fertig ist oder das Nutzungslimit fast erreicht ist, und fuehrt dabei HANDOFF.md fuer die naechste Session. Wird nur ueber /max-run gestartet.
argument-hint: <Aufgabe>
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

# Max-Run

Auftrag: $ARGUMENTS

Du arbeitest diesen Auftrag ohne Rueckfragen ab, bis er fertig ist oder das Limit fast erreicht ist. Niemand sitzt daneben, und ein hartes Limit beendet dich ohne Vorwarnung. Deshalb steht in `HANDOFF.md` jederzeit alles, was die naechste Session braucht. Wer erst am Ende schreibt, verliert bei einem Abbruch den Stand.

## Start

1. Lies `HANDOFF.md`, falls vorhanden. Ist der Status nicht `DONE`, ueberschreibe sie nicht: Frage, ob der alte Run mit `/max-weiter` fortgesetzt oder verworfen werden soll.
2. Miss das Limit: `node .claude/skills/max-run/scripts/limit-check.mjs meter`. Bei `STOPP` beginne nicht, sondern nenne dem User den Stand und die Resetzeit.
3. Betrifft der Auftrag das Schulprojekt, lies `.claude/skills/max-run/references/projektauftrag.md`.
4. Anhaenge aus dem Chat sind in der naechsten Session weg. Uebernimm, was davon gebraucht wird, in `HANDOFF.md` oder ins Repo.
5. Zerlege den Auftrag in Schritte, die jeweils mit einem pruefbaren Ergebnis und einem Commit enden. Lege `HANDOFF.md` nach der Vorlage unten mit `Status: RUNNING` an.

## Arbeitsschleife

Fuer jeden Schritt:

1. Trage ihn unter "Stand jetzt" als begonnen ein, mit Branch und betroffenen Dateien.
2. Setze ihn um und pruefe ihn wirklich: Build oder Tests ausfuehren, Diff lesen. Hake nur ab, was du geprueft hast.
3. Committe auf dem Branch des Features, nie direkt auf `main`.
4. Ist das Feature damit fertig, fuehre es wie unter "GitHub und Branches" beschrieben nach `main`.
5. Aktualisiere `HANDOFF.md`: Schritt mit Commit-Hash und Testergebnis abhaken, naechsten Schritt konkret benennen, Entscheidungen festhalten.
6. Miss das Limit erneut und gehe direkt zum naechsten Schritt.

Beende deinen Turn nicht zwischendurch und schreibe keine Zwischenberichte an den User: Ein Hook schickt dich zurueck an die Arbeit, solange `Status: RUNNING` gilt. Ein zweiter Hook misst waehrend der Arbeit alle 3 Minuten und meldet sich, wenn die Stoppschwelle erreicht ist. Zaehlt nur diese Meldung oder `STOPP` aus der Messung, nicht dein Gefuehl fuer den Verbrauch. Schaetze keine Prozentwerte: Wenn die Messung "nicht messbar" meldet, arbeite weiter und halte die Datei besonders genau aktuell.

Bei unklaren Details waehle die vorsichtigere Variante, die sich leicht aendern laesst, und notiere sie unter "Entscheidungen". Stelle keine Rueckfragen, denn sie wuerden den Run anhalten.

## GitHub und Branches

Das Repo ist `AntonGschwendtner/Drohnenverwaltung_Gschwendtner_Sonnleitner`, der Hauptbranch ist `main`, das Board ist das GitHub Project Nr. 4 `Gschwendtner_Sonnleitner_Drohnenverwaltung`. Pruefe zu Beginn mit `gh auth status`, ob die Verbindung steht. Fehlt sie, setze `Status: BLOCKED`, denn die Anmeldung muss der User selbst machen.

Im Schulprojekt laeuft die Arbeit ueber die vorhandenen Skills, nicht daran vorbei: `opsx:propose`, dann Spec-Review durch die Menschen, `openspec-to-github`, je Issue `openspec-apply-with-github`, zum Schluss `openspec-archive-with-github`. Die Reihenfolge steht in `references/projektauftrag.md`.

Fuer jedes Feature:

1. `git switch main`, dann `git pull`, dann ein neuer Branch, der nach dem Feature benannt ist: `feature/<issue>-<name>` wie `feature/16-loan-api`, ohne Issue `feature/<name>`.
2. Feature umsetzen und testen. Ein Feature, ein Branch, ein Pull Request.
3. Wenn es fertig ist und Build und Tests gruen sind: `git push -u origin <branch>`, `gh pr create` mit Bezug auf Issue und Anforderung, `gh pr merge --merge`. Der Weg ueber den Pull Request haelt die Spur fuer die Abgabe fest. Den Branch nicht loeschen.
4. Unfertiges oder Rotes nie mergen, auch nicht beim Stopp wegen des Limits: Dann den Branch nur pushen und unter "Stand jetzt" eintragen.
5. Einen Merge-Konflikt loese nur, wenn die richtige Loesung eindeutig ist. Sonst unter "Wartet auf euch" eintragen.

## Grenzen

- Verhalten aendern heisst: zuerst die Spec aendern. Die OpenSpec-Specs sind die Quelle der Wahrheit.
- Das Spec-Review entscheiden die Menschen. Erreichst du diesen Punkt, trage ihn unter "Wartet auf euch" ein und arbeite an dem weiter, was davon unabhaengig ist. Eine Freigabe im Auftragstext gilt nur fuer den dort genannten Punkt.
- Nicht ohne ausdruecklichen Auftrag: Force-Push, direkt auf `main` committen, Branches oder Issues loeschen, einen OpenSpec-Change vor dem Merge archivieren.
- `git pull`, `git push` und `gh` sind nicht vorab freigegeben: Claude Code fragt den User, und der Run wartet bis zur Antwort. Versuche nicht, das zu umgehen.
- Tokens und andere Geheimnisse gehoeren weder ins Repo noch in `HANDOFF.md`.

## Ende

Setze den Status, bevor du den Turn beendest:

| Status | Wann |
|---|---|
| `DONE` | Auftrag vollstaendig erledigt und geprueft |
| `PAUSED` | Messung meldet `STOPP`, oder der User haelt den Run an |
| `BLOCKED` | Ohne menschliche Entscheidung geht nichts mehr weiter |

Bei `PAUSED` wegen des Limits beginne nichts Neues mehr: Committe den aktuellen Stand auf den Feature-Branch, auch wenn er unfertig ist, und kennzeichne ihn in der Commit-Nachricht mit `WIP`. Schreibe unter "Naechster Schritt", wie es exakt weitergeht.

Melde dem User danach kurz auf Deutsch: Status, was erledigt ist, was auf ihn wartet und wann das Limit zurueckgesetzt wird.

## Vorlage fuer HANDOFF.md

```markdown
# Handoff
Status: RUNNING
Aktualisiert: <Datum Uhrzeit>
Limit zuletzt: <Ausgabe der Messung>

## Auftrag (woertlich)
<kompletter Auftragstext, spaetere Freigaben des Users mit Datum>

## Quellen
<Dateien und Inhalte, die man zum Weiterarbeiten braucht>

## Stand jetzt
Branch: <Name>
Letzter Commit: <Hash und Titel>
In Arbeit: <Schritt, geaenderte Dateien, was daran noch fehlt>

## Naechster Schritt
<eine konkrete Aktion, die ohne Vorwissen ausfuehrbar ist>

## Plan
- [x] <Schritt> (<Commit-Hash>, <Testergebnis>)
- [ ] <Schritt>

## Entscheidungen
- <Entscheidung und Grund>

## Wartet auf euch
- <Review, Merge oder Frage, mit Link oder Branch>

## Sackgassen
- <Was nicht funktioniert hat und warum>
```

Schreibe die Datei so, dass eine Session ohne jede Erinnerung an dieses Gespraech weiterarbeiten kann. Abbruchmeldungen haengt ein Hook unten an.
