import { setTimeout as sleep } from "node:timers/promises";

interface SendTmuxEnterWithRetryOptions {
  messageLength: number;
  baseDelayMs: number;
  sendEnter: () => Promise<void>;
  captureOutput: () => Promise<string>;
}

/**
 * Send Enter after an adaptive delay, with retry logic for large messages.
 *
 * For messages >1KB, retries Enter up to 3 times if pane output does not
 * change, which indicates Enter may have been swallowed by the shell.
 */
export async function sendTmuxEnterWithRetry({
  messageLength,
  baseDelayMs,
  sendEnter,
  captureOutput,
}: SendTmuxEnterWithRetryOptions): Promise<void> {
  const lengthFactorMs = Math.floor(messageLength / 1000) * 200;
  const adaptiveDelayMs = Math.min(baseDelayMs + lengthFactorMs, 2000);
  await sleep(adaptiveDelayMs);

  const needsRetry = messageLength > 1000;
  const maxRetries = needsRetry ? 3 : 1;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let beforeOutput = "";
    if (needsRetry) {
      try {
        beforeOutput = await captureOutput();
      } catch {
        // Ignore capture errors
      }
    }

    await sendEnter();

    if (needsRetry) {
      await sleep(500);

      try {
        const afterOutput = await captureOutput();
        if (afterOutput !== beforeOutput) {
          break;
        }
        await sleep(300 * (attempt + 1));
      } catch {
        // Ignore capture errors, assume success
        break;
      }
    }
  }
}
