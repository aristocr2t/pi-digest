# pi-digest

Pi extension that speaks a short summary of every turn. The root agent calls the `tts` tool with one to three sentences; the extension queues the text and plays it after the turn ends. Each host uses its own speech engine by default, and a command template replaces it with any TTS program.

## Install

```bash
pi install npm:pi-digest
```

Or straight from the repository:

```bash
pi install git:github.com/aristocr2t/pi-digest
```

Or load it without saving:

```bash
pi -e git:github.com/aristocr2t/pi-digest
```

## Use

| Command | What it does |
|---|---|
| `/digest` | Show the current state and command template |
| `/digest on` | Enable speech summaries |
| `/digest off` | Disable speech summaries |
| `/digest test` | Speak a test phrase through the current backend |
| `/digest command` | Print the command and arguments that would run |
| `/digest command <template>` | Save a custom command template to `settings.json` |
| `/digest init` | Write the Voice rules for the `tts` tool into `APPEND_SYSTEM.md` |

`/digest init` adds this section to `~/.pi/agent/APPEND_SYSTEM.md`, replacing a previous `## Voice` section instead of duplicating it:

```markdown
## Voice

When `tts(text)` is available, the root agent calls it last before finishing: on success, on failure, and before reporting a blocker, asking a question, or requesting user action. Use 1–3 plain-text sentences in the user's language with the outcome or blocker and the next step. Subagents skip voice.
```

The rule is a normal file change, so it applies to the next session or after `/reload`.

## Command template

The template is a normal command line. `%s` marks where the spoken text goes, and quotes keep an option value in one argument:

```bash
/digest command ~/.local/bin/voice --speaker xenia "%s"
```

The template is saved under the `pi-digest` key of `~/.pi/agent/settings.json`; every other setting is left untouched. A template without `%s` gets the text appended as the final argument. Without a template, each host uses its own engine:

| Platform | Default |
|---|---|
| macOS | `say %s` |
| Windows | PowerShell `System.Speech` |
| Linux | `spd-say %s` |

`~` at the start of the executable expands to the home directory. An unclosed quote is rejected when the template is saved and when the speaker starts.

## Text handling

Markdown, code fences, and links are stripped before speaking, and the text is cut at a sentence boundary above 2000 characters. Spoken text is never logged; the extension logs only the backend, length, and exit code.

## Development

```bash
npm install
npm run typecheck
npm test
```

`src/extension.ts` registers the tool and commands, `src/backend.ts` owns the template and the process, `src/text.ts` cleans the spoken text, `src/prompt.ts` maintains `APPEND_SYSTEM.md`, and `src/config.ts` reads and writes `settings.json`. Tests run with the Node.js test runner on Node.js 22.9 or newer.
