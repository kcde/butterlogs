// Where PowerSync keeps the database on the phone.
//
// OPFS first. IndexedDB storage needs SQLite's large "Asyncify" build, and
// iOS 26.0–26.4 runs out of memory compiling it: the page is killed and
// reloads every so often while it sits idle (WebKit bug 309251,
// https://bugs.webkit.org/show_bug.cgi?id=309251). OPFS uses the normal build.
// IndexedDB stays as the fallback where OPFS can't be used: Safari private
// browsing and Playwright's WebKit.

export type PhoneStorage = "opfs" | "indexeddb";

/** True when this browser lets the page use OPFS. */
export async function opfsAvailable() {
  try {
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens with OPFS where available, otherwise IndexedDB. OPFS can still fail
 * inside the worker after the check above passes (the page can't test it), so
 * a failed OPFS open is closed, reported, and replaced with IndexedDB rather
 * than leaving a blank app.
 */
export async function openPreferringOpfs<T>({
  create,
  init,
  close,
  onFallback,
}: {
  create: (storage: PhoneStorage) => T;
  init: (db: T) => Promise<void>;
  close: (db: T) => Promise<void>;
  onFallback: (error: unknown) => void;
}): Promise<{ db: T; storage: PhoneStorage }> {
  if (await opfsAvailable()) {
    const db = create("opfs");
    try {
      await init(db);
      return { db, storage: "opfs" };
    } catch (error) {
      onFallback(error);
      await close(db).catch(() => {});
    }
  }
  const db = create("indexeddb");
  await init(db);
  return { db, storage: "indexeddb" };
}
