import React from 'react';
import { Download, CheckCircle2, Building2 } from 'lucide-react';
import { Movement, SystemSettings } from '../types';
import { exportToPDF } from '../utils/pdfExporter';

interface PrintReceiptProps {
  movement: Movement;
  settings?: SystemSettings;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ movement, settings }) => {
  const isIncoming = movement.type === 'incoming';

  const handleExportPDF = () => {
    exportToPDF('printable-receipt-card', {
      filename: `سند_${isIncoming ? 'توريد' : 'صرف'}_${movement.id.slice(0, 8)}.pdf`
    });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-slate-900 max-w-lg mx-auto print-card space-y-6">
      <div id="printable-receipt-card" className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            {settings?.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="شعار الشركة"
                className="w-10 h-10 object-contain rounded-lg shrink-0 border border-slate-200 p-0.5 bg-white"
              />
            )}
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {settings?.companyName || 'مؤسسة الخيال للطباعة والإعلان'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {settings?.address || 'الرياض - المنطقة الصناعية'} | هاتف: {settings?.phone || '0500000000'}
              </p>
            </div>
          </div>
          <div className="text-left">
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-lg ${
              isIncoming ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isIncoming ? 'إذن إدخال مخزني (توريد)' : 'إذن صرف مخزني (خروج)'}
            </span>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              رقم الحركة: #{movement.id.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Movement Details */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div>
            <span className="text-slate-400 block mb-0.5">التاريخ والوقت</span>
            <span className="font-bold text-slate-800">{movement.dateStr} - {new Date(movement.timestamp).toLocaleTimeString('ar-EG')}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">المسؤول / أمين المستودع</span>
            <span className="font-bold text-slate-800">{movement.userName} ({movement.userRole})</span>
          </div>
          {isIncoming ? (
            <>
              <div>
                <span className="text-slate-400 block mb-0.5">المورد</span>
                <span className="font-bold text-slate-800">{movement.supplierName || 'غير محدد'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">رقم الفاتورة</span>
                <span className="font-mono font-bold text-slate-800">{movement.invoiceNumber || 'بدون'}</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-slate-400 block mb-0.5">المشروع / الجهة</span>
                <span className="font-bold text-slate-800">{movement.projectName || movement.department || 'صرف عام'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">سبب الصرف</span>
                <span className="font-bold text-slate-800">{movement.reason || 'تشغيل المطبعة'}</span>
              </div>
            </>
          )}
        </div>

        {/* Material Table */}
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-2">كود المادة</th>
              <th className="p-2">اسم المادة</th>
              <th className="p-2 text-center">الكمية</th>
              <th className="p-2 text-left">التكلفة الإجمالية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            <tr>
              <td className="p-2 font-mono">{movement.materialCode}</td>
              <td className="p-2 font-bold">{movement.materialName}</td>
              <td className="p-2 text-center font-bold">{movement.quantity}</td>
              <td className="p-2 text-left font-mono font-bold">
                {movement.totalCost ? `${movement.totalCost.toLocaleString()} ${settings?.defaultCurrency || 'ر.س'}` : '-'}
              </td>
            </tr>
          </tbody>
        </table>

        {movement.notes && (
          <div className="text-xs bg-amber-50 p-3 rounded-lg border border-amber-100">
            <span className="font-bold text-amber-800">ملاحظات: </span>
            <span className="text-amber-900">{movement.notes}</span>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-8 border-t border-slate-200 text-center">
          <div>
            <p className="font-bold text-slate-700 mb-8">توقيع المستلم / الجهة الطالبة</p>
            <div className="border-b border-dashed border-slate-300 w-36 mx-auto" />
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-8">توقيع أمين المستودع</p>
            <div className="border-b border-dashed border-slate-300 w-36 mx-auto" />
          </div>
        </div>
      </div>

      <div className="no-print pt-4 flex justify-center">
        <button
          onClick={handleExportPDF}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <Download className="w-4 h-4" />
          تصدير السند (PDF)
        </button>
      </div>
    </div>
  );
};
