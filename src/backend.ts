import { spawn } from 'node:child_process';
import { homedir, platform } from 'node:os';

import { findCommandTemplate } from './config.ts';
import { logEvent } from './log.ts';

/** Ready-to-spawn speaker: executable plus arguments with the text already in place. */
export interface TtsBackend {
  command: string;
  args: string[];
}

const PLACEHOLDER = '%s';

/** Voice each host ships with; `%s` marks where the spoken text goes. */
export function defaultTemplate(hostPlatform: NodeJS.Platform = platform()): string {
  if (hostPlatform === 'darwin') {
    return `say ${PLACEHOLDER}`;
  }

  if (hostPlatform === 'win32') {
    return (
      'powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Speech; ' +
      `(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak([string]$args[0])" ${PLACEHOLDER}`
    );
  }

  return `spd-say ${PLACEHOLDER}`;
}

function findUnclosedQuote(template: string): string | undefined {
  let open = '';

  for (const char of template) {
    if (open) {
      open = char === open ? '' : open;

      continue;
    }

    if (char === '"' || char === "'") {
      open = char;
    }
  }

  return open || undefined;
}

function expandHome(command: string): string {
  const value = command.replace(/^~(?=$|[\\/])/, homedir());

  return value;
}

/** Split a template into arguments; quotes keep spaces inside one argument. */
export function parseTemplate(template: string): string[] {
  const quote = findUnclosedQuote(template);

  if (quote) {
    throw new Error(`Unclosed ${quote} quote in the TTS command template.`);
  }

  const source = template.trim();
  const matches = source.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const value = matches.map((token) =>
    token.replace(/"([^"]*)"|'([^']*)'/g, (_match, double: string, single: string) => double ?? single),
  );

  return value;
}

/** Fill a template with the text; a template without `%s` gets the text appended as the last argument. */
export function resolveBackend(
  text: string,
  template: string = findCommandTemplate() ?? '',
  hostPlatform: NodeJS.Platform = platform(),
): TtsBackend {
  const source = template.trim() || defaultTemplate(hostPlatform);
  const tokens = parseTemplate(source);
  const filled = source.includes(PLACEHOLDER) ? tokens : [...tokens, text];
  const args = filled.map((token) => token.split(PLACEHOLDER).join(text));

  return {
    command: expandHome(args[0] ?? ''),
    args: args.slice(1),
  };
}

/** Start the speaker in the background so the turn ends without waiting for the audio. */
export function speak(text: string, template?: string): void {
  try {
    const backend = resolveBackend(text, template);

    logEvent(`speak ${text.length} characters using ${backend.command}`);

    const child = spawn(backend.command, backend.args, {
      cwd: homedir(),
      detached: true,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    child.on('error', (err) => logEvent(`voice error: ${err.message}`));
    child.on('exit', (code) => logEvent(`exit=${code ?? 'unknown'}`));

    child.unref();
  } catch (err) {
    logEvent(`voice error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
