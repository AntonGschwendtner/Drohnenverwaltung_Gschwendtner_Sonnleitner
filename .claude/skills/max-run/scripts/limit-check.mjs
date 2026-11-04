#!/usr/bin/env node
// Limit-Messer und Hook-Logik fuer /max-run und /max-weiter.
//
// Claude sieht sein Nutzungslimit nicht selbst. Dieses Script startet deshalb einen
// winzigen Haiku-Aufruf und liest aus der Stream-Ausgabe das Ereignis rate_limit_event.
// Das Feld ist nicht offiziell dokumentiert: Fehlt es nach einem Update, meldet das
// Script "nicht messbar" und der Run laeuft nur mit den laufenden Eintraegen in HANDOFF.md.
//
// Aufruf: node limit-check.mjs <meter|post-tool|stop|stop-failure|session-start>

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- Einstellungen ----
const STOPP_5H = Number(process.env.MAX_RUN_STOPP_5H) || 90; // Ab diesem Stand des 5-Stunden-Limits (%) wird sauber beendet
const STOPP_7T = 95;          // Dasselbe fuer das Wochenlimit (%)
const MESS_ABSTAND_S = 180;   // Hook misst hoechstens alle 3 Minuten
// -----------------------

const ROOT = process.env.CLAUDE_PROJECT_DIR
  || resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HANDOFF = join(ROOT, 'HANDOFF.md');
const STATE = join(ROOT, '.claude', 'max-run-state.json');

const readJson = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; } };
const readStdin = () => { try { return JSON.parse(readFileSync(0, 'utf8')); } catch { return {}; } };
const writeState = (state) => { try { writeFileSync(STATE, JSON.stringify(state, null, 2)); } catch { /* nur Messwert-Cache */ } };
const now = () => new Date().toLocaleString('de-AT');

function runStatus() {
  try { return readFileSync(HANDOFF, 'utf8').match(/^Status:\s*(\w+)/m)?.[1] ?? 'UNBEKANNT'; }
  catch { return null; }
}

