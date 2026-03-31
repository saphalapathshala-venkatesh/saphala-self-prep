import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "Saphala Pathshala <noreply@saphala.in>";
const SUPPORT = process.env.SUPPORT_EMAIL ?? "support@saphala.in";

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    console.error("[resend] RESEND_API_KEY is not set — email not sent.");
    return { ok: false, error: "Email service not configured." };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: "Reset your Saphala Pathshala password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
          <h1 style="color:#2D1B69;font-size:24px;margin:0 0 8px;">Reset your password</h1>
          <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
            We received a request to reset the password for your Saphala Pathshala account.
            Click the button below to set a new password. This link expires in 15 minutes.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#6D4BCB;color:#fff;text-decoration:none;
                    padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#999;font-size:13px;margin:24px 0 0;line-height:1.6;">
            If you didn&apos;t request this, you can safely ignore this email.
            Your password will not change.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#bbb;font-size:12px;margin:0;">
            Saphala Pathshala &mdash; Your exam prep partner
          </p>
        </div>
      `,
    });
    if (error) {
      console.error("[resend] Failed to send password reset email:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[resend] Exception sending password reset email:", err);
    return { ok: false, error: "Failed to send email." };
  }
}

export async function sendContactEmail(opts: {
  senderName: string;
  senderEmail: string;
  phone: string | null;
  message: string;
}): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    console.error("[resend] RESEND_API_KEY is not set — contact email not sent.");
    return { ok: false, error: "Email service not configured." };
  }
  const { senderName, senderEmail, phone, message } = opts;
  const ts = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: SUPPORT,
      replyTo: senderEmail,
      subject: `Contact form: message from ${senderName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
          <h2 style="color:#2D1B69;margin:0 0 20px;">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px;">
            <tr>
              <td style="padding:8px 12px;background:#f5f3ff;color:#555;font-weight:600;width:120px;border-radius:6px;">Name</td>
              <td style="padding:8px 12px;color:#222;">${senderName}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#555;font-weight:600;">Email</td>
              <td style="padding:8px 12px;color:#222;">
                <a href="mailto:${senderEmail}" style="color:#6D4BCB;">${senderEmail}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f5f3ff;color:#555;font-weight:600;">Phone</td>
              <td style="padding:8px 12px;color:#222;">${phone ?? "—"}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#555;font-weight:600;vertical-align:top;">Message</td>
              <td style="padding:8px 12px;color:#222;white-space:pre-wrap;">${message}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f5f3ff;color:#555;font-weight:600;">Submitted</td>
              <td style="padding:8px 12px;color:#888;">${ts} IST</td>
            </tr>
          </table>
        </div>
      `,
    });
    if (error) {
      console.error("[resend] Failed to send contact email:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[resend] Exception sending contact email:", err);
    return { ok: false, error: "Failed to send email." };
  }
}
