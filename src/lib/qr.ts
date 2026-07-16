import QRCode from 'qrcode';

/** Render a QR code for a URL as a PNG data URL (embeddable in HTML/posters). */
export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 400 });
}
