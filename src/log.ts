/** Console output the user reads in Pi; spoken text never goes here. */
export function logEvent(message: string): void {
  console.log(`[digest] ${new Date().toISOString()} ${message}`);
}
