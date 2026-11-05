// Sends one email through notifyGo (Codeslaw's mail service) or, until its key is set, Resend.
// Both speak the same API, so this is a plain fetch. Settings are read on every call rather than
// at import, because on Cloudflare Workers the environment is only populated per request.

const NOTIFYGO_DEFAULT_URL = "https://notifygo.app/resend";
const RESEND_URL = "https://api.resend.com";

export type MailProvider = "NOTIFYGO" | "RESEND";

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

function transport(): { provider: MailProvider; url: string; key: string } | null {
  const notifygoKey = process.env.NOTIFYGO_API_KEY;
  if (notifygoKey) {
    const url = (process.env.NOTIFYGO_API_URL || NOTIFYGO_DEFAULT_URL).replace(/\/+$/, "");
    return { provider: "NOTIFYGO", url, key: notifygoKey };
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) return { provider: "RESEND", url: RESEND_URL, key: resendKey };
  return null;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const target = transport();
  if (!target) return { provider: "NOTIFYGO", error: "No email API key is set (NOTIFYGO_API_KEY)." };

  try {
    const response = await fetch(`${target.url}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${target.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!response.ok) {
      return { provider: target.provider, error: body?.message || `HTTP ${response.status}` };
    }
    return { provider: target.provider, id: body?.id };
  } catch (err: any) {
    return { provider: target.provider, error: err?.message ?? "Network error" };
  }
}
