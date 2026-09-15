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
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>YOUR TICKET IS READY 🎟️</h2>
        <p>Dear ${name || ""},</p>
        <p>Thank you for joining our table at <strong>${eventName}</strong>!</p>
        <p>We are delighted to have you with us for this special experience celebrating Cameroonian flavors, culture, music, and connection.</p>
        <p>We can’t wait to welcome you under the Baobab for an afternoon filled with delicious food, good vibes, and wonderful people.</p>
        <p>Please find the menu attached to this message. You can save the date in your calendar as well. Present the QR-Code at the door.</p>
        <img src="cid:ticket-qr" alt="QR code du billet" style="width:220px;height:220px;" />
        <p style="color:#666;font-size:12px;">Référence billet : ${ticketId}</p>
        <p>We hope you’ll enjoy discovering the flavors we’ve carefully prepared for you.</p>
        <p>October 3rd, 2026 from 1pm to 5pm.</p>
        <p>See you soon under the Baobab!</p>
      </div>
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
