import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Repeat,
  FolderKanban,
  Users,
  ClipboardList,
  BarChart3,
  UserCog,
  ShieldAlert,
  Settings,
  LogOut,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

import { SystemSettings } from '../types';

export type TabType =
  | 'dashboard'
  | 'materials'
  | 'requisition'
  | 'stock_in'
  | 'stock_out'
  | 'movements'
  | 'adjustments'
  | 'projects'
  | 'contacts'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  lowStockCount?: number;
  settings?: SystemSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onCloseMobile,
  lowStockCount = 0,
  settings
}) => {
  const { currentUser, logout, isSuperAdmin, isManager } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const menuItems = [
    { id: 'dashboard' as TabType, label: 'لوحة التحكم الرئيسية', icon: LayoutDashboard },
    { id: 'materials' as TabType, label: 'المواد والمخزون', icon: Package, badge: lowStockCount },
    { id: 'requisition' as TabType, label: 'طلب توريد خامات (الرئيس)', icon: ClipboardList },
    { id: 'stock_in' as TabType, label: 'إدخال مخزني (توريد)', icon: ArrowDownLeft },
    { id: 'stock_out' as TabType, label: 'صرف مخزني (خروج)', icon: ArrowUpRight },
    { id: 'movements' as TabType, label: 'سجل الحركات', icon: History },
    { id: 'adjustments' as TabType, label: 'التسويات والنقل', icon: Repeat },
    { id: 'projects' as TabType, label: 'المشاريع', icon: FolderKanban },
    { id: 'contacts' as TabType, label: 'الموردون والعملاء', icon: Users },
    { id: 'reports' as TabType, label: 'التقارير المتقدمة', icon: BarChart3 },
    ...(isSuperAdmin
      ? [{ id: 'users' as TabType, label: 'إدارة المستخدمين', icon: UserCog }]
      : []),
    ...(isManager
      ? [{ id: 'audit' as TabType, label: 'سجل الرقابة والأمان', icon: ShieldAlert }]
      : []),
    { id: 'settings' as TabType, label: 'الإعدادات والنسخ', icon: Settings },
  ];

  const getRoleLabel = (r?: string) => {
    if (r === 'super_admin') return 'مدير النظام';
    if (r === 'warehouse_manager') return 'مدير المستودع';
    if (r === 'employee') return 'موظف مستودع';
    return 'مراقب';
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`no-print fixed top-0 right-0 bottom-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col border-l border-slate-800 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.companyName || 'شعار الشركة'}
                className="w-10 h-10 object-contain bg-white rounded-lg p-0.5 shadow-md shrink-0 border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0">
                خ
              </div>
            )}
            <div>
              <h1 className="text-white font-bold text-sm leading-tight truncate max-w-[130px]">
                {settings?.companyName || 'خيال'}
              </h1>
              <span className="text-slate-400 text-[10px] mt-0.5 block">نظام إدارة المستودعات</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-105 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span className="flex-1 text-right truncate">{item.label}</span>
                {item.badge ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Footer Status & User Info */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="bg-indigo-900/30 p-3 rounded-lg border border-indigo-500/20 space-y-1">
            <p className="text-indigo-300 text-xs font-bold mb-1 uppercase tracking-wider">حالة المخزون</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-1.5 rounded-full w-[65%]" />
            </div>
            <p className="text-slate-400 text-[10px] mt-1">65% من الطاقة الاستيعابية</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold shrink-0">
                {currentUser?.fullName?.charAt(0) || 'أ'}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {currentUser?.fullName || 'أحمد علي'}
                </p>
                <p className="text-slate-400 text-[10px] truncate">
                  {getRoleLabel(currentUser?.role)}
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'الوضع المضيء' : 'الوضع الليلي'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg text-xs transition-colors border border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};
