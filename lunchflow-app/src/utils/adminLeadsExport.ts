import { Alert, Platform } from 'react-native';

export type LeadExportRow = {
  name: string;
  phone: string;
  status: string;
  telecaller: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLeadsHtml(title: string, rows: LeadExportRow[]): string {
  const generatedAt = new Date().toLocaleString('en-IN');
  const bodyRows = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.phone)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.telecaller)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #2d1f33; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p { font-size: 12px; color: #6b5b73; margin: 0 0 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e8dde9; padding: 10px 12px; text-align: left; font-size: 13px; }
      th { background: #faf7fb; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; color: #6b5b73; }
      tr:nth-child(even) td { background: #fcfafc; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated on ${escapeHtml(generatedAt)}</p>
    <table>
      <thead>
        <tr><th>Name</th><th>Phone</th><th>Status</th><th>Telecaller</th></tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>`;
}

function openPrintableWindow(html: string): Window | null {
  if (typeof window === 'undefined') return null;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return printWindow;
}

function printHtmlDocument(html: string, action: string): void {
  if (typeof document === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', action);
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    document.body.removeChild(iframe);
    Alert.alert(action, 'Could not open print preview.');
    return;
  }

  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  };

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const runPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      Alert.alert(action, 'Could not open the print dialog.');
      cleanup();
      return;
    }

    if ('onafterprint' in frameWindow) {
      frameWindow.onafterprint = cleanup;
      setTimeout(cleanup, 2000);
      return;
    }

    setTimeout(cleanup, 1000);
  };

  setTimeout(runPrint, 300);
}

function webOnly(action: string): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return true;
  Alert.alert(action, `${action} is available on the web admin portal.`);
  return false;
}

export function printLeadsTable(title: string, rows: LeadExportRow[]): void {
  if (!webOnly('Print')) return;
  if (rows.length === 0) {
    Alert.alert('Print', 'No leads to print.');
    return;
  }

  const html = buildLeadsHtml(title, rows);
  if (typeof document !== 'undefined') {
    printHtmlDocument(html, 'Print');
    return;
  }

  const printWindow = openPrintableWindow(html);
  if (!printWindow) {
    Alert.alert('Print', 'Allow pop-ups to print this table.');
    return;
  }

  const runPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === 'complete') {
    setTimeout(runPrint, 250);
  } else {
    printWindow.onload = () => setTimeout(runPrint, 100);
  }
}

export function downloadLeadsPdf(title: string, rows: LeadExportRow[]): void {
  if (!webOnly('PDF')) return;
  if (rows.length === 0) {
    Alert.alert('PDF', 'No leads to export.');
    return;
  }
  if (typeof document === 'undefined') return;

  const html = buildLeadsHtml(title, rows);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lunchflow-recent-leads-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
