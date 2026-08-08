import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PDFExportOptions {
  filename?: string;
  landscape?: boolean;
}

function parseValue(val: string | undefined, maxPercent: number): number {
  if (!val || val === 'none') return 0;
  if (val.endsWith('%')) {
    return (parseFloat(val) / 100) * maxPercent;
  }
  if (val.endsWith('deg')) {
    return parseFloat(val);
  }
  return parseFloat(val);
}

function oklchToRgb(oklchStr: string): string {
  try {
    const match = oklchStr.match(/oklch\(\s*([^)]+)\s*\)/i);
    if (!match) return 'rgb(0,0,0)';

    const content = match[1].trim();
    const parts = content.split('/');
    const colorParts = parts[0].trim().split(/\s+/);
    const alphaPart = parts[1] ? parts[1].trim() : null;

    let L = parseValue(colorParts[0], 1);
    let C = parseValue(colorParts[1], 1);
    let H = parseValue(colorParts[2], 360);

    let A = 1;
    if (alphaPart) {
      A = parseValue(alphaPart, 1);
    }

    if (isNaN(L)) L = 0;
    if (isNaN(C)) C = 0;
    if (isNaN(H)) H = 0;

    const rad = (H * Math.PI) / 180;
    const a = C * Math.cos(rad);
    const b = C * Math.sin(rad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const gamma = (x: number) => {
      if (x <= 0) return 0;
      if (x >= 1) return 255;
      return x <= 0.0031308
        ? Math.round(255 * (12.92 * x))
        : Math.round(255 * (1.055 * Math.pow(x, 1 / 2.4) - 0.055));
    };

    const R = gamma(rLin);
    const G = gamma(gLin);
    const B = gamma(bLin);

    if (A < 1) {
      return `rgba(${R}, ${G}, ${B}, ${A})`;
    }
    return `rgb(${R}, ${G}, ${B})`;
  } catch {
    return 'rgb(0,0,0)';
  }
}

function oklabToRgb(oklabStr: string): string {
  try {
    const match = oklabStr.match(/oklab\(\s*([^)]+)\s*\)/i);
    if (!match) return 'rgb(0,0,0)';

    const content = match[1].trim();
    const parts = content.split('/');
    const colorParts = parts[0].trim().split(/\s+/);
    const alphaPart = parts[1] ? parts[1].trim() : null;

    let L = parseValue(colorParts[0], 1);
    let a = parseValue(colorParts[1], 1);
    let b = parseValue(colorParts[2], 1);

    let A = 1;
    if (alphaPart) {
      A = parseValue(alphaPart, 1);
    }

    if (isNaN(L)) L = 0;
    if (isNaN(a)) a = 0;
    if (isNaN(b)) b = 0;

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const gamma = (x: number) => {
      if (x <= 0) return 0;
      if (x >= 1) return 255;
      return x <= 0.0031308
        ? Math.round(255 * (12.92 * x))
        : Math.round(255 * (1.055 * Math.pow(x, 1 / 2.4) - 0.055));
    };

    const R = gamma(rLin);
    const G = gamma(gLin);
    const B = gamma(bLin);

    if (A < 1) {
      return `rgba(${R}, ${G}, ${B}, ${A})`;
    }
    return `rgb(${R}, ${G}, ${B})`;
  } catch {
    return 'rgb(0,0,0)';
  }
}

/**
 * Replaces modern color functions (oklch, oklab, color-mix, light-dark, color)
 * in any string by balancing parentheses to handle nested expressions properly.
 */
function replaceModernColorsInText(text: string): string {
  if (!text) return text;

  const colorFuncNames = ['oklch', 'oklab', 'color-mix', 'light-dark', 'color'];
  let result = text;

  for (const fnName of colorFuncNames) {
    let index = 0;
    while ((index = result.toLowerCase().indexOf(fnName + '(', index)) !== -1) {
      let depth = 0;
      const start = index;
      let end = -1;

      for (let i = start + fnName.length; i < result.length; i++) {
        if (result[i] === '(') depth++;
        else if (result[i] === ')') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }

      if (end !== -1) {
        const fullExpr = result.substring(start, end + 1);
        let replacement = 'rgb(0,0,0)';

        if (fnName === 'oklch') {
          replacement = oklchToRgb(fullExpr);
        } else if (fnName === 'oklab') {
          replacement = oklabToRgb(fullExpr);
        } else {
          replacement = 'rgb(0,0,0)';
        }

        result = result.substring(0, start) + replacement + result.substring(end + 1);
        index = start + replacement.length;
      } else {
        index += fnName.length;
      }
    }
  }

  return result;
}

