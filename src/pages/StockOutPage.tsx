import React, { useState } from 'react';
import { ArrowUpRight, Package, AlertTriangle, FileText, CheckCircle2, Printer } from 'lucide-react';
import { Material, Project, Movement, SystemSettings } from '../types';
import { withdrawStock } from '../services/inventoryService';
import { PrintReceipt } from '../components/PrintReceipt';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface StockOutPageProps {
  materials: Material[];
  projects: Project[];
  movements: Movement[];
  settings: SystemSettings;
}

export const StockOutPage: React.FC<StockOutPageProps> = ({
  materials,
  projects,
  movements,
  settings
}) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [department, setDepartment] = useState('قسم الطباعة');
  const [projectId, setProjectId] = useState('');
  const [reason, setReason] = useState('تشغيل وإعداد طلبية');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Print Receipt Modal
  const [recentMovement, setRecentMovement] = useState<Movement | null>(null);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const selectedProject = projects.find(p => p.id === projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      showError('يرجى اختيار المادة المراد صرفها');
      return;
    }
    if (quantity <= 0) {
      showError('الكمية المصروفة يجب أن تكون أكبر من صفر');
      return;
    }
    if (selectedMaterial && quantity > selectedMaterial.currentQuantity) {
      showError(`عفواً! الرصيد المتاح حالياً هو (${selectedMaterial.currentQuantity} ${selectedMaterial.unit}) فقط! لا يمكن صرف كمية أكبر.`);
      return;
    }
    if (!currentUser) return;

    setLoading(true);
    try {
      await withdrawStock(
        selectedMaterialId,
        quantity,
        department,
        projectId,
        selectedProject?.name || '',
        reason,
        notes,
        {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        }
      );

      showSuccess('تم خصم الكمية وتسجيل إذن الصرف المخزني بنجاح!');

      const createdMov: Movement = {
        id: 'OUT-' + Date.now(),
        type: 'withdrawal',
        materialId: selectedMaterialId,
        materialName: selectedMaterial?.nameAr || '',
        materialCode: selectedMaterial?.code || '',
        quantity,
        beforeQuantity: selectedMaterial?.currentQuantity || 0,
        afterQuantity: (selectedMaterial?.currentQuantity || 0) - quantity,
        unitPrice: selectedMaterial?.avgCost || selectedMaterial?.purchasePrice || 0,
        totalCost: quantity * (selectedMaterial?.avgCost || selectedMaterial?.purchasePrice || 0),
        userId: currentUser.uid,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        projectId,
        projectName: selectedProject?.name,
        department,
        reason,
        notes,
        timestamp: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString('ar-EG'),
      };

      setRecentMovement(createdMov);

      // Check if current quantity reaches min level
      if (selectedMaterial && (selectedMaterial.currentQuantity - quantity) <= selectedMaterial.minQuantity) {
        showWarning(`تنبيه: أصبحت المادة (${selectedMaterial.nameAr}) عند حد الكفاية الأدنى أو أقل!`);
      }

      // Reset
      setSelectedMaterialId('');
      setQuantity(1);
      setNotes('');
    } catch (err: any) {
      showError(err.message || 'فشل عملية الصرف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-rose-600" />
            <span>إجراء صرف مخزني (إذن خروج)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            صرف المواد والأصناف لأقسام المطبعة والمشاريع مع مراقبة عدم تجاوز الرصيد المتاح وحساب تكلفة المشروع
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Select Material */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اختيار المادة المراد صرفها *
              </label>
              <select
                required
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- اضغط لاختيار صنف من المستودع --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id} disabled={m.currentQuantity <= 0}>
                    {m.nameAr} ({m.code}) - الرصيد المتاح: {m.currentQuantity} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الكمية المطلوبة للصرف *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedMaterial ? selectedMaterial.currentQuantity : undefined}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  القسم المستلم / الطالب
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="قسم الطباعة الأوفست">قسم الطباعة الأوفست</option>
                  <option value="قسم الطباعة الرقمية (الدیجیتال)">قسم الطباعة الرقمية (الدیجیتال)</option>
                  <option value="قسم طباعة اللوحات الخارجية (OutDoor)">قسم طباعة اللوحات الخارجية (OutDoor)</option>
                  <option value="قسم القص بالليزر والـ CNC">قسم القص بالليزر والـ CNC</option>
                  <option value="قسم التشطيب والدمج (Lamination)">قسم التشطيب والدمج (Lamination)</option>
                  <option value="قسم التراكيب والميداني">قسم التراكيب والميداني</option>
                  <option value="قسم التصميم والجرافيك">قسم التصميم والجرافيك</option>
                </select>
              </div>
            </div>

            {/* Project & Reason */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  المشروع المرتبط (لاحتساب التكلفة)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- بدون مشروع محدد (صرف تشغيلي) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.customerName ? `(${p.customerName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  سبب أو بيان الصرف
                </label>
                <input
                  type="text"
                  placeholder="مثال: طباعة بنرات معرض البناء السعودي"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ملاحظات إضافية
              </label>
              <textarea
                rows={2}
                placeholder="اسم الموظف المستلم أو أية تعليمات..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-sm transition-all shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تأكيد خصم الرصيد واستخراج إذن الصرف</span>
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
              ملخص العملية والرصيد المتبقي
            </h3>

            {selectedMaterial ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">اسم الصنف:</span>
                  <span className="font-extrabold text-slate-800 dark:text-white text-sm">
                    {selectedMaterial.nameAr}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl font-bold flex justify-between">
                  <span className="text-slate-500">الرصيد المتاح حالياً:</span>
                  <span className="text-slate-800 dark:text-white">{selectedMaterial.currentQuantity} {selectedMaterial.unit}</span>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl font-bold flex justify-between text-rose-700 dark:text-rose-300">
                  <span>الرصيد بعد الخصم:</span>
                  <span>{selectedMaterial.currentQuantity - quantity} {selectedMaterial.unit}</span>
                </div>

                {selectedMaterial.currentQuantity - quantity <= selectedMaterial.minQuantity && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 rounded-xl flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>سيكون الرصيد عند أو أقل من حد الكفاية الأدنى!</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                اختر مادة من القائمة لاستعراض التفاصيل والرصيد.
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
          title="إذن صرف مخزني (سند خروج)"
          maxWidth="max-w-xl"
        >
          <PrintReceipt movement={recentMovement} settings={settings} />
        </Modal>
      )}
    </div>
  );
};
