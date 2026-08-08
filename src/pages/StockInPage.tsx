import React, { useState } from 'react';
import { ArrowDownLeft, Package, Building, FileText, CheckCircle2, Search } from 'lucide-react';
import { Material, Supplier, Movement, SystemSettings } from '../types';
import { addStockIn } from '../services/inventoryService';
import { PrintReceipt } from '../components/PrintReceipt';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface StockInPageProps {
  materials: Material[];
  suppliers: Supplier[];
  movements: Movement[];
  settings: SystemSettings;
}

export const StockInPage: React.FC<StockInPageProps> = ({
  materials,
  suppliers,
  movements,
  settings
}) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Print Receipt Modal
  const [recentMovement, setRecentMovement] = useState<Movement | null>(null);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const handleMaterialSelect = (id: string) => {
    setSelectedMaterialId(id);
    const m = materials.find(mat => mat.id === id);
    if (m) {
      setPurchasePrice(m.purchasePrice || m.avgCost || 0);
      setSupplierName(m.supplierName || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      showError('يرجى اختيار المادة المراد توريدها');
      return;
    }
    if (quantity <= 0) {
      showError('كمية التوريد يجب أن تكون أكبر من صفر');
      return;
    }
    if (!currentUser) return;

    setLoading(true);
    try {
      await addStockIn(
        selectedMaterialId,
        quantity,
        purchasePrice,
        invoiceNumber,
        supplierName,
        notes,
        {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        }
      );

      showSuccess('تم إنجاز التوريد وتحديث الرصيد وسعر التكلفة بنجاح!');

      // Find the created movement for printing receipt
      const createdMov: Movement = {
        id: 'IN-' + Date.now(),
        type: 'incoming',
        materialId: selectedMaterialId,
        materialName: selectedMaterial?.nameAr || '',
        materialCode: selectedMaterial?.code || '',
        quantity,
        beforeQuantity: selectedMaterial?.currentQuantity || 0,
        afterQuantity: (selectedMaterial?.currentQuantity || 0) + quantity,
        unitPrice: purchasePrice,
        totalCost: quantity * purchasePrice,
        userId: currentUser.uid,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        supplierName,
        invoiceNumber,
        notes,
        timestamp: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString('ar-EG'),
      };

      setRecentMovement(createdMov);

      // Reset form
      setSelectedMaterialId('');
      setQuantity(1);
      setInvoiceNumber('');
      setNotes('');
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء تسجيل التوريد');
    } finally {
      setLoading(false);
    }
  };

  // Recent incoming movements
  const incomingMovements = movements.filter(m => m.type === 'incoming');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
            <span>تسجيل إدخال مخزني / توريد شحنة جديدة</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إضافة كميات واردة من الموردين وتحديث رصيد الأصناف ومتوسط التكلفة المرجح آلياً
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock In Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Select Material */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اختيار المادة الموردة *
              </label>
              <select
                required
                value={selectedMaterialId}
                onChange={(e) => handleMaterialSelect(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- اضغط لاختيار صنف من المستودع --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nameAr} ({m.code}) - الرصيد الحالي: {m.currentQuantity} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity & Purchase Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الكمية الموردة *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  سعر شراء الوحدة ({settings.defaultCurrency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  التكلفة الإجمالية
                </label>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {(quantity * purchasePrice).toLocaleString()} {settings.defaultCurrency}
                </div>
              </div>
            </div>

            {/* Supplier & Invoice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم المورد / الشركة
                </label>
                <input
                  type="text"
                  placeholder="مثال: مصنع الشرق للرولات"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رقم الفاتورة أو الشحنة
                </label>
                <input
                  type="text"
                  placeholder="INV-9908"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ملاحظات التوريد
              </label>
              <textarea
                rows={2}
                placeholder="تفاصيل الشحنة، رقم الحاوية، حالة الاستلام..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تأكيد وتسجيل إذن التوريد المخزني</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Selected Material Summary Card */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
              معلومات المادة المحددة
            </h3>

            {selectedMaterial ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">اسم المادة:</span>
                  <span className="font-extrabold text-slate-800 dark:text-white text-sm">
                    {selectedMaterial.nameAr}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-slate-400 block">الكود:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedMaterial.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">الباركوود:</span>
                    <span className="font-bold">{selectedMaterial.barcode}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl font-bold flex justify-between">
                  <span className="text-slate-500">الرصيد الحالي:</span>
                  <span className="text-slate-800 dark:text-white">{selectedMaterial.currentQuantity} {selectedMaterial.unit}</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl font-bold flex justify-between text-emerald-700 dark:text-emerald-300">
                  <span>الرصيد بعد التوريد:</span>
                  <span>{selectedMaterial.currentQuantity + quantity} {selectedMaterial.unit}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                قم باختيار مادة من القائمة للاستعراض.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {recentMovement && (
        <Modal
          isOpen={!!recentMovement}
          onClose={() => setRecentMovement(null)}
          title="إذن إدخال مخزني (سند توريد)"
          maxWidth="max-w-xl"
        >
          <PrintReceipt movement={recentMovement} settings={settings} />
        </Modal>
      )}
    </div>
  );
};
