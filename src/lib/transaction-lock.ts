const TRANSACTION_LOCK_DAYS = 7;

export function isTransactionLocked(createdAt: Date) {
  const lockAt = new Date(createdAt.getTime() + TRANSACTION_LOCK_DAYS * 24 * 60 * 60 * 1000);
  return new Date() > lockAt;
}

/** Pending expenses are never time-locked — they still need review. */
export function isExpenseLocked(createdAt: Date, status: string) {
  if (status === "PENDING") return false;
  return isTransactionLocked(createdAt);
}

export function transactionLockMessage() {
  return "This transaction is locked because it is older than one week.";
}
