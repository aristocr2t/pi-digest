/** Longest text sent to the speaker; longer summaries lose their tail. */
const MAX_TEXT_CHARS = 2000;

/** Drop a half-cut surrogate pair so the string stays valid when encoded for the speaker. */
function trimIncompleteCharacter(text: string): string {
  const last = text.charCodeAt(text.length - 1);
  const value = last >= 0xd800 && last <= 0xdbff ? text.slice(0, -1) : text;

  return value;
}

/** Cut at a sentence or word boundary so the speech never stops mid-word. */
function clampText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) {
    return text;
  }

  const window = text.slice(0, MAX_TEXT_CHARS);
  const sentenceEnd = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
    window.lastIndexOf('… '),
  );

  if (sentenceEnd > MAX_TEXT_CHARS / 2) {
    const value = trimIncompleteCharacter(window.slice(0, sentenceEnd + 1)).trim();

    return value;
  }

  const wordEnd = window.lastIndexOf(' ');
  const cut = wordEnd > 0 ? window.slice(0, wordEnd) : window;
  const value = trimIncompleteCharacter(cut).trim();

  return value;
}

/** Strip Markdown and code so the speaker reads sentences, not syntax. */
export function cleanText(text: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^-+\s*/, '');
  const value = clampText(cleaned);

  return value;
}
