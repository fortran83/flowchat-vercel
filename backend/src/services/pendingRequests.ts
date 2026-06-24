import { Response } from 'express';

interface PendingRequest {
  res: Response;
  timer: ReturnType<typeof setTimeout>;
}

// Holds long-poll HTTP responses waiting for a button tap
const pending = new Map<string, PendingRequest>();

const TIMEOUT_MS = 114_000; // just under Apex's 120s callout limit

export function registerPending(
  conversationId: string,
  res: Response,
  onTimeout: () => void
): void {
  const timer = setTimeout(() => {
    pending.delete(conversationId);
    onTimeout();
  }, TIMEOUT_MS);

  pending.set(conversationId, { res, timer });
}

export function resolvePending(
  conversationId: string,
  buttonId: string,
  buttonText: string
): boolean {
  const entry = pending.get(conversationId);
  if (!entry) return false;

  clearTimeout(entry.timer);
  pending.delete(conversationId);

  entry.res.json({
    buttonText,
    buttonId,
    conversationId,
    timedOut: false,
  });

  return true;
}

export function hasPending(conversationId: string): boolean {
  return pending.has(conversationId);
}
