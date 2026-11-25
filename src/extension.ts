import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';

import { defaultTemplate, parseTemplate, resolveBackend, speak } from './backend.ts';
import { findCommandTemplate, saveCommandTemplate, SETTINGS_FILE } from './config.ts';
import { initPromptFile } from './prompt.ts';
import { cleanText } from './text.ts';

export interface TtsCommand {
  name: string;
  rest: string;
}

/** Split `/digest <name> <rest>`; only the name is case-insensitive, the template keeps its case. */
export function parseCommand(args: string): TtsCommand {
  const input = args.trim();
  const separator = input.search(/\s/);
  const name = (separator === -1 ? input : input.slice(0, separator)).toLowerCase();
  const rest = separator === -1 ? '' : input.slice(separator + 1).trim();

  return {
    name,
    rest,
  };
}

function isSubagentSession(ctx: ExtensionContext): boolean {
  const sessionFile = ctx.sessionManager.getSessionFile();
  const value = sessionFile?.split(/[\\/]/).includes('subagents') ?? false;

  return value;
}

function currentTemplate(): string {
  const value = findCommandTemplate()?.trim() || defaultTemplate();

  return value;
}

export default function piTts(pi: ExtensionAPI): void {
  let pendingText: string | undefined;
  let enabled = true;

  pi.registerTool({
    name: 'tts',
    label: 'TTS',
    description:
      'Root agent only; subagent calls are ignored. Speak a concise 1–3 sentence summary. Call last when work is done or human action is needed. Use the user’s language, plain text, and new information only.',
    parameters: Type.Object({
      text: Type.String({
        description: 'Plain-text outcome and next step in 1–3 sentences, in the user’s language.',
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (isSubagentSession(ctx)) {
        return {
          content: [],
          details: undefined,
        };
      }

      const text = cleanText(params.text);

      if (!text) {
        throw new Error('Provide a non-empty summary to speak.');
      }

      pendingText = text;

      return {
        content: [],
        details: undefined,
      };
    },
  });

  const flushPendingText = (): void => {
    const text = pendingText;
    pendingText = undefined;

    if (enabled && text) {
      speak(text);
    }
  };

  // Pendant emits turn_end; plain Pi also emits agent_settled.
  pi.on('turn_end', async (event, ctx) => {
    if (isSubagentSession(ctx) || event.outcome !== 'completed') {
      pendingText = undefined;

      return;
    }

    flushPendingText();
  });

  pi.on('agent_settled', async (event, ctx) => {
    if (isSubagentSession(ctx) || event.aborted) {
      pendingText = undefined;

      return;
    }

    flushPendingText();
  });

  pi.registerCommand('digest', {
    description: 'Speech summaries: /digest on|off|test|command [template]|init',
    handler: async (args, ctx) => {
      const { name, rest } = parseCommand(args ?? '');

      if (name === 'on') {
        enabled = true;
        ctx.ui.notify('Speech summaries enabled.', 'info');

        return;
      }

      if (name === 'off') {
        enabled = false;
        pendingText = undefined;
        ctx.ui.notify('Speech summaries disabled.', 'info');

        return;
      }

      if (name === 'test') {
        speak('Speech summary test. Your voice backend is working.', currentTemplate());
        ctx.ui.notify(`Starting ${currentTemplate()}. Check console output if you hear nothing.`, 'info');

        return;
      }

      if (name === 'command') {
        if (!rest) {
          const backend = resolveBackend('…', currentTemplate());
          ctx.ui.notify(`${backend.command} ${backend.args.join(' ')}`, 'info');

          return;
        }

        try {
          parseTemplate(rest);
        } catch (err) {
          ctx.ui.notify((err as Error).message, 'error');

          return;
        }

        saveCommandTemplate(rest);
        ctx.ui.notify(`Saved the speech command to ${SETTINGS_FILE}.`, 'info');

        return;
      }

      if (name === 'init') {
        const result = initPromptFile();
        const message = result.changed
          ? `Voice rules written to ${result.path}. Restart Pi or start a new session to apply them.`
          : `Voice rules already up to date in ${result.path}.`;

        ctx.ui.notify(message, 'info');

        return;
      }

      ctx.ui.notify(
        `Speech summaries: ${enabled ? 'on' : 'off'} · backend ${currentTemplate()} · console logging`,
        'info',
      );
    },
  });
}
