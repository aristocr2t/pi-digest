import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { AGENT_DIR } from './config.ts';

/** Global rules Pi appends to the system prompt of every session. */
export const PROMPT_FILE = join(AGENT_DIR, 'APPEND_SYSTEM.md');
const SECTION_PATTERN = /^## Voice[ \t]*$/m;

/** Rules `/digest init` writes; the model speaks only through the `tts` tool. */
export const VOICE_SECTION = `## Voice

When \`tts(text)\` is available, the root agent calls it last before finishing: on success, on failure, and before reporting a blocker, asking a question, or requesting user action. Use 1–3 plain-text sentences in the user's language with the outcome or blocker and the next step. Subagents skip voice.
`;

/** Put the section in place: replace an existing one, or append it after the other rules. */
export function upsertSection(content: string, section: string = VOICE_SECTION): string {
  const start = SECTION_PATTERN.exec(content)?.index ?? -1;

  if (start === -1) {
    const base = content.replace(/\s+$/, '');
    const value = base ? `${base}\n\n${section}` : section;

    return value;
  }

  const nextHeading = content.indexOf('\n## ', start + 1);
  const end = nextHeading === -1 ? content.length : nextHeading + 1;
  const rest = content.slice(end).replace(/^\n+/, '');
  const value = `${content.slice(0, start)}${section}${rest ? `\n${rest}` : ''}`;

  return value;
}

interface InitResult {
  path: string;
  changed: boolean;
}

/** Rewrite the prompt file only when its content actually changes. */
export function initPromptFile(filePath: string = PROMPT_FILE): InitResult {
  const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const updated = upsertSection(content);

  if (updated === content) {
    return {
      path: filePath,
      changed: false,
    };
  }

  writeFileSync(filePath, updated, 'utf8');

  return {
    path: filePath,
    changed: true,
  };
}
