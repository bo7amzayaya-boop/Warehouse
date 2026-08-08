import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, TabType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { Modal } from './components/Modal';

import {
  Material,
  Category,
  Unit,
  Movement,
  Project,
  Supplier,
  Customer,
  NotificationItem,
  SystemSettings,
  PurchaseRequisition
} from './types';

import {
  subscribeMaterials,
  subscribeCategories,
  subscribeUnits,
  subscribeMovements,
  subscribeProjects,
  subscribeSuppliers,
  subscribeCustomers,
  subscribeNotifications,
  subscribeSettings,
  subscribeRequisitions,
  seedInitialDataIfEmpty
} from './services/inventoryService';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { RequisitionPage } from './pages/RequisitionPage';
import { StockInPage } from './pages/StockInPage';
import { StockOutPage } from './pages/StockOutPage';
import { MovementsPage } from './pages/MovementsPage';
import { AdjustmentsPage } from './pages/AdjustmentsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ContactsPage } from './pages/ContactsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { Search } from 'lucide-react';

export function App() {
  const { currentUser, authLoading } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firestore Realtime Collections
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'مؤسسة الخيال للطباعة والإعلان',
    address: 'الرياض - المنطقة الصناعية',
    phone: '0500000000',
    email: 'info@khayal.com',
    defaultCurrency: 'ر.س',
  });

  // Modal Scanner State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showQuickSearchModal, setShowQuickSearchModal] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState('');

  // Seed data on first launch
  useEffect(() => {
    seedInitialDataIfEmpty().catch(err => {
      console.warn('Seed data status:', err);
    });
  }, []);

  // Subscriptions
  useEffect(() => {
    if (!currentUser) return;

    const unsubMats = subscribeMaterials(setMaterials);
    const unsubCats = subscribeCategories(setCategories);
    const unsubUnits = subscribeUnits(setUnits);
    const unsubMovs = subscribeMovements(setMovements);
    const unsubProjs = subscribeProjects(setProjects);
    const unsubSups = subscribeSuppliers(setSuppliers);
    const unsubCusts = subscribeCustomers(setCustomers);
    const unsubReqs = subscribeRequisitions(setRequisitions);
    const unsubNotifs = subscribeNotifications(setNotifications);
    const unsubSettings = subscribeSettings(setSettings);

    return () => {
      unsubMats();
      unsubCats();
      unsubUnits();
      unsubMovs();
      unsubProjs();
      unsubSups();
      unsubCusts();
      unsubReqs();
      unsubNotifs();
      unsubSettings();
    };
  }, [currentUser]);

  // Handle scanned barcode from camera or quick search
  const handleBarcodeScanned = (scannedCode: string) => {
    setShowBarcodeScanner(false);
    setShowQuickSearchModal(false);

    const foundMat = materials.find(m => m.barcode === scannedCode || m.code === scannedCode);
    if (foundMat) {
      showSuccess(`تم العثور على المادة: ${foundMat.nameAr}`);
      setActiveTab('materials');
    } else {
      showError(`لم يتم العثور على مادة بالباركوود: (${scannedCode})`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-cairo dir-rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-indigo-300 font-bold text-sm">جاري اتصال وتحميل منظومة مستودع الخيال...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const lowStockCount = materials.filter(m => m.status === 'low_stock' || m.status === 'out_of_stock').length;

  const getPageTitle = (tab: TabType) => {
    switch (tab) {
      case 'dashboard': return 'لوحة التحكم الرئيسية والمؤشرات';
      case 'materials': return 'إدارة المواد والأصناف';
      case 'requisition': return 'طلب توريد خامات (لرئيس مجلس الإدارة)';
      case 'stock_in': return 'إذن إدخال مخزني (توريد)';
      case 'stock_out': return 'إذن صرف مخزني (خروج)';
      case 'movements': return 'سجل الحركات المخزنية';
      case 'adjustments': return 'تسوية الجرد ونقل الأماكن';
      case 'projects': return 'مشاريع الطباعة والدعاية';
      case 'contacts': return 'الموردين والعملاء';
      case 'reports': return 'التقارير المتقدمة والتحليلات';
      case 'users': return 'إدارة مستخدمي المنظومة';
      case 'audit': return 'سجل الرقابة والأمان';
      case 'settings': return 'إعدادات النظام والشركة';
      default: return 'مستودع الخيال';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-cairo dir-rtl flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        lowStockCount={lowStockCount}
        settings={settings}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 lg:mr-72 flex flex-col min-w-0 transition-all">
        {/* Top Navbar */}
        <Navbar
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
          title={getPageTitle(activeTab)}
          notifications={notifications}
          materials={materials}
          onNavigateTab={setActiveTab}
          onQuickSearchClick={() => setShowQuickSearchModal(true)}
        />

        {/* View Component Switcher */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardPage
              materials={materials}
              categories={categories}
              movements={movements}
              projects={projects}
              settings={settings}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialsPage
              materials={materials}
              categories={categories}
              units={units}
              suppliers={suppliers}
              settings={settings}
            />
          )}

          {activeTab === 'stock_in' && (
            <StockInPage
              materials={materials}
              suppliers={suppliers}
              movements={movements}
              settings={settings}
            />
          )}

          {activeTab === 'stock_out' && (
            <StockOutPage
              materials={materials}
              projects={projects}
              movements={movements}
              settings={settings}
            />
          )}

          {activeTab === 'movements' && (
            <MovementsPage
              movements={movements}
              projects={projects}
              suppliers={suppliers}
              settings={settings}
            />
          )}

          {activeTab === 'adjustments' && (
            <AdjustmentsPage
              materials={materials}
              settings={settings}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsPage
              projects={projects}
              movements={movements}
              settings={settings}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsPage
              suppliers={suppliers}
              customers={customers}
            />
          )}

          {activeTab === 'requisition' && (
            <RequisitionPage
              materials={materials}
              requisitions={requisitions}
              settings={settings}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage
              materials={materials}
              movements={movements}
              categories={categories}
              projects={projects}
              settings={settings}
            />
          )}

          {activeTab === 'users' && <UserManagementPage />}

          {activeTab === 'audit' && <AuditLogPage />}

          {activeTab === 'settings' && <SettingsPage settings={settings} />}
        </main>

        {/* Footer Status Bar */}
        <footer className="no-print h-10 bg-slate-900 border-t border-slate-800 px-4 lg:px-8 flex items-center justify-between text-[11px] text-slate-400 mt-auto shrink-0">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              قاعدة البيانات متصلة (Firebase Firestore)
            </span>
            <span className="hidden sm:inline">إصدار النظام 2.4.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline">آخر تزامن للبيانات: متزامن الآن</span>
            <span className="text-indigo-400 font-medium cursor-pointer hover:underline" onClick={() => setActiveTab('settings')}>
              إعدادات النسخ والنسخ الاحتياطي
            </span>
          </div>
        </footer>
      </div>

      {/* Barcode Camera Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScannerModal
          isOpen={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onScanSuccess={handleBarcodeScanned}
        />
      )}

      {/* Quick Search Modal */}
      {showQuickSearchModal && (
        <Modal
          isOpen={showQuickSearchModal}
          onClose={() => setShowQuickSearchModal(false)}
          title="بحث سريع بالباركوود أو الكود"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="أدخل الباركوود أو كود المادة واضغط انتر..."
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBarcodeScanned(quickSearchInput);
                }}
                className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 font-mono"
              />
              <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowQuickSearchModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleBarcodeScanned(quickSearchInput)}
                className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                بحث عن المادة
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default App;
