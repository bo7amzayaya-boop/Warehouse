import React, { useState } from 'react';
import { Repeat, Sliders, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Material, SystemSettings } from '../types';
import { createAdjustment, transferLocation } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface AdjustmentsPageProps {
  materials: Material[];
  settings: SystemSettings;
}

export const AdjustmentsPage: React.FC<AdjustmentsPageProps> = ({ materials, settings }) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState<'adjustment' | 'transfer'>('adjustment');

  // Adjustment State
  const [adjMaterialId, setAdjMaterialId] = useState('');
  const [newActualQty, setNewActualQty] = useState(0);
  const [adjReason, setAdjReason] = useState('نتيجة الجرد الدوري');
  const [adjLoading, setAdjLoading] = useState(false);

  // Transfer State
  const [transMaterialId, setTransMaterialId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newRackNumber, setNewRackNumber] = useState('');
  const [transNotes, setTransNotes] = useState('');
  const [transLoading, setTransLoading] = useState(false);

  const selectedAdjMaterial = materials.find(m => m.id === adjMaterialId);
  const selectedTransMaterial = materials.find(m => m.id === transMaterialId);

  const handleAdjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjMaterialId) {
      showError('يرجى اختيار المادة المراد تسويتها');
      return;
    }
    if (!adjReason) {
      showError('سبب التسوية إجباري للتوثيق');
      return;
    }
    if (!currentUser) return;

    setAdjLoading(true);
    try {
      await createAdjustment(
        adjMaterialId,
        newActualQty,
        adjReason,
        {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        }
      );
      showSuccess('تمت التسوية المخزنية وتحديث الرصيد الفعلي وسجل الحركة بنجاح!');
      setAdjMaterialId('');
      setNewActualQty(0);
    } catch (err: any) {
      showError(err.message || 'فشلت التسوية المخزنية');
    } finally {
      setAdjLoading(false);
    }
  };

  const handleTransSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transMaterialId || !newLocation) {
      showError('يرجى اختيار المادة وتحديد الموقع الجديد بالكامل');
      return;
    }
    if (!currentUser) return;

    setTransLoading(true);
    try {
      await transferLocation(
        transMaterialId,
        newLocation,
        newRackNumber,
        transNotes,
        {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        }
      );
      showSuccess('تم نقل المادة للموقع الجديد وتسجيل الحركة بنجاح!');
      setTransMaterialId('');
      setNewLocation('');
      setNewRackNumber('');
    } catch (err: any) {
      showError(err.message || 'فشلت عملية النقل');
    } finally {
      setTransLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Repeat className="w-6 h-6 text-indigo-600" />
            <span>تسوية الجرد ونقل مواقع التخزين</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تصحيح الفروقات الجردية وتعديل مواقع الأرفف والأقسام داخل مستودع الخيال
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
          <button
            onClick={() => setActiveTab('adjustment')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'adjustment'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            تسوية جردية (تعديل رصيد)
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'transfer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            نقل موقع التخزين والرفوف
          </button>
        </div>
      </div>

      {activeTab === 'adjustment' ? (
        /* Inventory Adjustment Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-xs">
            <form onSubmit={handleAdjSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختر المادة المراد تسويتها *
                </label>
                <select
                  required
                  value={adjMaterialId}
                  onChange={(e) => {
                    setAdjMaterialId(e.target.value);
                    const mat = materials.find(m => m.id === e.target.value);
                    if (mat) setNewActualQty(mat.currentQuantity);
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- اختر صنف للبدء --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nameAr} ({m.code}) - الرصيد الدفتري الحالي: {m.currentQuantity} {m.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAdjMaterial && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 grid grid-cols-2 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-slate-400 block font-normal">الرصيد النظامي الدفتري:</span>
                    <span className="text-base text-slate-800 dark:text-white">
                      {selectedAdjMaterial.currentQuantity} {selectedAdjMaterial.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-normal">الفارق بعد التعديل:</span>
                    <span className={`text-base ${
                      newActualQty - selectedAdjMaterial.currentQuantity > 0 ? 'text-emerald-600' : newActualQty - selectedAdjMaterial.currentQuantity < 0 ? 'text-rose-600' : 'text-slate-600'
                    }`}>
                      {newActualQty - selectedAdjMaterial.currentQuantity > 0 ? `+${newActualQty - selectedAdjMaterial.currentQuantity}` : newActualQty - selectedAdjMaterial.currentQuantity} {selectedAdjMaterial.unit}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الرصيد الفعلي الجديد (نتيجة الجرد) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newActualQty}
                  onChange={(e) => setNewActualQty(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  سبب وتبرير التسوية الجردية (مطلوب رقابياً) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تلف مادة أثناء النقل / خطأ قيد سابق / جرد سنوي"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={adjLoading}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-sm transition-all shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adjLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تأكيد اعتماد التسوية الجردية</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Location Transfer Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-xs">
            <form onSubmit={handleTransSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختر المادة المراد نقل موقعها *
                </label>
                <select
                  required
                  value={transMaterialId}
                  onChange={(e) => {
                    setTransMaterialId(e.target.value);
                    const mat = materials.find(m => m.id === e.target.value);
                    if (mat) {
                      setNewLocation(mat.location || '');
                      setNewRackNumber(mat.rackNumber || '');
                    }
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- اختر صنف --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nameAr} ({m.code}) - الموقع الحالي: {m.location || 'غير محدد'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الموقع / الجناح الجديد *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مستودع ب - القسم 3"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الرف الجديد
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: B3-4"
                    value={newRackNumber}
                    onChange={(e) => setNewRackNumber(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ملاحظات أو سبب نقل الموقع
                </label>
                <input
                  type="text"
                  placeholder="مثال: إعادة تنظيم الرفوف"
                  value={transNotes}
                  onChange={(e) => setTransNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={transLoading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {transLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>تأكيد نقل موقع الصنف</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