function findClaude() {
  if (process.env.MAX_RUN_CLAUDE_BIN) return process.env.MAX_RUN_CLAUDE_BIN;
  const exe = process.platform === 'win32' ? 'claude.exe' : 'claude';
  for (const name of ['.vscode', '.vscode-insiders', '.cursor']) {
    const dir = join(homedir(), name, 'extensions');
    if (!existsSync(dir)) continue;
    const versions = readdirSync(dir)
      .filter((d) => d.startsWith('anthropic.claude-code-'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const v of versions) {
      const bin = join(dir, v, 'resources', 'native-binary', exe);
      if (existsSync(bin)) return bin;
    }
  }
  const local = join(homedir(), '.local', 'bin', exe);
  return existsSync(local) ? local : 'claude';
}

function measure() {
  const bin = findClaude();
  const res = spawnSync(bin, [
    '--output-format', 'stream-json', '--input-format', 'stream-json', '--verbose',
    '--model', 'haiku', '--no-session-persistence', '--tools', '', '--setting-sources', '',
    '--strict-mcp-config', '--disable-slash-commands', '--system-prompt', 'Antworte mit OK.',
  ], {
    input: '{"type":"user","message":{"role":"user","content":"OK"}}\n',
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
    shell: bin === 'claude' && process.platform === 'win32',
    cwd: homedir(),
    env: { ...process.env, MAX_RUN_METER: '1' },
  });

  let windows = null;
  for (const line of String(res.stdout ?? '').split('\n')) {
    if (!line.includes('rate_limit_event')) continue;
    try { windows = JSON.parse(line).rate_limit_info?.unifiedWindows ?? windows; } catch { /* Zeile ignorieren */ }
  }
  const raw5h = windows?.five_hour?.utilization;
  if (typeof raw5h !== 'number') return null;

  const previous = readJson(STATE).reading;
  const used5h = Math.round(raw5h * 100);
  const raw7t = windows?.seven_day?.utilization;
  const used7t = typeof raw7t === 'number' ? Math.round(raw7t * 100) : null;
  const resetsAt = windows.five_hour.resetsAt ?? null;
  const delta = previous && previous.resetsAt === resetsAt ? Math.max(0, used5h - previous.used5h) : 0;
  // Auch stoppen, wenn der naechste Abschnitt bei gleichem Verbrauch fast alles aufbrauchen wuerde.
  const stop = used5h >= STOPP_5H || used5h + delta >= 98 || (used7t !== null && used7t >= STOPP_7T);
  const reading = { used5h, used7t, resetsAt, delta, stop, at: Date.now() };
  writeState({ ...readJson(STATE), reading });
  return reading;
}

function describe(r) {
  if (!r) return 'Limit: nicht messbar. Nur die laufenden Eintraege in HANDOFF.md schuetzen den Stand.';
  const reset = r.resetsAt ? new Date(r.resetsAt * 1000).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : 'unbekannt';
  const week = r.used7t === null ? 'unbekannt' : `${r.used7t} %`;
  return `Limit: 5 Stunden ${r.used5h} % (+${r.delta}) | 7 Tage ${week} | Reset 5h ${reset} | ${r.stop ? 'STOPP' : 'WEITER'}`;
}

const command = process.argv[2];

// Der Messaufruf selbst darf nie wieder Hooks oder Messungen ausloesen.
if (process.env.MAX_RUN_METER === '1') process.exit(0);

switch (command) {
  case 'meter':
    console.log(describe(measure()));
    break;

  case 'post-tool': {
    readStdin();
    if (runStatus() !== 'RUNNING') break;
    const state = readJson(STATE);
    if (Date.now() - (state.lastAttempt ?? 0) < MESS_ABSTAND_S * 1000) break;
    writeState({ ...state, lastAttempt: Date.now() });
    const r = measure();
    if (r?.stop) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `${describe(r)}. Die Stoppschwelle des Max-Runs ist erreicht: laut Skill jetzt keinen neuen Schritt beginnen, den aktuellen Stand sichern, HANDOFF.md aktualisieren und Status auf PAUSED setzen.`,
        },
      }));
    }
    break;
  }

  case 'stop': {
    readStdin();
    if (runStatus() !== 'RUNNING') break;
    const r = readJson(STATE).reading;
    const fresh = r && Date.now() - r.at < 15 * 60 * 1000;
    const reason = fresh && r.stop
      ? `${describe(r)}. Stand sichern, HANDOFF.md aktualisieren, Status auf PAUSED setzen, dann beenden.`
      : 'HANDOFF.md steht auf Status: RUNNING. Mit dem naechsten Schritt weitermachen. Nur beenden, wenn der Status vorher auf DONE, BLOCKED oder PAUSED gesetzt wurde.';
    console.log(JSON.stringify({ decision: 'block', reason }));
    break;
  }

  case 'stop-failure': {
    const input = readStdin();
    if (runStatus() === null) break;
    appendFileSync(HANDOFF, `\n- ABBRUCH ${now()}: Turn endete mit API-Fehler "${input.error ?? 'unbekannt'}". Letzter eingetragener Schritt ist evtl. halb fertig: git status und git diff pruefen.\n`);
    break;
  }

  case 'session-start': {
    const input = readStdin();
    const status = runStatus();
    if (status === null || status === 'DONE') break;
    if (input.source === 'compact') {
      console.log(`Max-Run aktiv, Status ${status}. Der Kontext wurde gerade zusammengefasst. Massgeblicher Stand steht in HANDOFF.md im Projektordner.`);
    } else {
      console.log(`Im Projekt liegt ein nicht abgeschlossener Max-Run: HANDOFF.md, Status ${status}. Die Datei beschreibt Auftrag, Stand und naechsten Schritt. Fortgesetzt wird er mit /max-weiter.`);
    }
    break;
  }

  default:
    console.error('Aufruf: node limit-check.mjs <meter|post-tool|stop|stop-failure|session-start>');
    process.exit(1);
}
