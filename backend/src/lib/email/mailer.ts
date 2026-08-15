/**
 * Outbound email.
 *
 * There is no email provider configured yet, and the platform has to work
 * anyway: a teacher can always issue a reset code by hand for a student whose
 * message never arrived. So sending is allowed to fail without failing the
 * request that triggered it, and `delivered` says which of the two happened so
 * the caller can tell the user the truth rather than a hopeful "check your
 * inbox".
 *
 * Set RESEND_API_KEY and the email path lights up on its own; nothing else
 * changes.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Every mail here is short enough not to need HTML. */
  text: string;
}

export interface SendResult {
  delivered: boolean;
  /** Why not, when it was not. Recorded and shown to staff, never to the visitor. */
  reason?: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<SendResult>;
  /** False when nothing is configured, so callers can offer the manual path up front. */
  readonly configured: boolean;
}

/**
 * Used when no provider is configured. It reports honestly that nothing was
 * delivered rather than pretending, and prints the message so a developer
 * running locally can follow the link without a provider account.
 */
export class ConsoleMailer implements Mailer {
  readonly configured = false;
  constructor(private readonly log: (message: string) => void = console.log) {}

  async send(message: EmailMessage): Promise<SendResult> {
    this.log(`[email:not-configured] to=${message.to} subject=${message.subject}\n${message.text}`);
    return { delivered: false, reason: 'email_not_configured' };
  }
}

export class ResendMailer implements Mailer {
  readonly configured = true;
  constructor(
    private readonly options: { apiKey: string; from: string; fetchImpl?: typeof fetch },
  ) {}

  async send(message: EmailMessage): Promise<SendResult> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          from: this.options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });
      if (!response.ok) {
        return { delivered: false, reason: `resend_${response.status}: ${(await response.text()).slice(0, 200)}` };
      }
      return { delivered: true };
    } catch (error) {
      // A provider outage must not take the whole request down with it; the
      // reset token is already stored and the manual path still works.
      return { delivered: false, reason: `resend_unreachable: ${(error as Error).message}` };
    }
  }
}

export function createMailer(env: {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}): Mailer {
  if (!env.RESEND_API_KEY) return new ConsoleMailer();
  return new ResendMailer({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM ?? 'CamPath <onboarding@resend.dev>',
  });
}
