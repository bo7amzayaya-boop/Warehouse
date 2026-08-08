import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Package,
  Calendar,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Material, Movement, Category, Project, SystemSettings } from '../types';
import { exportToPDF } from '../utils/pdfExporter';

interface ReportsPageProps {
  materials: Material[];
  movements: Movement[];
  categories: Category[];
  projects: Project[];
  settings: SystemSettings;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  materials,
  movements,
  categories,
  projects,
  settings
}) => {
  const [reportType, setReportType] = useState<'inventory_val' | 'movements_summary' | 'low_stock' | 'fast_slow'>('inventory_val');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'month' | 'year'>('month');

  // Total valuation calculation
  const totalValuation = materials.reduce((acc, m) => {
    const cost = m.avgCost || m.purchasePrice || 0;
    return acc + (cost * m.currentQuantity);
  }, 0);

  // Fast moving vs Slow moving calculation
  const materialUsageMap: { [matId: string]: number } = {};
  movements.filter(m => m.type === 'withdrawal').forEach(m => {
    materialUsageMap[m.materialId] = (materialUsageMap[m.materialId] || 0) + m.quantity;
  });

  const sortedByUsage = [...materials].sort((a, b) => {
    const usageA = materialUsageMap[a.id] || 0;
    const usageB = materialUsageMap[b.id] || 0;
    return usageB - usageA;
  });

  const fastMoving = sortedByUsage.slice(0, 5);
  const slowMoving = sortedByUsage.slice(-5).reverse();

  // Export excel handler
  const exportReportExcel = () => {
    let exportData: any[] = [];
    let fileName = 'تقرير_المستودع.xlsx';

    if (reportType === 'inventory_val') {
      fileName = 'تقرير_تقييم_المخزون.xlsx';
      exportData = materials.map(m => ({
        'كود المادة': m.code,
        'الباركوود': m.barcode,
        'اسم المادة': m.nameAr,
        'القسم': m.categoryName,
        'الرصيد الحالي': m.currentQuantity,
        'وحدة القياس': m.unit,
        'سعر الشراء / متوسط التكلفة': m.avgCost || m.purchasePrice || 0,
        'القيمة الإجمالية الصافية': (m.currentQuantity * (m.avgCost || m.purchasePrice || 0)),
        'الموقع': m.location || 'عام',
      }));
    } else if (reportType === 'low_stock') {
      fileName = 'تقرير_حد_الكفاية_الأدنى.xlsx';
      exportData = materials.filter(m => m.status !== 'in_stock').map(m => ({
        'كود المادة': m.code,
        'اسم المادة': m.nameAr,
        'القسم': m.categoryName,
        'الرصيد المتاح': m.currentQuantity,
        'حد الكفاية الأدنى': m.minQuantity,
        'الحالة': m.status === 'low_stock' ? 'منخفض' : 'نفد',
      }));
    } else {
      fileName = 'تقرير_سجل_الحركات.xlsx';
      exportData = movements.map(m => ({
        'نوع الحركة': m.type === 'incoming' ? 'توريد' : 'صرف',
        'اسم المادة': m.materialName,
        'كود المادة': m.materialCode,
        'الكمية': m.quantity,
        'المستخدم': m.userName,
        'المشروع / الجهة': m.projectName || m.department || 'عام',
        'التاريخ': m.dateStr,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير المخزني');
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>التقارير التحليلية والشاملة لمستودع الخيال</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تقارير القيمة المالية الإجمالية للمخزون، تحليلات الاستهلاك، والمواد الأكثر والأقل حركة
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={exportReportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير إكسيل</span>
          </button>
          <button
            onClick={() => exportToPDF('printable-report-content', { filename: `تقرير_المستودع_${reportType}.pdf`, landscape: true })}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>
        </div>
      </div>

      {/* Report Types Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <button
          onClick={() => setReportType('inventory_val')}
          className={`p-4 rounded-2xl border text-right transition-all font-bold text-xs flex flex-col justify-between space-y-2 ${
            reportType === 'inventory_val'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span>تقييم القيمة المالية الإجمالية للمخزون</span>
        </button>

        <button
          onClick={() => setReportType('low_stock')}
          className={`p-4 rounded-2xl border text-right transition-all font-bold text-xs flex flex-col justify-between space-y-2 ${
            reportType === 'low_stock'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span>تقرير النواقص وحد الكفاية الأدنى</span>
        </button>

        <button
          onClick={() => setReportType('fast_slow')}
          className={`p-4 rounded-2xl border text-right transition-all font-bold text-xs flex flex-col justify-between space-y-2 ${
            reportType === 'fast_slow'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>تحليل معدل الحركة (أسرع وأبطأ الأصناف)</span>
        </button>

        <button
          onClick={() => setReportType('movements_summary')}
          className={`p-4 rounded-2xl border text-right transition-all font-bold text-xs flex flex-col justify-between space-y-2 ${
            reportType === 'movements_summary'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>تقرير حركات التوريد والصرف الشامل</span>
        </button>
      </div>

      {/* Report Content Panel */}
      <div id="printable-report-content" className="space-y-4">
        {/* Printable Header Banner */}
        <div className="p-4 bg-slate-50 text-slate-900 rounded-2xl border border-slate-300 flex justify-between items-center">
          <div>
            <h2 className="text-base font-black leading-tight text-slate-900">
              {reportType === 'inventory_val' && 'تقرير القيمة المالية الإجمالية للمخزون'}
              {reportType === 'low_stock' && 'تقرير نواقص المخزون وحد الكفاية الأدنى'}
              {reportType === 'fast_slow' && 'تحليل معدل حركة الأصناف (الأسرع والأبطأ)'}
              {reportType === 'movements_summary' && 'تقرير حركات التوريد والصرف الشامل'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG')} - {new Date().toLocaleTimeString('ar-EG')}
            </p>
          </div>
          <div className="text-left font-mono">
            <span className="text-xs font-bold text-indigo-700 block">{settings.companyName}</span>
            <span className="text-[10px] text-slate-500">التقرير التحليلي الشامل</span>
          </div>
        </div>

      {reportType === 'inventory_val' && (
        <div className="space-y-4">
          <div className="p-5 bg-white text-slate-900 rounded-2xl border border-slate-300 flex justify-between items-center shadow-xs">
            <div>
              <span className="text-xs text-indigo-700 font-bold block">القيمة المالية الإجمالية الصافية لجميع محتويات المستودع</span>
              <h3 className="text-3xl font-black mt-1 font-mono text-emerald-700">
                {totalValuation.toLocaleString()} {settings.defaultCurrency}
              </h3>
            </div>
            <div className="text-left text-xs text-slate-600 font-bold">
              <span>إجمالي عدد الأصناف: {materials.length} صنف</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">الكود</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">القسم</th>
                    <th className="p-3">الرصيد الحالي</th>
                    <th className="p-3">متوسط سعر التكلفة</th>
                    <th className="p-3">إجمالي قيمة الصنف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                  {materials.map(m => {
                    const cost = m.avgCost || m.purchasePrice || 0;
                    const itemVal = cost * m.currentQuantity;
                    return (
                      <tr key={m.id}>
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{m.code}</td>
                        <td className="p-3 font-extrabold text-slate-800 dark:text-white">{m.nameAr}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{m.categoryName}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{m.currentQuantity} {m.unit}</td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{cost} {settings.defaultCurrency}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{itemVal.toLocaleString()} {settings.defaultCurrency}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === 'low_stock' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 font-bold text-xs text-amber-900 dark:text-amber-200">
            قائمة المواد التي وصلت إلى حد الكفاية الأدنى أو انتهت بالكامل ويجب طلب شحنات جديدة لها
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">كود المادة</th>
                  <th className="p-3">اسم المادة</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">الرصيد المتاح</th>
                  <th className="p-3">حد الكفاية الأدنى</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                {materials.filter(m => m.status !== 'in_stock').map(m => (
                  <tr key={m.id}>
                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{m.code}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-white">{m.nameAr}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{m.categoryName}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{m.currentQuantity} {m.unit}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{m.minQuantity} {m.unit}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        m.status === 'low_stock' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {m.status === 'low_stock' ? 'حد الكفاية الأدنى' : 'نفد بالكامل'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'fast_slow' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fast Moving */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
              <span>الأصناف الأكثر حراكاً وسحباً (Top Fast-Moving)</span>
            </h3>
            <div className="space-y-3">
              {fastMoving.map(m => {
                const usedQty = materialUsageMap[m.id] || 0;
                return (
                  <div key={m.id} className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{m.nameAr}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{m.code}</span>
                    </div>
                    <span className="font-black text-emerald-700 dark:text-emerald-300">
                      إجمالي المسحوب: {usedQty} {m.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slow Moving */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2 text-amber-600">
              <TrendingUp className="w-5 h-5 rotate-180" />
              <span>الأصناف الأبطأ حركة وركوداً (Slow-Moving)</span>
            </h3>
            <div className="space-y-3">
              {slowMoving.map(m => {
                const usedQty = materialUsageMap[m.id] || 0;
                return (
                  <div key={m.id} className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{m.nameAr}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{m.code}</span>
                    </div>
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      إجمالي المسحوب: {usedQty} {m.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {reportType === 'movements_summary' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">المادة</th>
                  <th className="p-3">الكمية</th>
                  <th className="p-3">المستلم / المورد</th>
                  <th className="p-3">المسؤول</th>
                  <th className="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                {movements.map(m => (
                  <tr key={m.id}>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        m.type === 'incoming' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {m.type === 'incoming' ? 'توريد' : 'صرف'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-white">{m.materialName}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{m.quantity}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{m.projectName || m.department || m.supplierName || 'عام'}</td>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{m.userName}</td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{m.dateStr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
