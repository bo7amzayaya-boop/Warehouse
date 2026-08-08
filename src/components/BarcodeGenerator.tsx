import React from 'react';
import { Download } from 'lucide-react';
import { Material } from '../types';
import { exportToPDF } from '../utils/pdfExporter';

interface BarcodeGeneratorProps {
  material: Material;
  companyName?: string;
}

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ material, companyName = 'مستودع الخيال للطباعة' }) => {
  const exportBarcodePDF = () => {
    exportToPDF('printable-barcode-card', {
      filename: `باركوود_${material.code || 'صنف'}.pdf`
    });
  };

  const codeString: string = String(material.barcode || material.code || '123456');

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
      <div id="printable-barcode-card" className="print-card border-2 border-slate-900 p-4 rounded-xl inline-block max-w-xs mx-auto bg-white text-slate-900">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
          {companyName}
        </div>
        <div className="text-sm font-extrabold text-slate-900 truncate mb-1">
          {material.nameAr}
        </div>
        <div className="text-xs font-mono text-slate-600 mb-2">
          الكود: {material.code}
        </div>

        {/* SVG Barcode Visual Representation */}
        <div className="flex items-center justify-center gap-1 bg-white p-2 rounded border border-slate-200 mb-2 overflow-hidden">
          {codeString.split('').map((char: string, idx: number) => {
            const num = char.charCodeAt(0);
            const w1 = (num % 3) + 1;
            const w2 = ((num + idx) % 2) + 1;
            return (
              <React.Fragment key={idx}>
                <div className="bg-black h-12" style={{ width: `${w1 * 2}px` }} />
                <div className="bg-white h-12" style={{ width: `${w2 * 2}px` }} />
              </React.Fragment>
            );
          })}
        </div>

        <div className="text-xs font-mono font-bold tracking-widest text-slate-800">
          {codeString}
        </div>

        <div className="mt-2 text-[10px] text-slate-500 flex justify-between px-2 pt-1 border-t border-slate-200">
          <span>القسم: {material.categoryName}</span>
          <span>الموقع: {material.location || 'A1'}</span>
        </div>
      </div>

      <div className="flex justify-center gap-3 no-print">
        <button
          onClick={exportBarcodePDF}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4" />
          تصدير ملصق الباركوود (PDF)
        </button>
      </div>
    </div>
  );
};
