import type { ReactElement } from "react";
import { Resend } from "resend";
import { getEmailEnv } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  react: ReactElement;
  /** Plain-text fallback; also what gets logged in development. */
  text: string;
  /** Resend de-duplicates sends with the same key for 24 hours. */
  idempotencyKey?: string;
};

export type EmailSender = (message: EmailMessage) => Promise<{ id: string | null }>;

let resend: Resend | undefined;

/**
 * Sends through Resend, or logs to the console when RESEND_API_KEY is unset
 * (local development without an email account).
 */
export const sendEmail: EmailSender = async (message) => {
  const { RESEND_API_KEY, EMAIL_FROM } = getEmailEnv();
  if (!RESEND_API_KEY) {
    console.info(
      `\n[email:dev] To: ${message.to}\n[email:dev] Subject: ${message.subject}\n${message.text}\n`,
    );
    return { id: null };
  }

  resend ??= new Resend(RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    {
      from: EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      react: message.react,
      text: message.text,
    },
    message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
  );
  if (error) {
    throw new Error(`Email to ${message.to} failed: ${error.message}`);
  }
  return { id: data?.id ?? null };
};
