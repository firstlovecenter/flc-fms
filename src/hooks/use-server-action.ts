"use client";

import { useState, useTransition, useCallback } from "react";

interface ServerActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (message: string) => void;
}

interface ServerActionState<T> {
  data: T | null;
  error: string | null;
  isPending: boolean;
}

/**
 * Wraps a Server Action with consistent loading, error, and success state.
 *
 * Supports both legacy `{ error: string }` / `{ success: true }` shapes and
 * the new structured `{ success: boolean, code, message, data }` shape from
 * `src/lib/action-types.ts`.
 *
 * Usage:
 *   const { execute, isPending, error } = useServerAction(createBooking, {
 *     onSuccess: () => toast.success("Booking created"),
 *     onError:   (msg) => toast.error(msg),
 *   });
 *
 *   <Button disabled={isPending} onClick={() => execute(formData)}>
 *     {isPending ? "Saving…" : "Save"}
 *   </Button>
 */
export function useServerAction<TArgs extends unknown[], TData>(
  action: (...args: TArgs) => Promise<
    | { success: true; data?: TData; booking?: unknown }
    | { success: false; code?: string; message?: string; error?: string }
    | { error: string }
    | { success: true }
  >,
  options: ServerActionOptions<TData> = {},
) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ServerActionState<TData>>({
    data: null,
    error: null,
    isPending: false,
  });

  const execute = useCallback(
    (...args: TArgs) => {
      setState((s) => ({ ...s, error: null }));
      startTransition(async () => {
        try {
          const result = await action(...args);

          if ("error" in result && result.error) {
            const msg = result.error;
            setState({ data: null, error: msg, isPending: false });
            options.onError?.(msg);
            return;
          }

          if ("success" in result && !result.success) {
            const msg = (result as { message?: string }).message ?? "An unexpected error occurred.";
            setState({ data: null, error: msg, isPending: false });
            options.onError?.(msg);
            return;
          }

          const data = ((result as { data?: TData }).data ?? null) as TData;
          setState({ data, error: null, isPending: false });
          options.onSuccess?.(data);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
          setState({ data: null, error: msg, isPending: false });
          options.onError?.(msg);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action],
  );

  return {
    execute,
    isPending,
    data: state.data,
    error: state.error,
  };
}
