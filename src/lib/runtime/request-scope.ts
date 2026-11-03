import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Returns an object that is unique to the current request when running on
 * Cloudflare Workers, or `undefined` everywhere else (Node, Vercel, build time).
 *
 * Workers forbid reusing a socket (database or Redis connection) opened while
 * serving one request from inside another request, so clients that hold
 * connections must be created per request there. Use this as a WeakMap key.
 */
export function cloudflareRequestKey(): object | undefined {
  try {
    return getCloudflareContext().ctx;
  } catch {
    return undefined;
  }
}

/**
 * Connection string for the Hyperdrive binding on Cloudflare Workers, or
 * `undefined` when not running there (callers fall back to DATABASE_URL).
 */
export function hyperdriveConnectionString(): string | undefined {
  try {
    const env = getCloudflareContext().env as { HYPERDRIVE?: { connectionString: string } };
    return env.HYPERDRIVE?.connectionString;
  } catch {
    return undefined;
  }
}

/**
 * Wraps a connection-holding client so that each Workers request gets its own
 * instance, while other runtimes share one process-wide instance. The returned
 * proxy is a drop-in replacement for the client itself.
 */
export function requestScoped<T extends object>(create: () => T, shared: () => T): T {
  const perRequest = new WeakMap<object, T>();

  const resolve = (): T => {
    const key = cloudflareRequestKey();
    if (!key) return shared();
    let client = perRequest.get(key);
    if (!client) {
      client = create();
      perRequest.set(key, client);
    }
    return client;
  };

  return new Proxy({} as T, {
    get(_target, prop) {
      const client = resolve();
      const value = Reflect.get(client, prop, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
    has(_target, prop) {
      return Reflect.has(resolve(), prop);
    },
  });
}
