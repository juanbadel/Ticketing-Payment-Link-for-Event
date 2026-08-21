import QRCode from "qrcode";

export async function generateTicketQrPng(ticketId) {
  return QRCode.toBuffer(ticketId, {
    errorCorrectionLevel: "M",
    width: 500,
    margin: 2,
  });
}
