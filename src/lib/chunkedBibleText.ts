export type ChunkedBibleText = Record<string, Record<string, Record<string, string>>>;

let chunkedBibleTextPromise: Promise<ChunkedBibleText> | null = null;

/**
 * Loads the large chunked Bible text only when a reader or memory trainer needs
 * it. The resolved module is cached by both this promise and the module loader.
 */
export function loadChunkedBibleText(): Promise<ChunkedBibleText> {
  if (!chunkedBibleTextPromise) {
    chunkedBibleTextPromise = import('@/data/chunked_text.json')
      .then((module) => module.default as ChunkedBibleText)
      .catch((error: unknown) => {
        // Allow a later user action to retry after a transient chunk/network error.
        chunkedBibleTextPromise = null;
        throw error;
      });
  }

  return chunkedBibleTextPromise;
}
