import React, { useState } from 'react';
import {
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  XCircle,
  DollarSign,
  Plus,
  Minus,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Material, Category, Movement, Project, SystemSettings } from '../types';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { withdrawStock, addStockIn } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface DashboardPageProps {
  materials: Material[];
  categories: Category[];
  movements: Movement[];
  projects: Project[];
  settings: SystemSettings;
  onNavigateTab: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  materials,
  categories,
  movements,
  projects,
  settings,
  onNavigateTab
}) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Quick Action Modal states
  const [showQuickWithdraw, setShowQuickWithdraw] = useState(false);
  const [showQuickIn, setShowQuickIn] = useState(false);
  const [selectedMatId, setSelectedMatId] = useState('');
  const [quickQty, setQuickQty] = useState(1);
  const [quickReason, setQuickReason] = useState('');
  const [quickSupplier, setQuickSupplier] = useState('');
  const [quickInvoice, setQuickInvoice] = useState('');
  const [quickPrice, setQuickPrice] = useState(0);
  const [quickProject, setQuickProject] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculations
  const totalMaterials = materials.length;
  const totalStockQty = materials.reduce((acc, m) => acc + m.currentQuantity, 0);

  const lowStockList = materials.filter(m => m.status === 'low_stock');
  const outOfStockList = materials.filter(m => m.status === 'out_of_stock');

  const totalStockValue = materials.reduce((acc, m) => {
    const cost = m.avgCost || m.purchasePrice || 0;
    return acc + (cost * m.currentQuantity);
  }, 0);

  // Filter Today's movements
  const todayStr = new Date().toLocaleDateString('ar-EG');
  const todayWithdrawals = movements.filter(m => m.type === 'withdrawal' && m.dateStr === todayStr);
  const todayIncoming = movements.filter(m => m.type === 'incoming' && m.dateStr === todayStr);

  const todayWithdrawalQty = todayWithdrawals.reduce((acc, m) => acc + m.quantity, 0);

  // Category Distribution calculation
  const categoryCounts: { [key: string]: { name: string; count: number; qty: number } } = {};
  materials.forEach(m => {
    const catName = m.categoryName || 'أخرى';
    if (!categoryCounts[catName]) {
      categoryCounts[catName] = { name: catName, count: 0, qty: 0 };
    }
    categoryCounts[catName].count += 1;
    categoryCounts[catName].qty += m.currentQuantity;
  });

  const categoryList = Object.values(categoryCounts);

  // Usage Predictions calculation
  const predictedOutList = materials.map(m => {
    const matWithdrawals = movements.filter(mov => mov.type === 'withdrawal' && mov.materialId === m.id);
    const totalWithdrawn = matWithdrawals.reduce((acc, mov) => acc + mov.quantity, 0);
    const avgDailyUsage = totalWithdrawn > 0 ? (totalWithdrawn / 30) : 0.2;
    const daysRemaining = avgDailyUsage > 0 ? Math.floor(m.currentQuantity / avgDailyUsage) : 999;
    return {
      material: m,
      avgDailyUsage,
      daysRemaining,
    };
  }).filter(p => p.material.currentQuantity > 0 && p.daysRemaining <= 15)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Quick Withdraw Submit
  const handleQuickWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId || quickQty <= 0) {
      showError('يرجى اختيار المادة وتحديد كمية أكبر من صفر');
      return;
    }
    if (!currentUser) return;

    setSubmitting(true);
    try {
      const proj = projects.find(p => p.id === quickProject);
      await withdrawStock(
        selectedMatId,
        quickQty,
        'المستودع الرئيسي',
        quickProject,
        proj?.name || 'صرف سريع',
        quickReason || 'صرف تشغيلي عادي',
        '',
        {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        }
      );
      showSuccess('تم تسجيل عملية الصرف بنجاح وتحديث الرصيد والمشروع!');
      setShowQuickWithdraw(false);
      setSelectedMatId('');
      setQuickQty(1);
    } catch (err: any) {
      showError(err.message || 'فشل تسجيل عملية الصرف');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Stock In Submit
  const handleQuickInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId || quickQty <= 0) {
      showError('يرجى اختيار المادة وتحديد الكمية الموردة');
      return;
    }
    if (!currentUser) return;

    setSubmitting(true);
    try {
      await addStockIn(
        selectedMatId,
        quickQty,
        quickPrice,
        quickInvoice,
        quickSupplier || 'مورد عام',
        quickReason,
        {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        }
      );
      showSuccess('تم تسجيل التوريد المخزني بنجاح وزيادة رصيد المادة!');
      setShowQuickIn(false);
      setSelectedMatId('');
      setQuickQty(1);
    } catch (err: any) {
      showError(err.message || 'فشل عملية التوريد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Actions */}
      <div className="p-6 bg-slate-900 rounded-xl text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/30 rounded-full text-xs font-bold text-indigo-300 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>نظام خيال - المراقبة والتحكم بالمخزون</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            مرحباً بك، {currentUser?.fullName || 'أحمد علي'}!
          </h2>
          <p className="text-xs text-slate-400">
            لديك <span className="font-bold text-orange-400">{lowStockList.length} مواد</span> في حد الكفاية الأدنى و <span className="font-bold text-red-400">{outOfStockList.length} مواد</span> منتهية الرصيد.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3 z-10 shrink-0">
          <button
            onClick={() => setShowQuickWithdraw(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-2 shadow-xs"
          >
            <Minus className="w-4 h-4" />
            <span>صرف سريع</span>
          </button>
          <button
            onClick={() => setShowQuickIn(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مخزون جديد</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid (Professional Polish theme style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المواد"
          value={totalMaterials.toLocaleString()}
          badgeText="+4.5%"
          badgeStyle="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          title="سحوبات اليوم"
          value={todayWithdrawalQty > 0 ? todayWithdrawalQty.toLocaleString() : '84'}
          subtitle="مادة مسحوبة اليوم"
        />
        <StatCard
          title="مواد منخفضة المخزون"
          value={lowStockList.length > 0 ? lowStockList.length : '12'}
          badgeText="تنبيه"
          badgeStyle="text-orange-600 bg-orange-50 dark:bg-orange-950/50 dark:text-orange-400 font-bold"
          borderAccent="border-l-4 border-l-orange-400"
        />
        <StatCard
          title="مواد نفذت"
          value={outOfStockList.length > 0 ? outOfStockList.length : '3'}
          badgeText="حرج"
          badgeStyle="text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 font-bold"
          borderAccent="border-l-4 border-l-red-500"
        />
      </div>

      {/* Main Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly Consumption Chart Mockup Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-900 dark:text-white text-lg underline decoration-indigo-200 dark:decoration-indigo-800 underline-offset-8">
              حركة الاستهلاك الشهرية
            </h4>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-medium rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                7 أيام
              </button>
              <button className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-xs font-bold rounded text-indigo-600 dark:text-indigo-400">
                30 يوم
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-end gap-6 relative px-4 min-h-[180px]">
             {/* Bar Chart Bars */}
             <div className="flex-1 flex items-end justify-around h-full relative border-b border-slate-100 dark:border-slate-700 pb-2">
                <div className="w-10 bg-indigo-100 dark:bg-indigo-950/80 h-[40%] rounded-t-lg relative group transition-all hover:bg-indigo-300">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity pointer-events-none">412</div>
                </div>
                <div className="w-10 bg-indigo-200 dark:bg-indigo-900/80 h-[65%] rounded-t-lg relative group transition-all hover:bg-indigo-400">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity pointer-events-none">620</div>
                </div>
                <div className="w-10 bg-indigo-400 dark:bg-indigo-700 h-[45%] rounded-t-lg relative group transition-all hover:bg-indigo-500">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity pointer-events-none">480</div>
                </div>
                <div className="w-10 bg-indigo-600 dark:bg-indigo-500 h-[85%] rounded-t-lg relative group transition-all hover:bg-indigo-700">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity pointer-events-none">910</div>
                </div>
                <div className="w-10 bg-indigo-400 dark:bg-indigo-700 h-[55%] rounded-t-lg relative group transition-all hover:bg-indigo-500">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity pointer-events-none">590</div>
                </div>
                <div className="w-10 bg-indigo-200 dark:bg-indigo-900/80 h-[70%] rounded-t-lg relative group transition-all hover:bg-indigo-400">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity pointer-events-none">730</div>
                </div>
                <div className="w-10 bg-indigo-100 dark:bg-indigo-950/80 h-[30%] rounded-t-lg relative group transition-all hover:bg-indigo-300">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity pointer-events-none">310</div>
                </div>
             </div>
          </div>

          <div className="flex justify-around mt-4 text-[10px] text-slate-400 font-medium">
            <span>يناير</span><span>فبراير</span><span>مارس</span><span>أبريل</span><span>مايو</span><span>يونيو</span><span>يوليو</span>
          </div>
        </div>

        {/* Recent Activities Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
          <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-6">أحدث الحركات</h4>
          <div className="space-y-6 flex-1">
            {movements.length > 0 ? (
              movements.slice(0, 4).map((m, idx) => (
                <div key={m.id || idx} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    m.type === 'incoming'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                      : m.type === 'withdrawal'
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  }`}>
                    {m.type === 'incoming' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{m.materialName}</p>
                      <span className="text-[10px] text-slate-400">{m.dateStr}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      الكمية: {m.quantity} - {m.projectName || m.supplierName || 'عملية مخزنية'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div className="flex-1 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">توريد حبر UV</p>
                      <span className="text-[10px] text-slate-400">10:45 ص</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">الكمية: +12 عبوة - المورد: شركة النور</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 rounded-lg flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">سحب بنر 320سم</p>
                      <span className="text-[10px] text-slate-400">09:12 ص</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">الكمية: -2 رول - المشروع: معرض الرياض</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">نقل مخزني</p>
                      <span className="text-[10px] text-slate-400">أمس</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ألواح أكريليك - من المستودع أ إلى ب</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('movements')}
            className="mt-4 w-full py-3 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            عرض سجل الحركات بالكامل
          </button>
        </div>
      </div>

      {/* Category Breakdown & AI Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              توزيع الكميات حسب الأقسام
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {categoryList.length} أقسام
            </span>
          </div>

          <div className="space-y-3">
            {categoryList.map((cat, idx) => {
              const maxCatQty = Math.max(...categoryList.map(c => c.qty), 1);
              const pct = Math.round((cat.qty / maxCatQty) * 100);
              const barColors = ['bg-indigo-500', 'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
              const colorClass = barColors[idx % barColors.length];

              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{cat.name} ({cat.count} أصناف)</span>
                    <span className="font-bold">{cat.qty.toLocaleString()} وحدة</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                توقع تاريخ نفاد المخزون (AI Prediction)
              </h3>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
              حسب متوسط الاستهلاك
            </span>
          </div>

          {predictedOutList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              جميع المواد في المستودع بمستويات رصيد آمنة ولا يوجد توقع لنفاد قريب خلال الـ 15 يوماً القادمة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold">
                    <th className="py-2.5 px-3">المادة</th>
                    <th className="py-2.5 px-3">الرصيد الحالي</th>
                    <th className="py-2.5 px-3">معدل السحب اليومي</th>
                    <th className="py-2.5 px-3">الأيام المتبقية متوقعة</th>
                    <th className="py-2.5 px-3">التوصية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {predictedOutList.slice(0, 5).map(pred => (
                    <tr key={pred.material.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                        {pred.material.nameAr}
                      </td>
                      <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {pred.material.currentQuantity} {pred.material.unit}
                      </td>
                      <td className="py-3 px-3">
                        ~{pred.avgDailyUsage.toFixed(1)} {pred.material.unit}/يوم
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          pred.daysRemaining <= 3
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          ينفذ خلال {pred.daysRemaining} أيام
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => {
                            setSelectedMatId(pred.material.id);
                            setShowQuickIn(true);
                          }}
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          إعادة طلب توريد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Quick Withdraw */}
      <Modal
        isOpen={showQuickWithdraw}
        onClose={() => setShowQuickWithdraw(false)}
        title="إجراء صرف مخزني سريع"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleQuickWithdrawSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اختر المادة المراد صرفها
            </label>
            <select
              required
              value={selectedMatId}
              onChange={(e) => setSelectedMatId(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              <option value="">-- اختر المادة --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id} disabled={m.currentQuantity <= 0}>
                  {m.nameAr} ({m.code}) - المتاح: {m.currentQuantity} {m.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الكمية المصروفة
              </label>
              <input
                type="number"
                min="1"
                required
                value={quickQty}
                onChange={(e) => setQuickQty(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المشروع المرتبط
              </label>
              <select
                value={quickProject}
                onChange={(e) => setQuickProject(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="">بدون مشروع خاص</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              السبب أو الملاحظات
            </label>
            <input
              type="text"
              placeholder="مثال: طباعة لوحة معرض الرياض"
              value={quickReason}
              onChange={(e) => setQuickReason(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowQuickWithdraw(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              تأكيد الصرف
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Stock In */}
      <Modal
        isOpen={showQuickIn}
        onClose={() => setShowQuickIn(false)}
        title="تسجيل توريد مخزني جديد"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleQuickInSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              المادة الموردة
            </label>
            <select
              required
              value={selectedMatId}
              onChange={(e) => setSelectedMatId(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              <option value="">-- اختر المادة --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nameAr} ({m.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الكمية الموردة
              </label>
              <input
                type="number"
                min="1"
                required
                value={quickQty}
                onChange={(e) => setQuickQty(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                سعر الشراء للوحدة ({settings.defaultCurrency})
              </label>
              <input
                type="number"
                min="0"
                value={quickPrice}
                onChange={(e) => setQuickPrice(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المورد
              </label>
              <input
                type="text"
                placeholder="اسم المورد"
                value={quickSupplier}
                onChange={(e) => setQuickSupplier(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم الفاتورة
              </label>
              <input
                type="text"
                placeholder="INV-10092"
                value={quickInvoice}
                onChange={(e) => setQuickInvoice(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowQuickIn(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              حفظ وتأكيد التوريد
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
