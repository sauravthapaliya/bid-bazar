import "server-only";

export function buildEmailVerificationOtpTemplate(params: {
  code: string;
  ttlMinutes: number;
}) {
  const { code, ttlMinutes } = params;

  return {
    subject: "Your BIDBZAR Verification Code",
    text: [
      "BIDBZAR — Email Verification",
      "",
      `Your verification code is: ${code}`,
      "",
      `This code is valid for ${ttlMinutes} minutes.`,
      "Do not share this code with anyone.",
      "",
      "If you did not request this, you can safely ignore this email.",
      "",
      `© ${new Date().getFullYear()} BIDBZAR`,
    ].join("\n"),
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email — BIDBZAR</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Georgia,'Times New Roman',serif;color:#111111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:520px;">

          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:40px;border-bottom:2px solid #111111;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#111111;">BIDBZAR</p>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-top:40px;padding-bottom:8px;">
              <p style="margin:0;font-size:26px;font-weight:400;color:#111111;line-height:1.3;">Verify your email address</p>
            </td>
          </tr>

          <!-- Subtext -->
          <tr>
            <td style="padding-bottom:40px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;color:#555555;line-height:1.7;">
                Enter the code below to confirm your email and complete verification.
              </p>
            </td>
          </tr>

          <!-- Code -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#888888;">Verification Code</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:40px;">
              <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:48px;font-weight:700;letter-spacing:14px;color:#111111;line-height:1;">${code}</p>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding-bottom:40px;border-bottom:1px solid #e5e5e5;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:#555555;line-height:1.7;">
                This code expires in <strong style="color:#111111;">${ttlMinutes} minutes</strong>. For your security, do not share it with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#aaaaaa;line-height:1.6;">
                If you did not request this email, no action is required — you can safely disregard it.<br />
                © ${new Date().getFullYear()} BIDBZAR. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

export function buildAuctionContactRequestTemplate(params: {
  recipientName: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  auctionTitle: string;
  meetingLocation: string;
  preferredContactTime?: string | null;
  note?: string | null;
  isConfirmation?: boolean;
}) {
  const {
    recipientName,
    senderName,
    senderEmail,
    senderPhone,
    auctionTitle,
    meetingLocation,
    preferredContactTime,
    note,
    isConfirmation = false,
  } = params;

  const intro = isConfirmation
    ? `You shared your contact details for "${auctionTitle}" on BIDBZAR.`
    : `${senderName} shared contact details for "${auctionTitle}" on BIDBZAR.`;
  const subject = isConfirmation
    ? `Contact details shared for ${auctionTitle}`
    : `New contact details for ${auctionTitle}`;
  const preferredTimeLine = preferredContactTime?.trim()
    ? preferredContactTime.trim()
    : "Not specified";
  const noteLine = note?.trim() ? note.trim() : "No additional note provided.";

  return {
    subject,
    text: [
      `Hello ${recipientName},`,
      "",
      intro,
      "",
      `Name: ${senderName}`,
      `Email: ${senderEmail}`,
      `Phone: ${senderPhone}`,
      `Preferred contact time: ${preferredTimeLine}`,
      `Meeting or delivery location: ${meetingLocation}`,
      `Note: ${noteLine}`,
      "",
      `BIDBZAR ${new Date().getFullYear()}`,
    ].join("\n"),
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:#0f172a;color:#ffffff;">
              <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">BIDBZAR</p>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;">${subject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hello ${recipientName},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">${intro}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:14px;"><strong>Name:</strong> ${senderName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:14px;"><strong>Email:</strong> ${senderEmail}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:14px;"><strong>Phone:</strong> ${senderPhone}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:14px;"><strong>Preferred contact time:</strong> ${preferredTimeLine}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:14px;"><strong>Meeting or delivery location:</strong> ${meetingLocation}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:14px;"><strong>Note:</strong> ${noteLine}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}
