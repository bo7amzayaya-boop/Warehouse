export interface PrintOptions {
  title?: string;
  landscape?: boolean;
}

export function printElement(elementOrId: HTMLElement | string, options: PrintOptions = {}): void {
  const title = options.title || 'طباعة المستند';
  let element: HTMLElement | null = null;

  if (typeof elementOrId === 'string') {
    element = document.getElementById(elementOrId);
  } else {
    element = elementOrId;
  }

  if (!element) {
    console.warn('Print target element not found, falling back to window.print()');
    window.print();
    return;
  }

  const contentHtml = element.outerHTML;
  printHTML(contentHtml, options);
}

export function printHTML(contentHtml: string, options: PrintOptions = {}): void {
  const title = options.title || 'طباعة - مستودع الخيال';
  const landscape = options.landscape ? true : false;

  // Remove any previous print iframe
  const existingIframe = document.getElementById('app-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create a hidden printing iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'app-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = '0px';
  iframe.style.zIndex = '-9999';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page {
          size: ${landscape ? 'landscape' : 'auto'};
          margin: 10mm;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box;
        }
        body {
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          direction: rtl;
          background-color: #ffffff !important;
          color: #000000 !important;
          margin: 0;
          padding: 16px;
        }
        .no-print, button, input, select, textarea {
          display: none !important;
        }
        .print-card {
          border: 2px solid #000000 !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          padding: 20px !important;
          margin: 0 auto !important;
          max-width: 100% !important;
        }
        .print-card * {
          color: #000000 !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-top: 12px !important;
        }
        th, td {
          border: 1px solid #334155 !important;
          padding: 8px 10px !important;
          text-align: right !important;
        }
        th {
          background-color: #f1f5f9 !important;
          font-weight: 700 !important;
        }
        .bg-black {
          background-color: #000000 !important;
        }
        .bg-white {
          background-color: #ffffff !important;
        }
      </style>
    </head>
    <body>
      <div id="print-root">
        ${contentHtml}
      </div>
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Iframe print error, fallback to window.print', err);
      window.print();
    }
  }, 400);
}