function sanitizeDocForHtml2Canvas(clonedDoc: Document) {
  // 1. Convert <link rel="stylesheet"> elements into inline <style> tags with sanitized rules
  const linkElements = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of linkElements) {
    try {
      const sheet = (link as HTMLLinkElement).sheet;
      if (sheet) {
        let cssText = '';
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        for (const rule of rules) {
          cssText += rule.cssText + '\n';
        }
        if (cssText) {
          const newStyle = clonedDoc.createElement('style');
          newStyle.textContent = replaceModernColorsInText(cssText);
          link.parentNode?.replaceChild(newStyle, link);
        }
      }
    } catch {
      // Ignore cross-origin link errors
    }
  }

  // 2. Process all <style> elements textContent
  const styleElements = Array.from(clonedDoc.querySelectorAll('style'));
  styleElements.forEach((styleEl) => {
    if (styleEl.textContent) {
      styleEl.textContent = replaceModernColorsInText(styleEl.textContent);
    }
  });

  // 3. Process all styleSheets cssRules in clonedDoc
  try {
    const sheets = Array.from(clonedDoc.styleSheets);
    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        for (let i = rules.length - 1; i >= 0; i--) {
          const rule = rules[i];
          if (
            rule.cssText &&
            (rule.cssText.includes('oklch') ||
              rule.cssText.includes('oklab') ||
              rule.cssText.includes('color-mix') ||
              rule.cssText.includes('light-dark'))
          ) {
            const sanitizedRuleText = replaceModernColorsInText(rule.cssText);
            try {
              sheet.deleteRule(i);
              sheet.insertRule(sanitizedRuleText, i);
            } catch {
              // Fallback if rule cannot be re-inserted
            }
          }
        }
      } catch {
        // Cross-origin stylesheet
      }
    }
  } catch {
    // Ignore stylesheet iteration errors
  }

  // 4. Process all element inline styles
  const allElements = Array.from(clonedDoc.querySelectorAll('*'));
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style && htmlEl.style.cssText) {
      if (
        htmlEl.style.cssText.includes('oklch') ||
        htmlEl.style.cssText.includes('oklab') ||
        htmlEl.style.cssText.includes('color-mix')
      ) {
        htmlEl.style.cssText = replaceModernColorsInText(htmlEl.style.cssText);
      }
    }
  });

  // 5. Monkey patch getComputedStyle in cloned window
  const win = clonedDoc.defaultView;
  if (win && win.getComputedStyle) {
    const origGetComputedStyle = win.getComputedStyle.bind(win);
    win.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
      const style = origGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);
          if (
            typeof value === 'string' &&
            (value.includes('oklch') ||
              value.includes('oklab') ||
              value.includes('color-mix') ||
              value.includes('light-dark'))
          ) {
            return replaceModernColorsInText(value);
          }
          if (typeof value === 'function' && prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (
                val &&
                (val.includes('oklch') ||
                  val.includes('oklab') ||
                  val.includes('color-mix') ||
                  val.includes('light-dark'))
              ) {
                return replaceModernColorsInText(val);
              }
              return val;
            };
          }
          return value;
        },
      });
    };
  }
}

export async function exportToPDF(
  elementOrId: HTMLElement | string,
  options: PDFExportOptions = {}
): Promise<void> {
  try {
    let element: HTMLElement | null = null;
    if (typeof elementOrId === 'string') {
      element = document.getElementById(elementOrId);
    } else {
      element = elementOrId;
    }

    if (!element) {
      console.error('Target element not found for PDF export');
      alert('لم يتم العثور على العنصر المطلوب تصديره إلى PDF');
      return;
    }

    // Capture element into canvas with high scale for clear Arabic text rendering
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution output
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) => el.classList.contains('no-print'),
      onclone: (clonedDoc) => {
        // 1. Strip dark class from html, body, and all elements to force clean light PDF rendering
        clonedDoc.documentElement.classList.remove('dark');
        clonedDoc.body.classList.remove('dark');
        const darkElements = Array.from(clonedDoc.querySelectorAll('.dark'));
        darkElements.forEach((el) => el.classList.remove('dark'));

        // 2. Inject print CSS override block into head
        const printStyle = clonedDoc.createElement('style');
        printStyle.textContent = `
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
          #printable-requisition-document,
          #printable-saved-req-doc,
          #printable-report-content,
          #printable-materials-container,
          #printable-movements-table,
          #printable-receipt-card,
          #printable-barcode-card {
            background-color: #ffffff !important;
            color: #0f172a !important;
            width: 794px !important; /* Standard A4 width at 96 DPI */
            margin: 0 auto !important;
            padding: 32px !important;
            box-sizing: border-box !important;
          }
          /* Print tables default style */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
        `;
        clonedDoc.head.appendChild(printStyle);

        sanitizeDocForHtml2Canvas(clonedDoc);

        let clonedEl: HTMLElement | null = null;
        if (typeof elementOrId === 'string') {
          clonedEl = clonedDoc.getElementById(elementOrId);
        } else if (elementOrId.id) {
          clonedEl = clonedDoc.getElementById(elementOrId.id);
        }
        
        if (clonedEl) {
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.color = '#0f172a';
        }
      },
    });

    const isLandscape = options.landscape || false;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const margin = 10; // 10mm margins
    const printableWidth = pdfWidth - (margin * 2);
    const pageHeight = pdfHeight - (margin * 2);

    let imgWidth = printableWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/png', 1.0);

    // If document is slightly longer than 1 page (up to 20% longer), auto-scale down to fit neatly on 1 page
    if (imgHeight > pageHeight && imgHeight <= pageHeight * 1.25) {
      const scaleFactor = pageHeight / imgHeight;
      imgHeight = pageHeight;
      imgWidth = printableWidth * scaleFactor;
    }

    const xPos = margin + (printableWidth - imgWidth) / 2;

    if (imgHeight <= pageHeight) {
      // Fit completely on single page
      pdf.addImage(imgData, 'PNG', xPos, margin, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // Multi-page document
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', xPos, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      let pageNum = 1;
      while (heightLeft > 5) {
        position = position - pageHeight;
        pdf.addPage();
        pageNum++;
        pdf.addImage(imgData, 'PNG', xPos, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Add page numbering at footer
      const totalPages = pageNum;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `صفحة ${i} من ${totalPages}`,
          pdfWidth / 2,
          pdfHeight - 4,
          { align: 'center' }
        );
      }
    }

    const outputName = options.filename
      ? options.filename.endsWith('.pdf')
        ? options.filename
        : `${options.filename}.pdf`
      : `document_${Date.now()}.pdf`;

    pdf.save(outputName);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('حدث خطأ أثناء إنشاء ملف PDF');
  }
}
