import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { logEvent } from './log.ts';

/** Directory Pi keeps settings and `APPEND_SYSTEM.md` in. */
export const AGENT_DIR = process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent');
export const SETTINGS_FILE = join(AGENT_DIR, 'settings.json');

/** Key this extension owns inside `settings.json`; every other key belongs to Pi. */
const SETTINGS_KEY = 'pi-digest';

interface DigestSettings {
  command?: string;
}

function findSettings(filePath: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    const settings = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

    return settings;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;

    if (code !== 'ENOENT') {
      logEvent('Failed to read settings.json; using the platform default voice');
    }

    return {};
  }
}

/** Command template from `settings.json`; absent when the user never set one. */
export function findCommandTemplate(filePath: string = SETTINGS_FILE): string | undefined {
  const settings = findSettings(filePath);
  const section = settings[SETTINGS_KEY];
  const value = section && typeof section === 'object' ? (section as DigestSettings).command : undefined;

  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Save the template under the extension key and keep every other setting untouched. */
export function saveCommandTemplate(template: string, filePath: string = SETTINGS_FILE): void {
  const settings = findSettings(filePath);
  const section = settings[SETTINGS_KEY];
  const current = section && typeof section === 'object' ? (section as DigestSettings) : {};

  settings[SETTINGS_KEY] = {
    ...current,
    command: template,
  };

  writeFileSync(filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
