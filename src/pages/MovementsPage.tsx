import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Calendar,
  Briefcase,
  Truck,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Boxes,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  SlidersHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Movement, SystemSettings, Project, Supplier } from '../types';
import { Modal } from '../components/Modal';
import { PrintReceipt } from '../components/PrintReceipt';
import { exportToPDF } from '../utils/pdfExporter';

interface MovementsPageProps {
  movements: Movement[];
  projects?: Project[];
  suppliers?: Supplier[];
  settings: SystemSettings;
}

export const MovementsPage: React.FC<MovementsPageProps> = ({
  movements,
  projects = [],
  suppliers = [],
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // Extract unique projects list from props and movements
  const availableProjects = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const addedNames = new Set<string>();

    if (projects) {
      projects.forEach((p) => {
        if (p.name && !addedNames.has(p.name.toLowerCase().trim())) {
          list.push({ id: p.id || p.name, name: p.name });
          addedNames.add(p.name.toLowerCase().trim());
        }
      });
    }

    movements.forEach((m) => {
      if (m.projectName && !addedNames.has(m.projectName.toLowerCase().trim())) {
        list.push({ id: m.projectId || m.projectName, name: m.projectName });
        addedNames.add(m.projectName.toLowerCase().trim());
      }
    });

    return list;
  }, [projects, movements]);

  // Extract unique suppliers list from props and movements
  const availableSuppliers = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const addedNames = new Set<string>();

    if (suppliers) {
      suppliers.forEach((s) => {
        if (s.name && !addedNames.has(s.name.toLowerCase().trim())) {
          list.push({ id: s.name, name: s.name });
          addedNames.add(s.name.toLowerCase().trim());
        }
      });
    }

    movements.forEach((m) => {
      if (m.supplierName && !addedNames.has(m.supplierName.toLowerCase().trim())) {
        list.push({ id: m.supplierName, name: m.supplierName });
        addedNames.add(m.supplierName.toLowerCase().trim());
      }
    });

    return list;
  }, [suppliers, movements]);

  // Safe date parser for movement timestamps
  const parseMovDate = (m: Movement): Date | null => {
    if (m.timestamp) {
      const d = new Date(m.timestamp);
      if (!isNaN(d.getTime())) return d;
    }
    if (m.dateStr) {
      const d = new Date(m.dateStr);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  // Filtered movements calculation
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // 1. Keyword search filter
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        m.materialName.toLowerCase().includes(term) ||
        m.materialCode.toLowerCase().includes(term) ||
        m.userName.toLowerCase().includes(term) ||
        (m.projectName && m.projectName.toLowerCase().includes(term)) ||
        (m.supplierName && m.supplierName.toLowerCase().includes(term)) ||
        (m.invoiceNumber && m.invoiceNumber.toLowerCase().includes(term)) ||
        (m.reason && m.reason.toLowerCase().includes(term)) ||
        (m.notes && m.notes.toLowerCase().includes(term));

      // 2. Type filter
      const matchesType = selectedType === 'ALL' || m.type === selectedType;

      // 3. Project filter
      const matchesProject = (() => {
        if (selectedProject === 'ALL') return true;
        if (m.projectId && m.projectId === selectedProject) return true;
        if (m.projectName && m.projectName.toLowerCase().trim() === selectedProject.toLowerCase().trim()) return true;
        return false;
      })();

      // 4. Supplier filter
      const matchesSupplier = (() => {
        if (selectedSupplier === 'ALL') return true;
        if (m.supplierName && m.supplierName.toLowerCase().trim() === selectedSupplier.toLowerCase().trim()) return true;
        return false;
      })();

      // 5. Date range filter
      const matchesDateRange = (() => {
        if (!startDate && !endDate) return true;
        const movDate = parseMovDate(m);
        if (!movDate) return true;

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (movDate < start) return false;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (movDate > end) return false;
        }

        return true;
      })();

      return matchesSearch && matchesType && matchesProject && matchesSupplier && matchesDateRange;
    });
  }, [movements, searchTerm, selectedType, selectedProject, selectedSupplier, startDate, endDate]);

  // Statistics summaries
  const totals = useMemo(() => {
    const totalQty = filteredMovements.reduce((acc, m) => acc + (m.quantity || 0), 0);
    const totalValue = filteredMovements.reduce((acc, m) => acc + (m.totalCost || 0), 0);
    return { totalQty, totalValue };
  }, [filteredMovements]);

  // Date range shortcut handler
  const setQuickDate = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (range === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (range === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (range === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Active filter count
  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (selectedType !== 'ALL' ? 1 : 0) +
    (selectedProject !== 'ALL' ? 1 : 0) +
    (selectedSupplier !== 'ALL' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedProject('ALL');
    setSelectedSupplier('ALL');
    setStartDate('');
    setEndDate('');
  };

  const exportExcel = () => {
    const exportData = filteredMovements.map((m) => ({
      'نوع الحركة': m.type === 'incoming' ? 'توريد' : m.type === 'withdrawal' ? 'صرف' : m.type === 'adjustment' ? 'تسوية' : 'نقل',
      'اسم المادة': m.materialName,
      'كود المادة': m.materialCode,
      'الكمية': m.quantity,
      'الرصيد قبل': m.beforeQuantity,
      'الرصيد بعد': m.afterQuantity,
      'التكلفة الإجمالية': m.totalCost ? `${m.totalCost} ${settings.defaultCurrency}` : '-',
      'اسم المستخدم': m.userName,
      'المشروع / الجهة': m.projectName || m.department || '-',
      'المورد': m.supplierName || '-',
      'رقم الفاتورة': m.invoiceNumber || '-',
      'السبب / الملاحظات': m.reason || m.notes || '-',
      'التاريخ والوقت': m.dateStr || (m.timestamp ? new Date(m.timestamp).toLocaleString('ar-EG') : '-'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الحركات المخزنية');
    XLSX.writeFile(wb, `سجل_الحركات_المخزنية_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <span>سجل الحركات والعمليات المخزنية</span>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              {filteredMovements.length} حركة
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            البحث المتقدم وتتبع جميع حركات التوريد والصرف والمرتبطة بالمشاريع والموردين وفترات زمنية محددة
          </p>
        </div>

        <div className="flex items-center gap-2 no-print shrink-0">
          <button
            onClick={exportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير إكسيل</span>
          </button>
          <button
            onClick={() => exportToPDF('printable-movements-table', { filename: 'سجل_حركات_المستودع.pdf', landscape: true })}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>
        </div>
      </div>

      {/* Main Filter Section */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4 no-print">
        {/* Top Row: General Search + Type + Toggle Button */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Keyword Search */}
          <div className="relative md:col-span-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المادة، كود المادة، اسم الموظف، الفاتورة، أو الملاحظات..."
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-8 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-all"
            />
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Select */}
          <div className="md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="ALL">جميع أنواع الحركات</option>
              <option value="incoming">توريد (إدخال شحنة)</option>
              <option value="withdrawal">صرف (إذن خروج)</option>
              <option value="adjustment">تسوية مخزنية</option>
              <option value="transfer">نقل موقع</option>
            </select>
          </div>

          {/* Toggle Advanced Filters */}
          <div className="md:col-span-3 flex items-center justify-end">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                activeFiltersCount > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>فلاتر متقدمة</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-indigo-600 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Card */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Project Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  <span>تصفية بالمشروع:</span>
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="ALL">جميع المشاريع</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>تصفية بالمورد / الجهة:</span>
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="ALL">جميع الموردين والجهات</option>
                  {availableSuppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>تاريخ البداية (من):</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              {/* End Date Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>تاريخ النهاية (إلى):</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>
            </div>

            {/* Quick Date Buttons & Clear All Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                <span className="text-[11px] font-bold text-slate-400 ml-1">اختصارات زمنية:</span>
                <button
                  type="button"
                  onClick={() => setQuickDate('today')}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('week')}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                >
                  آخر 7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('month')}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                >
                  هذا الشهر
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('all')}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-lg text-[11px] font-bold transition-colors"
                >
                  جميع الأوقات
                </button>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة ضبط الفلاتر</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Badges Strip */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="text-[11px] font-bold text-slate-400">الفلاتر النشطة:</span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                <span>بحث: {searchTerm}</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedType !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                <span>
                  النوع:{' '}
                  {selectedType === 'incoming'
                    ? 'توريد'
                    : selectedType === 'withdrawal'
                    ? 'صرف'
                    : selectedType === 'adjustment'
                    ? 'تسوية'
                    : 'نقل'}
                </span>
                <button onClick={() => setSelectedType('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedProject !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-lg font-bold text-[11px] border border-amber-200 dark:border-amber-800">
                <span>المشروع: {selectedProject}</span>
                <button onClick={() => setSelectedProject('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSupplier !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                <span>المورد: {selectedSupplier}</span>
                <button onClick={() => setSelectedSupplier('ALL')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 rounded-lg font-bold text-[11px] border border-purple-200 dark:border-purple-800">
                <span>
                  الفترة: {startDate || '...'} إلى {endDate || '...'}
                </span>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Summary Cards for Filtered Dataset */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400">إجمالي الحركات المفلترة</p>
            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
              {filteredMovements.length.toLocaleString()} <span className="text-xs font-normal">عملية</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400">إجمالي الكميات المتحركة</p>
            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
              {totals.totalQty.toLocaleString()} <span className="text-xs font-normal">وحدة</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400">القيمة المالية الكلية</p>
            <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
              {totals.totalValue.toLocaleString()} <span className="text-xs font-normal">{settings.defaultCurrency}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div id="printable-movements-table" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
        {/* Printable Header Banner */}
        <div className="p-4 bg-slate-50 text-slate-900 border-b border-slate-300 flex justify-between items-center">
          <div>
            <h2 className="text-base font-black leading-tight text-slate-900">سجل حركات المستودع (التوريد والصرف)</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              عدد الحركات المسجلة: {filteredMovements.length} | تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
          <div className="text-left font-mono">
            <span className="text-xs font-bold text-indigo-700 block">{settings.companyName}</span>
            <span className="text-[10px] text-slate-500">إدارة المخزون والعمليات</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-4">نوع الحركة</th>
                <th className="py-3.5 px-4">اسم الصنف / المادة</th>
                <th className="py-3.5 px-4">كود المادة</th>
                <th className="py-3.5 px-4 text-center">الكمية</th>
                <th className="py-3.5 px-4 text-center">الرصيد (قبل ← بعد)</th>
                <th className="py-3.5 px-4">التكلفة الإجمالية</th>
                <th className="py-3.5 px-4">المشروع / الجهة</th>
                <th className="py-3.5 px-4">المورد / الفاتورة</th>
                <th className="py-3.5 px-4">المسؤول</th>
                <th className="py-3.5 px-4">التاريخ والوقت</th>
                <th className="py-3.5 px-4 text-center no-print">السند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="space-y-2">
                      <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        لا توجد حركات مخزنية مطابقة للبحث والفلاتر المحددة.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={resetAllFilters}
                          className="mt-2 text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline text-xs"
                        >
                          إعادة ضبط الفلاتر لعرض جميع الحركات
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  let badgeStyle = 'bg-slate-100 text-slate-800';
                  let typeLabel = 'حركة';
                  if (mov.type === 'incoming') {
                    badgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                    typeLabel = 'توريد';
                  } else if (mov.type === 'withdrawal') {
                    badgeStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                    typeLabel = 'صرف';
                  } else if (mov.type === 'adjustment') {
                    badgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                    typeLabel = 'تسوية';
                  } else if (mov.type === 'transfer') {
                    badgeStyle = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
                    typeLabel = 'نقل';
                  }

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${badgeStyle}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {mov.materialName}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {mov.materialCode}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-slate-800 dark:text-white">
                        {mov.quantity}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500 dark:text-slate-400">
                        {mov.beforeQuantity} ← <span className="font-bold text-slate-800 dark:text-white">{mov.afterQuantity}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                        {mov.totalCost ? `${mov.totalCost.toLocaleString()} ${settings.defaultCurrency}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {mov.projectName || mov.department || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div>
                          <span>{mov.supplierName || '-'}</span>
                          {mov.invoiceNumber && (
                            <span className="block text-[10px] text-slate-400 font-mono">فاتورة: #{mov.invoiceNumber}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        {mov.userName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">
                        {mov.dateStr || (mov.timestamp ? new Date(mov.timestamp).toLocaleDateString('ar-EG') : '-')}
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <button
                          onClick={() => setSelectedMovement(mov)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          عرض السند
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Receipt Modal */}
      {selectedMovement && (
        <Modal
          isOpen={!!selectedMovement}
          onClose={() => setSelectedMovement(null)}
          title="تفاصيل سند الحركة المخزنية"
          maxWidth="max-w-xl"
        >
          <PrintReceipt movement={selectedMovement} settings={settings} />
        </Modal>
      )}
    </div>
  );
};
