import { Platform, Share } from 'react-native';
import { DeliveryHistoryEntry } from './deliveryHistoryService';

function parseAmount(price: string): number {
  const digits = price.replace(/[^\d.]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function buildMonthlyInvoiceText(
  entries: DeliveryHistoryEntry[],
  customerName: string,
  customerPhone: string,
): string {
  const delivered = entries.filter((entry) => entry.status === 'Delivered');
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const invoiceNo = `LF-INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${customerPhone.slice(-4)}`;

  const lines = [
    'LUNCHFLOW — DELIVERY INVOICE',
    '================================',
    `Invoice No: ${invoiceNo}`,
    `Period: ${monthLabel}`,
    `Customer: ${customerName}`,
    `Phone: +91 ${customerPhone}`,
    '',
    'Deliveries',
    '--------------------------------',
  ];

  if (delivered.length === 0) {
    lines.push('No delivered orders this month.');
  } else {
    delivered.forEach((entry, index) => {
      const destination = entry.destinationAddress
        ? `${entry.destinationName}, ${entry.destinationAddress}`
        : entry.destinationName;
      lines.push(
        `${index + 1}. ${entry.date} | ${entry.time}`,
        `   ${destination}`,
        `   Amount: ${entry.price}`,
        '',
      );
    });

    const total = delivered.reduce((sum, entry) => sum + parseAmount(entry.price), 0);
    lines.push('--------------------------------');
    lines.push(`Total (${delivered.length} deliveries): ${formatInr(total)}`);
  }

  lines.push('', 'Thank you for using LunchFlow.');
  return lines.join('\n');
}

export type InvoiceDownloadResult = 'downloaded' | 'shared' | 'empty' | 'failed';

export async function downloadMonthlyInvoice(
  entries: DeliveryHistoryEntry[],
  customerName: string,
  customerPhone: string,
): Promise<InvoiceDownloadResult> {
  const delivered = entries.filter((entry) => entry.status === 'Delivered');
  if (delivered.length === 0) return 'empty';

  const text = buildMonthlyInvoiceText(entries, customerName, customerPhone);
  const filename = `lunchflow-invoice-${new Date().toISOString().slice(0, 10)}.txt`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }

  try {
    await Share.share({
      title: 'LunchFlow Invoice',
      message: text,
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}
