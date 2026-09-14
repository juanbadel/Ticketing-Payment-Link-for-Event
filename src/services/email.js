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
    subject: `Ton billet pour ${eventName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Ton billet est prêt 🎟️</h2>
        <p>Bonjour ${name || ""},</p>
        <p>Merci pour ton achat. Voici ton billet pour <strong>${eventName}</strong>.</p>
        <p>Présente ce QR code à l'entrée (sur papier ou depuis ton téléphone) :</p>
        <img src="cid:ticket-qr" alt="QR code du billet" style="width:220px;height:220px;" />
        <p style="color:#666;font-size:12px;">Référence billet : ${ticketId}</p>
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
