import React, { useState, useMemo } from 'react';
import {
  Menu,
  Bell,
  ScanBarcode,
  Search,
  AlertTriangle,
  Sun,
  Moon,
  AlertOctagon,
  CheckCircle2,
  PlusCircle,
  ExternalLink,
  ArrowRight,
  FileText,
  CheckCheck,
  Trash2,
  BellOff,
  Check
} from 'lucide-react';
import { Material, NotificationItem } from '../types';
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications
} from '../services/inventoryService';
import { useTheme } from '../contexts/ThemeContext';
import { TabType } from './Sidebar';

interface NavbarProps {
  onToggleMobileMenu: () => void;
  onOpenBarcodeScanner: () => void;
  title: string;
  notifications: NotificationItem[];
  materials?: Material[];
  onNavigateTab?: (tab: TabType) => void;
  onQuickSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  onOpenBarcodeScanner,
  title,
  notifications,
  materials = [],
  onNavigateTab,
  onQuickSearchClick
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLowStockCenter, setShowLowStockCenter] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'out' | 'low'>('all');
  const [notifFilterTab, setNotifFilterTab] = useState<'all' | 'unread'>('all');

  // Local optimistic states to ensure immediate count reduction and item removal/read status
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [localDeletedIds, setLocalDeletedIds] = useState<Set<string>>(new Set());

  const { theme, toggleTheme } = useTheme();

  // Calculate active and unread notifications with optimistic overrides
  const activeNotifications = useMemo(() => {
    return notifications
      .filter((n) => !localDeletedIds.has(n.id))
      .map((n) => ({
        ...n,
        isRead: Boolean(n.isRead || localReadIds.has(n.id)),
      }));
  }, [notifications, localReadIds, localDeletedIds]);

  const unreadNotifications = useMemo(() => {
    return activeNotifications.filter((n) => !n.isRead);
  }, [activeNotifications]);

  const unreadCount = unreadNotifications.length;

  const displayedNotifications = useMemo(() => {
    if (notifFilterTab === 'unread') {
      return unreadNotifications;
    }
    return activeNotifications;
  }, [notifFilterTab, unreadNotifications, activeNotifications]);

  // Filter materials approaching low stock status or reorder point
  const lowStockMaterials = materials.filter(
    m => m.status === 'low_stock' || m.status === 'out_of_stock' || m.currentQuantity <= m.minQuantity
  );

  const outOfStockCount = lowStockMaterials.filter(
    m => m.status === 'out_of_stock' || m.currentQuantity <= 0
  ).length;

  const lowStockCount = lowStockMaterials.length - outOfStockCount;

  const filteredMaterials = lowStockMaterials.filter(m => {
    if (filterType === 'out') return m.status === 'out_of_stock' || m.currentQuantity <= 0;
    if (filterType === 'low') return m.status === 'low_stock' || (m.currentQuantity > 0 && m.currentQuantity <= m.minQuantity);
    return true;
  });

  const handleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLocalReadIds((prev) => new Set(prev).add(id));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn('Notification read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = unreadNotifications.map((n) => n.id);
    if (unreadIds.length === 0) return;

    setLocalReadIds((prev) => {
      const next = new Set(prev);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });

    try {
      await markAllNotificationsRead(unreadIds);
    } catch (err) {
      console.warn('Mark all read error:', err);
    }
  };

  const handleDeleteNotif = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLocalDeletedIds((prev) => new Set(prev).add(id));
    try {
      await deleteNotification(id);
    } catch (err) {
      console.warn('Delete notification error:', err);
    }
  };

  const handleDeleteAllNotifs = async () => {
    const allIds = activeNotifications.map((n) => n.id);
    if (allIds.length === 0) return;

    setLocalDeletedIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });

    try {
      await deleteAllNotifications(allIds);
    } catch (err) {
      console.warn('Delete all notifications error:', err);
    }
  };

  const toggleLowStockPopover = () => {
    setShowLowStockCenter(!showLowStockCenter);
    if (!showLowStockCenter) setShowNotifications(false);
  };

  const toggleNotificationsPopover = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) setShowLowStockCenter(false);
  };

  return (
    <header className="no-print h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors">
      {/* Right side: Mobile Toggle + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none">
          {title}
        </h2>
      </div>

      {/* Middle: Search input bar */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 w-80 lg:w-96 transition-colors">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          onClick={onQuickSearchClick}
          placeholder="بحث عن مواد، أكواد، أو مشاريع..."
          className="bg-transparent border-none text-sm text-slate-800 dark:text-slate-100 outline-none w-full cursor-pointer placeholder:text-slate-400"
          readOnly
        />
      </div>

      {/* Left side: Action Controls */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenBarcodeScanner}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <ScanBarcode className="w-4 h-4" />
          <span className="hidden sm:inline">ماسح الباركوود</span>
        </button>

        {/* Night / Day Mood Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'التحويل للوضع المضيء (النهار)' : 'التحويل للوضع الليلي (الليل)'}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>

        {/* Dedicated Low Stock Alert Center Dropdown */}
        <div className="relative">
          <button
            onClick={toggleLowStockPopover}
            className={`relative p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              lowStockMaterials.length > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 ring-2 ring-amber-500/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
            title="مركز تنبيهات حد الكفاية والمخزون المنخفض"
          >
            <AlertOctagon className="w-5 h-5" />
            {lowStockMaterials.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-800 animate-pulse">
                {lowStockMaterials.length}
              </span>
            )}
          </button>

          {/* Low Stock Dropdown Popover */}
          {showLowStockCenter && (
            <div className="absolute left-0 mt-2 w-80 sm:w-[420px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 transition-all dir-rtl">
              {/* Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        تنبيهات حد الكفاية والتوريد
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        الأصناف المقاربة للنفاد أو دون نقطة الطلب
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800/50">
                    {lowStockMaterials.length} صنف
                  </span>
                </div>

                {/* Filter Switcher */}
                {lowStockMaterials.length > 0 && (
                  <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                        filterType === 'all'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      الكل ({lowStockMaterials.length})
                    </button>
                    <button
                      onClick={() => setFilterType('out')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                        filterType === 'out'
                          ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-rose-600'
                      }`}
                    >
                      نفذت ({outOfStockCount})
                    </button>
                    <button
                      onClick={() => setFilterType('low')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                        filterType === 'low'
                          ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-amber-600'
                      }`}
                    >
                      منخفضة ({lowStockCount})
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredMaterials.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {lowStockMaterials.length === 0
                          ? 'جميع المواد بمستويات آمنة'
                          : 'لا توجد أصناف في هذا التصنيف'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        {lowStockMaterials.length === 0
                          ? 'ممتاز! كافة الأصناف في المستودع أعلى من حد الكفاية المحدد ولا توجد حاجة للتوريد.'
                          : 'جرب اختيار تصنيف آخر لعرض تنبيهات المواد.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredMaterials.map((m) => {
                    const isOut = m.status === 'out_of_stock' || m.currentQuantity <= 0;
                    const ratio = Math.min(100, Math.round((m.currentQuantity / (m.minQuantity || 1)) * 100));

                    return (
                      <div
                        key={m.id}
                        className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {m.code}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {m.categoryName}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                              {m.nameAr}
                            </h4>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 border ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                            }`}
                          >
                            {isOut ? 'نفذت بالكامل' : 'نقطة إعادة الطلب'}
                          </span>
                        </div>

                        {/* Stock Ratio Meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              الرصيد: <span className={isOut ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>{m.currentQuantity} {m.unit}</span>
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              حد الكفاية: <span className="font-bold text-slate-700 dark:text-slate-300">{m.minQuantity} {m.unit}</span>
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOut ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.max(5, isOut ? 0 : ratio)}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions per item */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              setShowLowStockCenter(false);
                              onNavigateTab?.('stock_in');
                            }}
                            className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>إذن توريد</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowLowStockCenter(false);
                              onNavigateTab?.('materials');
                            }}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>معاينة الأصناف</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setShowLowStockCenter(false);
                    onNavigateTab?.('requisition');
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>طلب توريد لرئيس مجلس الإدارة</span>
                </button>
                <button
                  onClick={() => {
                    setShowLowStockCenter(false);
                    onNavigateTab?.('stock_in');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>توريد مخزني جديد</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bell Notifications */}
        <div className="relative">
          <button
            onClick={toggleNotificationsPopover}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-full transition-colors cursor-pointer"
            title="مركز الإشعارات والتنبيهات"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4 px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Popover */}
          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 sm:w-[400px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 transition-all dir-rtl">
              {/* Header */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        مركز الإشعارات
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        سجل التنبيهات والأحداث المخزنية
                      </p>
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer border border-indigo-200/60 dark:border-indigo-800/50"
                      title="تحديد كافة الإشعارات كمقروءة"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>تعليم الكل كمقروء</span>
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setNotifFilterTab('all')}
                    className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                      notifFilterTab === 'all'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    الكل ({activeNotifications.length})
                  </button>
                  <button
                    onClick={() => setNotifFilterTab('unread')}
                    className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                      notifFilterTab === 'unread'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                    }`}
                  >
                    غير مقروءة ({unreadCount})
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                {displayedNotifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                      <BellOff className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      {notifFilterTab === 'unread'
                        ? 'لا توجد إشعارات غير مقروءة حالياً'
                        : 'لا توجد إشعارات مسجلة'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      تظهر هنا تنبيهات حركات التوريد، الصرف، والوصول للحد الأدنى للمخزون
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleRead(notif.id)}
                      className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 group relative ${
                        notif.isRead
                          ? 'opacity-70 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                          : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-r-4 border-indigo-600'
                      }`}
                    >
                      <div className="p-2 rounded-xl shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 pr-0.5">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" title="غير مقروء" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>

                          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notif.isRead && (
                              <button
                                onClick={(e) => handleRead(notif.id, e)}
                                title="تعليم كمقروء"
                                className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-md transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteNotif(notif.id, e)}
                              title="حذف الإشعار"
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {activeNotifications.length > 0 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={handleDeleteAllNotifs}
                    className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح كافة الإشعارات</span>
                  </button>

                  <span className="text-[10px] font-bold text-slate-400">
                    {unreadCount === 0 ? 'جميع الإشعارات مقروءة' : `${unreadCount} متبقية`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

