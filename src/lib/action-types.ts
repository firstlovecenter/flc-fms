/**
 * Standardised return type for all Server Actions.
 *
 * Usage:
 *   export async function myAction(): Promise<ActionResult<{ id: string }>> {
 *     if (!ok) return actionError("UNAUTHORIZED", "You must be logged in.");
 *     return actionSuccess({ id: "abc" });
 *   }
 *
 * Client-side narrowing:
 *   const result = await myAction();
 *   if (!result.success) { toast.error(result.message); return; }
 *   console.log(result.data.id);
 */

export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "PAYMENT_REQUIRED"
  | "UNVERIFIED"
  | "MAINTENANCE"
  | "RATE_LIMITED"
  | "SERVER_ERROR";

export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionError = {
  success: false;
  code: ActionErrorCode;
  message: string;
};

export type ActionResult<T = void> = ActionSuccess<T> | ActionError;

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function actionError(code: ActionErrorCode, message: string): ActionError {
  return { success: false, code, message };
}
