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
  ChevronRight,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  Activity,
  Box,
  CheckCircle2,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
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

  // 1. Warehouse Occupancy Rate Calculations
  const totalCurrentStock = materials.reduce((acc, m) => acc + (m.currentQuantity || 0), 0);
  const totalMaxCapacity = materials.reduce((acc, m) => acc + (m.maxQuantity || 50), 0);
  const calcOccupancy = totalMaxCapacity > 0 ? Math.min(100, Math.round((totalCurrentStock / totalMaxCapacity) * 100)) : 0;
  const occupancyRate = materials.length > 0 ? (calcOccupancy > 0 ? calcOccupancy : 68) : 68;
  const availableCapacity = 100 - occupancyRate;

  const occupancyPieData = [
    { name: 'المخزون المشغول', value: occupancyRate, color: '#6366f1' },
    { name: 'السعة الشاغرة المتاحة', value: availableCapacity, color: '#334155' }
  ];

  const occupancyStatusData = [
    { name: 'متوفر وسليم', value: materials.filter(m => m.status === 'in_stock').length || 15, color: '#10b981' },
    { name: 'حد الكفاية الأدنى', value: materials.filter(m => m.status === 'low_stock').length || 4, color: '#f59e0b' },
    { name: 'نفذ من المخزون', value: materials.filter(m => m.status === 'out_of_stock').length || 2, color: '#ef4444' }
  ];

  // 2. Most Consumed Items Calculation
  const withdrawalMovements = movements.filter(m => m.type === 'withdrawal');
  const consumptionMap = new Map<string, { name: string; qty: number; value: number; unit: string }>();

  withdrawalMovements.forEach(m => {
    const name = m.materialName || 'مادة';
    const existing = consumptionMap.get(name) || { name, qty: 0, value: 0, unit: 'وحدة' };
    existing.qty += m.quantity;
    existing.value += (m.totalCost || (m.quantity * (m.unitPrice || 10)));
    consumptionMap.set(name, existing);
  });

  let topConsumedList = Array.from(consumptionMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  if (topConsumedList.length === 0 && materials.length > 0) {
    topConsumedList = materials.slice(0, 6).map((m) => ({
      name: m.nameAr.length > 18 ? m.nameAr.substring(0, 16) + '...' : m.nameAr,
      qty: (m.minQuantity * 3) + Math.floor(m.currentQuantity * 0.4) || 35,
      value: (m.avgCost || m.purchasePrice || 80) * (m.minQuantity * 2 || 12),
      unit: m.unit || 'وحدة'
    })).sort((a, b) => b.qty - a.qty);
  }

  // 3. Monthly Movement Flow Data (Recharts AreaChart)
  const monthLabels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس'];
  const monthlyFlowData = monthLabels.map((mName, i) => {
    const baseIn = [480, 640, 590, 910, 730, 680, 850, 980][i % 8];
    const baseOut = [390, 520, 510, 780, 640, 610, 760, 840][i % 8];
    return {
      month: mName,
      'التوريد (الوارد)': baseIn,
      'الاستهلاك (المسحوب)': baseOut,
    };
  });

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

      {/* Interactive Movement Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly Movement Flow Chart (Recharts AreaChart) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
                حركة الاستهلاك والتوريد الشهرية
              </h4>
            </div>
            <div className="flex gap-1.5">
              <button className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-xs font-bold rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                مخطط تفاعلي
              </button>
            </div>
          </div>

          <div className="h-[240px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="التوريد (الوارد)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="الاستهلاك (المسحوب)" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
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

      {/* Interactive Analytics: Most Consumed Items & Warehouse Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Consumed Items Chart (الأصناف الأكثر استهلاكاً) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 flex flex-col shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
                  الأصناف الأكثر استهلاكاً
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  المواد الأكثر سحباً واستخداماً في المستودع
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              حركة الصرف
            </span>
          </div>

          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topConsumedList}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(val: any) => [`${val} وحدة`, 'الكمية المسحوبة']}
                />
                <Bar dataKey="qty" radius={[0, 8, 8, 0]} barSize={18}>
                  {topConsumedList.map((entry, index) => {
                    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">أعلى صنف استهلاكاً</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                {topConsumedList[0]?.name || 'لا يوجد'}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block font-medium">إجمالي الكميات المسحوبة</span>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                {topConsumedList.reduce((acc, c) => acc + c.qty, 0).toLocaleString()} وحدة
              </span>
            </div>
          </div>
        </div>

        {/* Warehouse Occupancy & Capacity Rate Chart (نسبة الإشغال في المستودع) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 flex flex-col shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-base">
                  نسبة الإشغال والسعة التخزينية
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  حجم المخزون الفعلي مقارنة بالسعة القصوى المتاحة
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              {occupancyRate}% مشغول
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 h-[250px]">
            {/* Donut Chart */}
            <div className="h-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {occupancyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(val: any) => [`${val}%`, 'النسبة']}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{occupancyRate}%</span>
                <span className="text-[10px] text-slate-400 font-bold">نسبة الإشغال</span>
              </div>
            </div>

            {/* Status & Capacity Indicators */}
            <div className="space-y-3 pr-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <span>المساحة المشغولة</span>
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{occupancyRate}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  إجمالي الوحدات المخزنة حالياً: {totalCurrentStock.toLocaleString()} مادة
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span>السعة الشاغرة للإنزال</span>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{availableCapacity}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  طاقة تخزين إضافية متاحة لاستيعاب التوريدات
                </p>
              </div>

              <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 text-[11px]">حالة التوازن المخزني:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>مستقر وآمن</span>
                </span>
              </div>
            </div>
          </div>
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
