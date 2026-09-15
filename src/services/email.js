import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendTicketEmail({ to, name, ticketId, qrPngBuffer }) {
  const eventName = process.env.EVENT_NAME || "l'événement";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your Ticket for ${eventName}`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede0;padding:32px 16px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid rgba(182,136,79,0.35);border-radius:20px;">
              <tr>
                <td style="padding:32px 32px 0;text-align:center;">
                  <p style="margin:0;color:#b6884f;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">${eventName}</p>
                  <h1 style="margin:8px 0 0;color:#33402c;font-size:22px;font-family:Georgia,'Times New Roman',serif;font-weight:700;">Your Ticket is Ready 🎟️</h1>
                  <div style="width:56px;height:1px;background:#b6884f;margin:18px auto 0;opacity:0.7;"></div>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 32px 0;color:#33402c;font-size:15px;line-height:1.65;">
                  <p style="margin:0 0 14px;">Dear ${name || "there"},</p>
                  <p style="margin:0 0 14px;">Thank you for joining our table at <strong>${eventName}</strong>!</p>
                  <p style="margin:0 0 14px;">We are delighted to have you with us for this special experience celebrating Cameroonian flavors, culture, music, and connection.</p>
                  <p style="margin:0 0 14px;">We can’t wait to welcome you under the Baobab for an afternoon filled with delicious food, good vibes, and wonderful people.</p>
                  <p style="margin:0;">Please find the menu attached to this message. You can save the date in your calendar as well. Present the QR code at the door.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 32px 0;" align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#f4ede0;border:1px solid rgba(182,136,79,0.4);border-radius:16px;padding:20px;" align="center">
                        <img src="cid:ticket-qr" width="200" height="200" alt="Ticket QR code" style="display:block;width:200px;height:200px;border-radius:8px;" />
                      </td>
                    </tr>
                  </table>
                  <p style="margin:14px 0 0;color:#6b6355;font-size:12px;letter-spacing:0.5px;">Ticket reference: ${ticketId}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 32px 32px;color:#33402c;font-size:15px;line-height:1.65;">
                  <p style="margin:0 0 14px;">We hope you’ll enjoy discovering the flavors we’ve carefully prepared for you.</p>
                  <p style="margin:0 0 14px;">October 3rd, 2026 from 1pm to 5pm.</p>
                  <p style="margin:0;">See you soon under the Baobab!</p>
                </td>
              </tr>
              <tr>
                <td style="background:#ece1cd;border-radius:0 0 19px 19px;padding:16px 32px;text-align:center;">
                  <p style="margin:0;color:#6b6355;font-size:10.5px;letter-spacing:2px;">FOOD • CULTURE • CONNECTION</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    attachments: [
      {
        filename: "billet-qrcode.png",
        content: qrPngBuffer,
        cid: "ticket-qr",
      },
    ],
  });
}
