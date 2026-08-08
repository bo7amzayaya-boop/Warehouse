import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Barcode,
  Edit,
  Trash2,
  Star,
  QrCode,
  MapPin,
  Building,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Download,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import { Material, Category, Unit, Supplier, SystemSettings } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { exportToPDF } from '../utils/pdfExporter';
import { BarcodeGenerator } from '../components/BarcodeGenerator';
import { addMaterial, updateMaterial, deleteMaterial } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface MaterialsPageProps {
  materials: Material[];
  categories: Category[];
  units: Unit[];
  suppliers: Supplier[];
  settings: SystemSettings;
}

export const MaterialsPage: React.FC<MaterialsPageProps> = ({
  materials,
  categories,
  units,
  suppliers,
  settings,
}) => {
  const { currentUser, canEditMaterials, canDelete } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Deduplicate categories by nameAr
  const uniqueCategories: Category[] = Array.from(
    new Map<string, Category>(categories.map((c) => [(c.nameAr || '').trim().toLowerCase(), c])).values()
  );

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [barcodeMaterial, setBarcodeMaterial] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialFormData = {
    code: '',
    barcode: '',
    nameAr: '',
    nameEn: '',
    categoryId: '',
    categoryName: '',
    unit: 'متر',
    currentQuantity: 0,
    minQuantity: 5,
    maxQuantity: 100,
    avgCost: 0,
    purchasePrice: 0,
    supplierName: '',
    location: 'مستودع أ - الرف 1',
    rackNumber: 'A1',
    description: '',
    image: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  // Filtered Materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch =
      m.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.supplierName && m.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || m.categoryId === selectedCategory || m.categoryName === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || m.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenAdd = () => {
    setFormData({
      ...initialFormData,
      code: 'MAT-' + Math.floor(1000 + Math.random() * 9000),
      barcode: '6291' + Math.floor(100000 + Math.random() * 900000),
      categoryId: categories[0]?.id || 'banner',
      categoryName: categories[0]?.nameAr || 'بنر',
      unit: units[0]?.nameAr || 'رول',
    });
    setEditingMaterial(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (mat: Material) => {
    setEditingMaterial(mat);
    setFormData({
      code: mat.code,
      barcode: mat.barcode,
      nameAr: mat.nameAr,
      nameEn: mat.nameEn || '',
      categoryId: mat.categoryId,
      categoryName: mat.categoryName,
      unit: mat.unit,
      currentQuantity: mat.currentQuantity,
      minQuantity: mat.minQuantity,
      maxQuantity: mat.maxQuantity,
      avgCost: mat.avgCost,
      purchasePrice: mat.purchasePrice,
      supplierName: mat.supplierName || '',
      location: mat.location || '',
      rackNumber: mat.rackNumber || '',
      description: mat.description || '',
      image: mat.image || '',
    });
    setShowAddModal(true);
  };

  const handleToggleFavorite = async (mat: Material) => {
    if (!currentUser) return;
    try {
      await updateMaterial(mat.id, { isFavorite: !mat.isFavorite }, {
        uid: currentUser.uid,
        name: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role,
      });
      showSuccess(mat.isFavorite ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة للمفضلة');
    } catch (e) {
      showError('فشل تحديث المفضلة');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr || !formData.code) {
      showError('يرجى تعبئة اسم المادة وكود المادة بشكل صحيح');
      return;
    }
    if (!currentUser) return;

    setSubmitting(true);
    try {
      const catObj = categories.find(c => c.id === formData.categoryId);
      const categoryName = catObj ? catObj.nameAr : formData.categoryName || 'عام';

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, {
          ...formData,
          categoryName,
        }, {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        });
        showSuccess('تم تحديث بيانات المادة بنجاح!');
      } else {
        await addMaterial({
          ...formData,
          categoryName,
        }, {
          uid: currentUser.uid,
          name: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        });
        showSuccess('تم إضافة المادة الجديدة للمستودع بنجاح!');
      }
      setShowAddModal(false);
    } catch (err: any) {
      showError(err.message || 'حدث خطأ أثناء حفظ المادة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMaterial || !currentUser) return;
    setSubmitting(true);
    try {
      await deleteMaterial(deletingMaterial.id, {
        uid: currentUser.uid,
        name: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role,
      });
      showSuccess('تم حذف المادة بنجاح');
      setDeletingMaterial(null);
    } catch (err: any) {
      showError(err.message || 'تعذر حذف المادة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            <span>إدارة مواد ومستلزمات المستودع ({filteredMaterials.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            استعراض جميع أصناف مواد الطباعة والإعلان مع إمكانية التصفية والبحث واستخراج الباركوود
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => exportToPDF('printable-materials-container', { filename: 'قائمة_مواد_المستودع.pdf', landscape: true })}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>تصدير PDF</span>
          </button>

          {canEditMaterials && (
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف / مادة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative col-span-1 sm:col-span-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المادة، الكود، الباركوود، أو اسم المورد..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-4 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
        </div>

        {/* Category Dropdown */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            <option value="ALL">جميع الأقسام ({uniqueCategories.length})</option>
            {uniqueCategories.map(c => (
              <option key={c.id} value={c.nameAr}>{c.nameAr}</option>
            ))}
          </select>
        </div>

        {/* Status Dropdown + View Toggle */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="in_stock">متوفر بالسعة الكاملة</option>
            <option value="low_stock">حد الكفاية الأدنى</option>
            <option value="out_of_stock">منتهي الرصيد</option>
          </select>

          <div className="flex items-center p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="عرض شبكي"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="عرض جدول"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or Table Display */}
      <div id="printable-materials-container">
        {/* Printable Header Banner */}
        <div className="mb-4 p-4 bg-slate-50 text-slate-900 rounded-2xl border border-slate-300 flex justify-between items-center">
          <div>
            <h2 className="text-base font-black leading-tight text-slate-900">قائمة أصناف ومواد المستودع</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              إجمالي عدد الأصناف: {filteredMaterials.length} صنف | تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
          <div className="text-left font-mono">
            <span className="text-xs font-bold text-indigo-700 block">{settings.companyName}</span>
            <span className="text-[10px] text-slate-500">إدارة خامات المستودع</span>
          </div>
        </div>

      {filteredMaterials.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
            لم يتم العثور على أي مواد مطابقة للبحث
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            جرب تغيير كلمات البحث أو تغيير اختيار القسم والحالة.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMaterials.map(mat => {
            let statusBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
            let statusText = 'متوفر';
            if (mat.status === 'low_stock') {
              statusBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
              statusText = 'حد كفاية أدنى';
            } else if (mat.status === 'out_of_stock') {
              statusBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
              statusText = 'نفد من المستودع';
            }

            return (
              <div
                key={mat.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                {/* Favorite Star */}
                <button
                  onClick={() => handleToggleFavorite(mat)}
                  className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                >
                  <Star className={`w-4 h-4 ${mat.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                </button>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 pr-2">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md font-mono">
                      {mat.code}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${statusBadge}`}>
                      {statusText}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {mat.nameAr}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {mat.description || `قسم: ${mat.categoryName}`}
                  </p>
                </div>

                {/* Stock Stats */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">الرصيد الحالى</span>
                    <span className="font-black text-slate-800 dark:text-white text-sm">
                      {mat.currentQuantity} <span className="text-xs font-normal">{mat.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">التكلفة / وحدة</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs font-mono">
                      {mat.avgCost || mat.purchasePrice || 0} {settings.defaultCurrency}
                    </span>
                  </div>
                </div>

                {/* Footer Meta & Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{mat.location || 'A1'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setBarcodeMaterial(mat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                      title="طباعة باركوود الصنف"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                    {canEditMaterials && (
                      <button
                        onClick={() => handleOpenEdit(mat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                        title="تعديل المادة"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeletingMaterial(mat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                        title="حذف المادة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3.5 px-4">كود المادة</th>
                  <th className="py-3.5 px-4">الباركوود</th>
                  <th className="py-3.5 px-4">اسم المادة / الصنف</th>
                  <th className="py-3.5 px-4">القسم</th>
                  <th className="py-3.5 px-4">الرصيد المتاح</th>
                  <th className="py-3.5 px-4">سعر الشراء / متوسط التكلفة</th>
                  <th className="py-3.5 px-4">الموقع بالمستودع</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center no-print">خيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {filteredMaterials.map(mat => (
                  <tr key={mat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                      {mat.code}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {mat.barcode}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-800 dark:text-white">
                      {mat.nameAr}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {mat.categoryName}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-indigo-600 dark:text-indigo-400">
                      {mat.currentQuantity} {mat.unit}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {mat.avgCost || mat.purchasePrice || 0} {settings.defaultCurrency}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {mat.location || 'عام'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        mat.status === 'in_stock' ? 'bg-emerald-100 text-emerald-800' : mat.status === 'low_stock' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {mat.status === 'in_stock' ? 'متوفر' : mat.status === 'low_stock' ? 'منخفض' : 'نفد'}
                      </span>
                    </td>
                    <td className="py-3 px-4 no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setBarcodeMaterial(mat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        {canEditMaterials && (
                          <button
                            onClick={() => handleOpenEdit(mat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingMaterial(mat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Add / Edit Material Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingMaterial ? 'تعديل بيانات مادة' : 'إضافة مادة / صنف جديد'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">كود المادة (فريد)</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">الباركوود (فريد)</label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">اسم المادة باللغة العربية *</label>
            <input
              type="text"
              required
              placeholder="مثال: رول بنر 440 جرام - 3.20م × 50م"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">القسم / التصنيف *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  const cat = categories.find(c => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    categoryId: e.target.value,
                    categoryName: cat?.nameAr || 'عام'
                  });
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              >
                {uniqueCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.nameAr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">وحدة القياس *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              >
                {units.map(u => (
                  <option key={u.id} value={u.nameAr}>{u.nameAr} ({u.symbol})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">الرصيد الحالي</label>
              <input
                type="number"
                min="0"
                value={formData.currentQuantity}
                onChange={(e) => setFormData({ ...formData, currentQuantity: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">حد الكفاية الأدنى</label>
              <input
                type="number"
                min="0"
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">سعر الشراء المتوقع</label>
              <input
                type="number"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">المورد الافتراضي</label>
              <input
                type="text"
                placeholder="اسم شركة توريد الورق أو الأحبار"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">مكان التخزين بالمستودع</label>
              <input
                type="text"
                placeholder="مستودع أ - الرف 2"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">الوصف والمواصفات الفنية</label>
            <textarea
              rows={2}
              placeholder="مثال: مادة صلبة، سمك 5 مم، مقاومة للحرارة والماء"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {editingMaterial ? 'حفظ التعديلات' : 'إضافة المادة للمستودع'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Barcode & QR Code Label Printer Modal */}
      {barcodeMaterial && (
        <Modal
          isOpen={!!barcodeMaterial}
          onClose={() => setBarcodeMaterial(null)}
          title="بطاقة الباركوود وملصق التمييز"
          maxWidth="max-w-md"
        >
          <BarcodeGenerator material={barcodeMaterial} companyName={settings.companyName} />
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingMaterial && (
        <ConfirmDialog
          isOpen={!!deletingMaterial}
          onClose={() => setDeletingMaterial(null)}
          onConfirm={handleDeleteConfirm}
          title="حذف مادة من المستودع"
          message={`هل أنت متأكد من حذف المادة (${deletingMaterial.nameAr}) الكود: ${deletingMaterial.code}؟ لا يمكن حذف مادة إذا كانت تمتلك حركات صرف أو توريد سابقة.`}
          confirmText="تأكيد الحذف النهائي"
          isLoading={submitting}
        />
      )}
    </div>
  );
};
