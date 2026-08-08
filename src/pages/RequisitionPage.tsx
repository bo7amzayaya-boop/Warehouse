import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  Package,
  Layers,
  ArrowRight,
  Printer,
  Sparkles,
  ClipboardList,
  Save,
  Clock,
  Eye,
  X
} from 'lucide-react';
import { Material, SystemSettings, PurchaseRequisition, RequisitionItem } from '../types';
import { exportToPDF } from '../utils/pdfExporter';
import { addRequisition, deleteRequisition } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Modal } from '../components/Modal';

interface RequisitionPageProps {
  materials: Material[];
  requisitions: PurchaseRequisition[];
  settings: SystemSettings;
}

export const RequisitionPage: React.FC<RequisitionPageProps> = ({
  materials,
  requisitions,
  settings
}) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [reqNumber, setReqNumber] = useState(
    'REQ-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000))
  );
  const [title, setTitle] = useState('طلب توريد خامات ومستلزمات نفعية عاجل للمستودع');
  const [recipient, setRecipient] = useState('سعادة رئيس مجلس الإدارة المحترم');
  const [applicantName, setApplicantName] = useState(
    currentUser?.fullName ? `${currentUser.fullName} (أمين المستودع)` : 'أمين المستودع'
  );
  const [warehouseName, setWarehouseName] = useState(settings.companyName || 'المستودع الرئيسي - مطبعة الخيال');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal'>('urgent');
  const [justification, setJustification] = useState(
    'نحيط سيادتكم علماً بنفاد/انخفاض رصيد الخامات الموضحة أدناه عن حد الكفاية الأدنى، ونرجو التكرم بالمرئيات والتوجيه بالتوجيه للتوريد لضمان استمرارية تشغيل أوامر الإنتاج والمطبعة دون توقف.'
  );

  const [items, setItems] = useState<RequisitionItem[]>([]);

  // Item Selector Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customUnit, setCustomUnit] = useState('رول');
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);

  // History Preview Modal
  const [previewReq, setPreviewReq] = useState<PurchaseRequisition | null>(null);

  // Low Stock Items for Auto Import
  const lowStockMaterials = materials.filter(
    m => m.status === 'low_stock' || m.status === 'out_of_stock' || m.currentQuantity <= m.minQuantity
  );

  // Auto-import low stock items
  const handleAutoImportLowStock = () => {
    if (lowStockMaterials.length === 0) {
      showError('لا توجد خامات بمستوى منخفض أو نفذت حالياً بالمستودع.');
      return;
    }

    const imported: RequisitionItem[] = lowStockMaterials.map(m => {
      const neededQty = Math.max(1, (m.minQuantity * 2) - m.currentQuantity);
      const estPrice = m.purchasePrice || m.avgCost || 100;
      return {
        id: 'req_item_' + Math.random().toString(36).substring(2, 9),
        materialId: m.id,
        materialCode: m.code,
        materialName: m.nameAr,
        categoryName: m.categoryName,
        unit: m.unit,
        currentQuantity: m.currentQuantity,
        minQuantity: m.minQuantity,
        requestedQuantity: neededQty,
        estimatedUnitPrice: estPrice,
        totalEstimatedPrice: neededQty * estPrice
      };
    });

    setItems(imported);
    showSuccess(`تم استيراد ${imported.length} صنفاً من الخامات الناقصة بنجاح.`);
  };

  // Add material from inventory select
  const handleAddMaterialItem = () => {
    if (!selectedMaterialId) return;
    const m = materials.find(mat => mat.id === selectedMaterialId);
    if (!m) return;

    if (items.some(i => i.materialId === m.id)) {
      showError('هذه المادة مضافة بالفعل في القائمة.');
      return;
    }

    const neededQty = Math.max(1, (m.minQuantity * 2) - m.currentQuantity);
    const estPrice = m.purchasePrice || m.avgCost || 100;

    const newItem: RequisitionItem = {
      id: 'req_item_' + Math.random().toString(36).substring(2, 9),
      materialId: m.id,
      materialCode: m.code,
      materialName: m.nameAr,
      categoryName: m.categoryName,
      unit: m.unit,
      currentQuantity: m.currentQuantity,
      minQuantity: m.minQuantity,
      requestedQuantity: neededQty,
      estimatedUnitPrice: estPrice,
      totalEstimatedPrice: neededQty * estPrice
    };

    setItems([...items, newItem]);
    setSelectedMaterialId('');
    setShowItemModal(false);
    showSuccess('تمت إضافة المادة للطلب');
  };

  // Add custom item
  const handleAddCustomItem = () => {
    if (!customName) {
      showError('يرجى كتابة اسم الخامة/الصنف');
      return;
    }

    const newItem: RequisitionItem = {
      id: 'req_item_' + Math.random().toString(36).substring(2, 9),
      materialCode: customCode || 'EXT-' + Math.floor(100 + Math.random() * 900),
      materialName: customName,
      unit: customUnit || 'رول',
      currentQuantity: 0,
      minQuantity: 0,
      requestedQuantity: Math.max(1, customQty),
      estimatedUnitPrice: customPrice,
      totalEstimatedPrice: Math.max(1, customQty) * customPrice
    };

    setItems([...items, newItem]);
    setCustomName('');
    setCustomCode('');
    setCustomPrice(0);
    setCustomQty(1);
    setShowItemModal(false);
    showSuccess('تمت إضافة الصنف الخاص للطلب');
  };

  // Item field updates
  const handleUpdateItemQty = (id: string, qty: number) => {
    const validQty = Math.max(1, qty || 1);
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          requestedQuantity: validQty,
          totalEstimatedPrice: validQty * item.estimatedUnitPrice
        };
      }
      return item;
    }));
  };

  const handleUpdateItemPrice = (id: string, price: number) => {
    const validPrice = Math.max(0, price || 0);
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          estimatedUnitPrice: validPrice,
          totalEstimatedPrice: item.requestedQuantity * validPrice
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  // Calculate grand total
  const grandTotalAmount = items.reduce((acc, curr) => acc + curr.totalEstimatedPrice, 0);

  // Save requisition to Firestore
  const handleSaveRequisition = async () => {
    if (items.length === 0) {
      showError('يرجى إضافة خامة واحدة على الأقل بالطلب قبل الحفظ.');
      return;
    }

    setSaving(true);
    try {
      const newReq: Omit<PurchaseRequisition, 'id'> = {
        reqNumber,
        title,
        recipient,
        applicantName,
        warehouseName,
        priority,
        justification,
        items,
        totalItemsCount: items.length,
        totalEstimatedAmount: grandTotalAmount,
        currency: settings.defaultCurrency || 'ر.س',
        status: 'pending',
        createdAt: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString('ar-EG')
      };

      await addRequisition(newReq);
      showSuccess('تم حفظ طلب التوريد في السجل بنجاح.');
      setActiveView('history');
    } catch (err: any) {
      showError(err.message || 'فشل حفظ طلب التوريد');
    } finally {
      setSaving(false);
    }
  };

  // Export PDF
  const handleExportPDF = async (elementId: string, filename: string) => {
    if (items.length === 0 && elementId === 'printable-requisition-document') {
      showError('يرجى تحديد الخامات الناقصة وتعبئة بيانات الطلب أولاً.');
      return;
    }

    setExporting(true);
    try {
      await exportToPDF(elementId, { filename });
      showSuccess('تم تصدير ملف طلب التوريد بصيغة PDF بنجاح!');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setExporting(false);
    }
  };

  // Delete Requisition from History
  const handleDeleteReq = async (id: string) => {
    try {
      await deleteRequisition(id);
      showSuccess('تم حذف طلب التوريد من السجل.');
    } catch (e) {
      showError('فشل الحذف');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title Banner */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold">
              <ClipboardList className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                طلب توريد خامات (رئيس مجلس الإدارة)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                إعداد وتصدير الخطابات الرسمية بطلب توريد الخامات والمواد الناقصة لاعتمادها من رئيس مجلس الإدارة
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('create')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'create'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء طلب جديد</span>
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل الطلبات السابقة ({requisitions.length})</span>
          </button>
        </div>
      </div>

      {activeView === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form & Controls (Left / Top) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Auto-Import Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-900/10 dark:from-amber-950/40 dark:to-slate-800 p-5 rounded-2xl border border-amber-300/40 dark:border-amber-700/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    تضمين الخامات الناقصة تلقائياً
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-lg">
                  {lowStockMaterials.length} أصناف منخفضة
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                اضغط لتجميع كافة الأصناف التي وصلت إلى حد الكفاية أو نفذت بالكامل من المستودع تلقائياً وتحديد الكمية المطلوبة للتوريد.
              </p>
              <button
                onClick={handleAutoImportLowStock}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>استيراد الخامات الناقصة تلقائياً ({lowStockMaterials.length})</span>
              </button>
            </div>

            {/* Requisition Meta Form */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>بيانات ومعلومات خطاب الطلب</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    جهة الخطاب (الموجه إليه)
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    عنوان وموضوع الطلب
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      رقم الطلب المرجعي
                    </label>
                    <input
                      type="text"
                      value={reqNumber}
                      onChange={(e) => setReqNumber(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      درجة الأهمية
                    </label>
                    <select
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                    >
                      <option value="urgent">عاجل جداً (توقف وشيك)</option>
                      <option value="high">هام للغاية</option>
                      <option value="normal">عادي / دوري</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    معد الطلب (أمين المستودع)
                  </label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    المستودع / المنشأة
                  </label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    مبررات الطلب والسبب الفني
                  </label>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Selected Materials List Table Editor */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>الأصناف والكميات المطلوبة ({items.length})</span>
                </h3>

                <button
                  onClick={() => setShowItemModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة صنف</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    لم يتم اختيار أي مواد للطلب بعد
                  </p>
                  <p className="text-[11px] text-slate-400">
                    يمكنك الضغط على زر "استيراد الخامات الناقصة تلقائياً" أوالضغط على "إضافة صنف" لاختيار مواد محددة.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                              #{idx + 1} | {item.materialCode}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                            {item.materialName}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="حذف الصنف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Input fields for Qty & Price */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            الكمية المطلوبة ({item.unit})
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={item.requestedQuantity}
                            onChange={(e) => handleUpdateItemQty(item.id, parseFloat(e.target.value))}
                            className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            التكلفة التقديرية (للوحدة)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={item.estimatedUnitPrice}
                            onChange={(e) => handleUpdateItemPrice(item.id, parseFloat(e.target.value))}
                            className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-900 dark:text-white text-center font-mono"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            الإجمالي المتوقع
                          </label>
                          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-center">
                            {item.totalEstimatedPrice.toLocaleString()} {settings.defaultCurrency}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Grand Total Summary */}
              {items.length > 0 && (
                <div className="p-3 bg-indigo-900/10 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                  <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                    إجمالي التكلفة التقديرية للطلب:
                  </span>
                  <span className="font-mono text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                    {grandTotalAmount.toLocaleString()} {settings.defaultCurrency}
                  </span>
                </div>
              )}
            </div>

            {/* Submit / PDF Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExportPDF('printable-requisition-document', `طلب_توريد_خامات_${reqNumber}.pdf`)}
                disabled={exporting || items.length === 0}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'جاري تصدير PDF...' : 'تصدير طلب التوريد PDF'}</span>
              </button>

              <button
                onClick={handleSaveRequisition}
                disabled={saving || items.length === 0}
                className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'جاري الحفظ...' : 'حفظ بالمنظومة'}</span>
              </button>
            </div>
          </div>

          {/* Printable Official Letterhead Preview (Right / Main) */}
          <div className="lg:col-span-7">
            <div className="bg-slate-200/70 dark:bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-4 sticky top-20">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  معاينة مستند الطلب الرسمي المعد للتصدير
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  A4 Formal Layout
                </span>
              </div>

              {/* The Actual Printable Canvas Container */}
              <div
                id="printable-requisition-document"
                className="p-8 sm:p-10 rounded-xl shadow-xl border dir-rtl font-cairo space-y-6 max-w-2xl mx-auto"
                style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
              >
                {/* Executive Top Accent Bar */}
                <div
                  className="h-2 rounded-t-md -mt-8 -mx-8 sm:-mt-10 sm:-mx-10 mb-2"
                  style={{ background: 'linear-gradient(to right, #d97706, #0f172a, #3730a3)' }}
                />

                {/* Formal Header */}
                <div className="pb-5 flex items-start justify-between gap-4" style={{ borderBottom: '2px solid #0f172a' }}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt="Logo"
                          className="w-9 h-9 object-contain rounded-lg shrink-0 border border-slate-200 p-0.5 bg-white"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center shrink-0"
                          style={{ backgroundColor: '#0f172a', color: '#f59e0b' }}
                        >
                          خ
                        </div>
                      )}
                      <h1 className="text-xl font-black leading-tight" style={{ color: '#0f172a' }}>
                        {settings.companyName || 'مؤسسة الخيال للطباعة والإعلان'}
                      </h1>
                    </div>
                    <p className="text-xs font-extrabold" style={{ color: '#334155' }}>
                      إدارة المستودعات وسلاسل الإمداد - {warehouseName}
                    </p>
                    <p className="text-[11px]" style={{ color: '#64748b' }}>
                      {settings.address || 'الرياض - المملكة العربية السعودية'} | هاتف: {settings.phone || '0112345678'}
                    </p>
                  </div>

                  <div className="text-left font-mono space-y-1 shrink-0">
                    <div
                      className="px-3 py-1.5 text-xs font-black rounded-lg text-center shadow-xs"
                      style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                    >
                      خطاب طلب توريد خامات
                    </div>
                    <div
                      className="text-[11px] font-bold space-y-0.5 mt-2 p-2 rounded-lg border text-right dir-rtl"
                      style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                    >
                      <p>رقم الطلب: <span className="font-extrabold" style={{ color: '#312e81' }}>{reqNumber}</span></p>
                      <p>التاريخ: <span className="font-semibold">{new Date().toLocaleDateString('ar-EG')}</span></p>
                      <p>درجة الأهمية: <span className="font-black" style={{ color: '#be123c' }}>{priority === 'urgent' ? 'عاجل جداً' : priority === 'high' ? 'هام للغاية' : 'عادي'}</span></p>
                    </div>
                  </div>
                </div>

                {/* Recipient Greeting Block */}
                <div
                  className="space-y-3 p-4 rounded-xl border"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                >
                  <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <h3 className="text-sm font-black flex items-center gap-2" style={{ color: '#0f172a' }}>
                      <span>المكرم / {recipient}</span>
                      <span className="text-xs font-bold" style={{ color: '#475569' }}>المحترم</span>
                    </h3>
                    <span
                      className="px-3 py-0.5 rounded-md text-[10px] font-black"
                      style={{ backgroundColor: '#0f172a', color: '#f59e0b' }}
                    >
                      رئيس مجلس الإدارة
                    </span>
                  </div>
                  <p className="text-xs font-extrabold leading-relaxed" style={{ color: '#0f172a' }}>
                    السلام عليكم ورحمة الله وبركاته،،، وبعد:
                  </p>
                  <p className="text-xs leading-relaxed font-medium" style={{ color: '#1e293b' }}>
                    {justification || 'نحيطكم علماً باحتياج المستودع لتوريد المواد والخامات المبينة أدناه لمواصلة التشغيل وتلبية طلبات المشاريع، نأمل التكرم بالاطلاع والتكرم بالاعتماد.'}
                  </p>
                </div>

                {/* Table of Requested Materials */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <h4 className="text-xs font-black" style={{ color: '#0f172a' }}>
                      جدول بيان الخامات والأصناف المطلوبة بالتفصيل:
                    </h4>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded border"
                      style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#334155' }}
                    >
                      إجمالي عدد الأصناف: {items.length}
                    </span>
                  </div>

                  <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#0f172a' }}>
                    <table className="w-full text-right text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                          <th className="p-2.5 text-center w-8" style={{ borderRight: '1px solid #1e293b' }}>#</th>
                          <th className="p-2.5" style={{ borderRight: '1px solid #1e293b' }}>كود المادة</th>
                          <th className="p-2.5" style={{ borderRight: '1px solid #1e293b' }}>اسم المادة والخامة</th>
                          <th className="p-2.5 text-center" style={{ borderRight: '1px solid #1e293b' }}>الوحدة</th>
                          <th className="p-2.5 text-center" style={{ borderRight: '1px solid #1e293b' }}>الرصيد الحرفي</th>
                          <th className="p-2.5 text-center font-black" style={{ backgroundColor: '#1e293b', borderRight: '1px solid #334155', color: '#fbbf24' }}>الكمية المطلوبة</th>
                          <th className="p-2.5 text-left" style={{ borderRight: '1px solid #1e293b' }}>التكلفة التقديرية</th>
                          <th className="p-2.5 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: '#0f172a' }}>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center font-bold" style={{ color: '#64748b' }}>
                              لم يتم تضمين خامات في هذا الطلب بعد
                            </td>
                          </tr>
                        ) : (
                          items.map((it, i) => (
                            <tr
                              key={it.id}
                              style={{
                                backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                                borderBottom: '1px solid #e2e8f0'
                              }}
                            >
                              <td className="p-2 text-center font-bold" style={{ color: '#475569', borderRight: '1px solid #e2e8f0' }}>{i + 1}</td>
                              <td className="p-2 font-mono font-bold" style={{ color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{it.materialCode}</td>
                              <td className="p-2 font-black" style={{ color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>{it.materialName}</td>
                              <td className="p-2 text-center" style={{ borderRight: '1px solid #e2e8f0' }}>{it.unit}</td>
                              <td className="p-2 text-center font-mono" style={{ color: '#334155', borderRight: '1px solid #e2e8f0' }}>{it.currentQuantity}</td>
                              <td className="p-2 text-center font-mono font-black" style={{ backgroundColor: '#fef3c7', color: '#1e1b4b', borderRight: '1px solid #cbd5e1' }}>
                                {it.requestedQuantity}
                              </td>
                              <td className="p-2 text-left font-mono" style={{ borderRight: '1px solid #e2e8f0' }}>{it.estimatedUnitPrice.toLocaleString()}</td>
                              <td className="p-2 text-left font-mono font-black" style={{ color: '#0f172a' }}>
                                {it.totalEstimatedPrice.toLocaleString()} {settings.defaultCurrency}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {items.length > 0 && (
                        <tfoot style={{ backgroundColor: '#0f172a', color: '#ffffff', borderTop: '2px solid #0f172a' }}>
                          <tr>
                            <td colSpan={5} className="p-3 text-right font-black">
                              إجمالي الأصناف والتكلفة التقديرية الكلية للطلب:
                            </td>
                            <td className="p-3 text-center font-mono font-black text-sm" style={{ color: '#fbbf24' }}>
                              {items.reduce((a, b) => a + b.requestedQuantity, 0)}
                            </td>
                            <td className="p-3 text-left font-mono font-black text-sm" style={{ color: '#fef08a' }} colSpan={2}>
                              {grandTotalAmount.toLocaleString()} {settings.defaultCurrency}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Signatures & Official Approvals Block */}
                <div className="pt-4 grid grid-cols-2 gap-6" style={{ borderTop: '2px solid #0f172a' }}>
                  {/* Left Signature: Warehouse Manager */}
                  <div
                    className="p-4 rounded-xl border space-y-4 text-center"
                    style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                  >
                    <div>
                      <p className="text-xs font-black" style={{ color: '#0f172a' }}>مُعد الطلب (أمين المستودع):</p>
                      <p className="text-xs font-bold mt-1" style={{ color: '#1e293b' }}>{applicantName}</p>
                    </div>
                    <div className="h-10 w-4/5 mx-auto" style={{ borderBottom: '2px dashed #94a3b8' }} />
                    <p className="text-[10px] font-bold" style={{ color: '#475569' }}>التوقيع والاعتماد الرسمي</p>
                  </div>

                  {/* Right Approval Box: Chairman of the Board */}
                  <div
                    className="p-4 rounded-xl border-2 space-y-3"
                    style={{ backgroundColor: '#fffbeb', borderColor: '#0f172a', color: '#0f172a' }}
                  >
                    <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <p className="text-xs font-black" style={{ color: '#0f172a' }}>
                        قرار وتوجيه رئيس مجلس الإدارة:
                      </p>
                      <span className="text-[9px] font-mono font-bold" style={{ color: '#64748b' }}>Board Approval</span>
                    </div>
                    <div className="space-y-2 text-[11px] font-extrabold" style={{ color: '#0f172a' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 rounded shrink-0" style={{ backgroundColor: '#ffffff', borderColor: '#0f172a' }} />
                        <span>يُعتمد الشراء والتوريد فوراً</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 rounded shrink-0" style={{ backgroundColor: '#ffffff', borderColor: '#0f172a' }} />
                        <span>تُعدل الكميات إلى: .......................................</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 rounded shrink-0" style={{ backgroundColor: '#ffffff', borderColor: '#0f172a' }} />
                        <span>ملاحظات: ...........................................................</span>
                      </div>
                    </div>
                    <div className="pt-2 text-center" style={{ borderTop: '1px solid #cbd5e1' }}>
                      <p className="text-[10px] font-black" style={{ color: '#0f172a' }}>توقيع رئيس مجلس الإدارة: ........................</p>
                    </div>
                  </div>
                </div>

                <div
                  className="text-center pt-3 flex items-center justify-between text-[10px] font-bold"
                  style={{ borderTop: '1px solid #cbd5e1', color: '#64748b' }}
                >
                  <span>منظومة خيال لإدارة المستودعات والمخزون</span>
                  <span>وثيقة رسمية رقم: {reqNumber}</span>
                  <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History of Requisitions */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>سجل طلبات التوريد المرفوعة لرئيس مجلس الإدارة</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              إجمالي الطلبات المسجلة: {requisitions.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">الموضوع والبيان</th>
                  <th className="p-3.5">مُعد الطلب</th>
                  <th className="p-3.5 text-center">الأهمية</th>
                  <th className="p-3.5 text-center">عدد الأصناف</th>
                  <th className="p-3.5 text-left">إجمالي التكلفة</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                      لا توجد طلبات توريد سابقة محفوظة في السجل.
                    </td>
                  </tr>
                ) : (
                  requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {req.reqNumber}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {req.title}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {req.applicantName}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          req.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {req.priority === 'urgent' ? 'عاجل جداً' : 'هام'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold font-mono">
                        {req.totalItemsCount || req.items?.length || 0}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {(req.totalEstimatedAmount || 0).toLocaleString()} {req.currency || settings.defaultCurrency}
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono">
                        {req.dateStr || new Date(req.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewReq(req)}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            title="معاينة المستند"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReq(req.id)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="حذف من السجل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Selection Modal */}
      {showItemModal && (
        <Modal
          isOpen={showItemModal}
          onClose={() => setShowItemModal(false)}
          title="إضافة صنف لطلب التوريد"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                اختيار مادة مسجلة من المستودع
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-100"
              >
                <option value="">-- اختر مادة من القائمة --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.nameAr} (الرصيد: {m.currentQuantity} {m.unit})
                  </option>
                ))}
              </select>
              {selectedMaterialId && (
                <button
                  onClick={handleAddMaterialItem}
                  className="w-full mt-2 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  إضافة المادة المختارة للطلب
                </button>
              )}
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold">أو إضافة صنف خاص غير مسجل</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  اسم الخامة / الصنف
                </label>
                <input
                  type="text"
                  placeholder="مثال: رول بنر كوري 500 جرام..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    الوحدة
                  </label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    الكمية
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customQty}
                    onChange={(e) => setCustomQty(parseFloat(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    سعر التكلفة التقديري
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 text-center font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleAddCustomItem}
                className="w-full py-2.5 bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                إضافة الصنف الخاص
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* History Item Full Document Preview Modal */}
      {previewReq && (
        <Modal
          isOpen={!!previewReq}
          onClose={() => setPreviewReq(null)}
          title={`معاينة طلب التوريد رقم: ${previewReq.reqNumber}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div
              id="printable-saved-req-doc"
              className="p-8 rounded-xl border dir-rtl font-cairo space-y-6"
              style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
            >
              {/* Executive Top Accent Bar */}
              <div
                className="h-2 rounded-t-md -mt-8 -mx-8 mb-2"
                style={{ background: 'linear-gradient(to right, #d97706, #0f172a, #3730a3)' }}
              />

              <div className="pb-4 flex items-start justify-between gap-4" style={{ borderBottom: '2px solid #0f172a' }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="w-8 h-8 object-contain rounded-lg shrink-0 border border-slate-200 p-0.5 bg-white"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#0f172a', color: '#f59e0b' }}
                      >
                        خ
                      </div>
                    )}
                    <h1 className="text-lg font-black leading-tight" style={{ color: '#0f172a' }}>
                      {settings.companyName || 'مؤسسة الخيال للطباعة والإعلان'}
                    </h1>
                  </div>
                  <p className="text-xs font-extrabold" style={{ color: '#334155' }}>
                    إدارة المستودعات وسلاسل الإمداد - {previewReq.warehouseName}
                  </p>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>
                    {settings.address || 'الرياض - المملكة العربية السعودية'} | هاتف: {settings.phone || '0112345678'}
                  </p>
                </div>
                <div className="text-left font-mono space-y-1 shrink-0">
                  <div
                    className="px-3 py-1 text-xs font-black rounded-lg text-center shadow-xs"
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                  >
                    طلب توريد خامات
                  </div>
                  <div
                    className="text-[11px] font-bold space-y-0.5 mt-1.5 p-2 rounded-lg border text-right dir-rtl"
                    style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                  >
                    <p>رقم الطلب: <span className="font-extrabold" style={{ color: '#312e81' }}>{previewReq.reqNumber}</span></p>
                    <p>التاريخ: <span className="font-semibold">{previewReq.dateStr}</span></p>
                    <p>درجة الأهمية: <span className="font-black" style={{ color: '#be123c' }}>{previewReq.priority === 'urgent' ? 'عاجل جداً' : 'هام'}</span></p>
                  </div>
                </div>
              </div>

              <div
                className="space-y-2 p-4 rounded-xl border"
                style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
              >
                <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <p className="text-xs font-black" style={{ color: '#0f172a' }}>{previewReq.recipient}</p>
                  <span
                    className="px-2.5 py-0.5 rounded text-[10px] font-black"
                    style={{ backgroundColor: '#0f172a', color: '#f59e0b' }}
                  >
                    رئيس مجلس الإدارة
                  </span>
                </div>
                <p className="text-xs leading-relaxed font-medium" style={{ color: '#1e293b' }}>{previewReq.justification}</p>
              </div>

              <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#0f172a' }}>
                <table className="w-full text-right text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <th className="p-2.5" style={{ borderRight: '1px solid #1e293b' }}>كود</th>
                      <th className="p-2.5" style={{ borderRight: '1px solid #1e293b' }}>اسم المادة الخام</th>
                      <th className="p-2.5 text-center" style={{ borderRight: '1px solid #1e293b' }}>الوحدة</th>
                      <th className="p-2.5 text-center font-black" style={{ backgroundColor: '#1e293b', borderRight: '1px solid #334155', color: '#fbbf24' }}>الكمية المطلوبة</th>
                      <th className="p-2.5 text-left">التكلفة التقديرية</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: '#0f172a' }}>
                    {previewReq.items?.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td className="p-2.5 font-mono font-bold" style={{ color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>{it.materialCode}</td>
                        <td className="p-2.5 font-black" style={{ color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>{it.materialName}</td>
                        <td className="p-2.5 text-center" style={{ borderRight: '1px solid #e2e8f0' }}>{it.unit}</td>
                        <td className="p-2.5 text-center font-mono font-black" style={{ backgroundColor: '#fef3c7', color: '#1e1b4b', borderRight: '1px solid #cbd5e1' }}>{it.requestedQuantity}</td>
                        <td className="p-2.5 text-left font-mono font-bold" style={{ color: '#0f172a' }}>{it.totalEstimatedPrice?.toLocaleString()} {previewReq.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ backgroundColor: '#0f172a', color: '#ffffff', borderTop: '2px solid #0f172a' }}>
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right font-black">الإجمالي الكلي التقديري:</td>
                      <td className="p-2.5 text-center font-mono font-black text-sm" style={{ color: '#fbbf24' }}>
                        {previewReq.items?.reduce((a, b) => a + b.requestedQuantity, 0)}
                      </td>
                      <td className="p-2.5 text-left font-mono font-black text-sm" style={{ color: '#fef08a' }}>
                        {previewReq.totalEstimatedAmount?.toLocaleString()} {previewReq.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures & Official Approvals Block */}
              <div className="pt-3 grid grid-cols-2 gap-6" style={{ borderTop: '2px solid #0f172a' }}>
                <div
                  className="p-3 rounded-xl border text-center space-y-3"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                >
                  <p className="text-xs font-black" style={{ color: '#0f172a' }}>مُعد الطلب (أمين المستودع): {previewReq.applicantName}</p>
                  <div className="h-8 w-3/4 mx-auto" style={{ borderBottom: '2px dashed #94a3b8' }} />
                  <p className="text-[10px] font-bold" style={{ color: '#475569' }}>التوقيع والاعتماد الرسمى</p>
                </div>
                <div
                  className="p-3 rounded-xl border-2 space-y-2"
                  style={{ backgroundColor: '#fffbeb', borderColor: '#0f172a', color: '#0f172a' }}
                >
                  <p className="text-xs font-black pb-1" style={{ color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>قرار وتوجيه رئيس مجلس الإدارة:</p>
                  <div className="space-y-1 text-[10px] font-bold" style={{ color: '#0f172a' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 rounded shrink-0" style={{ backgroundColor: '#ffffff', borderColor: '#0f172a' }} />
                      <span>يُعتمد الشراء والتوريد فوراً</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 rounded shrink-0" style={{ backgroundColor: '#ffffff', borderColor: '#0f172a' }} />
                      <span>تُعدل الكميات إلى: ....................</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="text-center pt-2 text-[10px] font-bold"
                style={{ borderTop: '1px solid #cbd5e1', color: '#64748b' }}
              >
                منظومة خيال لإدارة المستودعات والمخزون | وثيقة مرجعية رقم: {previewReq.reqNumber}
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button
                onClick={() => handleExportPDF('printable-saved-req-doc', `طلب_توريد_${previewReq.reqNumber}.pdf`)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير PDF</span>
              </button>

              <button
                onClick={() => setPreviewReq(null)}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 font-bold text-xs rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
