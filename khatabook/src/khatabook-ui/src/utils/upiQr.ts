import QRCode from 'qrcode';

export interface UpiQrOptions {
  vpa: string;
  payeeName: string;
  amount: number;
  transactionRef?: string;
  note?: string;
}

export function buildUpiPaymentUri(options: UpiQrOptions): string {
  const cleanVpa = options.vpa.trim();
  const cleanPayee = encodeURIComponent(options.payeeName.trim());
  const cleanAmount = options.amount.toFixed(2);
  const cleanRef = options.transactionRef ? encodeURIComponent(options.transactionRef.trim()) : '';
  const cleanNote = options.note ? encodeURIComponent(options.note.trim()) : encodeURIComponent('Bill Payment');

  return `upi://pay?pa=${cleanVpa}&pn=${cleanPayee}&am=${cleanAmount}&tr=${cleanRef}&tn=${cleanNote}&cu=INR`;
}

export async function generateUpiQrDataUrl(options: UpiQrOptions, size: number = 200): Promise<string> {
  const uri = buildUpiPaymentUri(options);
  try {
    return await QRCode.toDataURL(uri, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate UPI QR code', err);
    return '';
  }
}
