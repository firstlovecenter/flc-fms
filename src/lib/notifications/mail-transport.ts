// Sends email through FLC notify only.
// Settings are read on every call rather than at import.

export type MailProvider = "FLC_NOTIFY";

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>; // content is base64
}

export interface MailResult {
  provider: MailProvider;
  id?: string;
  error?: string;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const key = process.env.FLC_NOTIFY_KEY;
  const url = (process.env.FLC_NOTIFY_URL ?? "").replace(/\/+$/, "");

  if (!key || !url) {
    return { provider: "FLC_NOTIFY", error: "FLC_NOTIFY_KEY or FLC_NOTIFY_URL is not set." };
  }

  try {
    const response = await fetch(`${url}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-key": key,
      },
      body: JSON.stringify(message),
    });
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { id?: string };
      message?: string;
      error?: string;
    } | null;

    if (!response.ok || !body?.success) {
      return { provider: "FLC_NOTIFY", error: body?.error ?? body?.message ?? `HTTP ${response.status}` };
    }
    const id = body?.data?.id;
    if (typeof id !== "string" || !id.trim()) {
      return { provider: "FLC_NOTIFY", error: "FLC notify returned no message ID." };
    }
    return { provider: "FLC_NOTIFY", id };
  } catch (err: any) {
    return { provider: "FLC_NOTIFY", error: err?.message ?? "Network error" };
  }
}
