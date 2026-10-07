// Detects errors caused by a browser running an older build than the server
// (after a deploy): missing JS chunks or Server Action IDs that no longer exist.
// The fix for the user is a full reload, which fetches the current build.

const RELOAD_KEY = "cfms:stale-build-reload-at";
// Don't reload more than once in this window, to avoid reload loops if the
// error has some other cause.
const RELOAD_COOLDOWN_MS = 30_000;

export function isStaleBuildError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name ?? "";
  const message = String((error as { message?: string }).message ?? error);
  return (
    name === "ChunkLoadError" ||
    name === "UnrecognizedActionError" ||
    /Loading (CSS )?chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Server Action .* was not found on the server/i.test(message)
  );
}

/** Reloads the page once per cooldown window. Returns true if a reload was triggered. */
export function reloadForStaleBuild(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — still reload, the browser will throttle loops.
  }
  window.location.reload();
  return true;
}
