import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Building,
  DollarSign,
  PackageCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit
} from 'lucide-react';
import { Project, Movement, SystemSettings } from '../types';
import { Modal } from '../components/Modal';
import { addProject, updateProject, deleteProject } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface ProjectsPageProps {
  projects: Project[];
  movements: Movement[];
  settings: SystemSettings;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  movements,
  settings
}) => {
  const { currentUser, canEditMaterials, canDelete } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<Project | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState<'in_progress' | 'completed' | 'cancelled'>('in_progress');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.customerName && p.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingProject(null);
    setName('');
    setCode('PRJ-' + Math.floor(100 + Math.random() * 900));
    setCustomerName('');
    setStatus('in_progress');
    setDescription('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setCode(p.code || '');
    setCustomerName(p.customerName || '');
    setStatus(p.status);
    setDescription(p.description || '');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showError('يرجى تعبئة اسم المشروع');
      return;
    }
    if (!currentUser) return;

    setLoading(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name,
          code,
          customerName,
          status,
          description,
        });
        showSuccess('تم تحديث بيانات المشروع بنجاح');
      } else {
        await addProject({
          name,
          code,
          customerName,
          status,
          description,
          totalMaterialCost: 0,
          createdDate: new Date().toLocaleDateString('ar-EG'),
          createdAt: new Date().toISOString(),
        });
        showSuccess('تم إضافة المشروع الجديد بنجاح');
      }
      setShowAddModal(false);
    } catch (err: any) {
      showError(err.message || 'فشلت العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete || !currentUser) return;
    try {
      await deleteProject(id);
      showSuccess('تم حذف المشروع بنجاح');
    } catch (e) {
      showError('فشل حذف المشروع');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-indigo-600" />
            <span>مشاريع الطباعة والدعاية والإعلان ({filteredProjects.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ربط المسحوبات المخزنية بالمشاريع لحساب التكلفة الفعلية للمستلزمات والمواد بدقة
          </p>
        </div>

        {canEditMaterials && (
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مشروع جديد</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث باسم المشروع، كود المشروع، أو اسم العميل..."
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-4 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
        <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
            لا توجد مشاريع مسجلة حالياً. قم بإنشاء مشروع جديد لربط سحب المواد به.
          </div>
        ) : (
          filteredProjects.map(proj => {
            // Calculate total costs for this project from withdrawals
            const projMovements = movements.filter(m => m.projectId === proj.id && m.type === 'withdrawal');
            const totalCalculatedCost = projMovements.reduce((acc, m) => acc + (m.totalCost || 0), 0);

            return (
              <div
                key={proj.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">
                      {proj.code || 'PRJ'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      proj.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : proj.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {proj.status === 'completed' ? 'مكتمل' : proj.status === 'in_progress' ? 'قيد التنفيذ' : 'ملغي'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    {proj.name}
                  </h3>

                  {proj.customerName && (
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      <span>العميل: {proj.customerName}</span>
                    </p>
                  )}
                </div>

                {/* Material Cost Summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>عدد المسحوبات:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{projMovements.length} عملية</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>إجمالي تكلفة المواد:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {totalCalculatedCost.toLocaleString()} {settings.defaultCurrency}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedProjectDetails(proj)}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    عرض كشف المسحوبات
                  </button>

                  <div className="flex items-center gap-1">
                    {canEditMaterials && (
                      <button
                        onClick={() => handleOpenEdit(proj)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(proj.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Project Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingProject ? 'تعديل بيانات المشروع' : 'إنشاء مشروع جديد'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">اسم المشروع *</label>
            <input
              type="text"
              required
              placeholder="مثال: طباعة وتجهيز جناح معرض بيبان 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">كود المشروع</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">اسم العميل</label>
              <input
                type="text"
                placeholder="شركة المعارض الوطنية"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">حالة المشروع</label>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
            >
              <option value="in_progress">قيد التنفيذ والعمل</option>
              <option value="completed">مكتمل ومسلم بالكامل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">وصف أو ملاحظات المشروع</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              حفظ بيانات المشروع
            </button>
          </div>
        </form>
      </Modal>

      {/* Selected Project Movements Modal */}
      {selectedProjectDetails && (
        <Modal
          isOpen={!!selectedProjectDetails}
          onClose={() => setSelectedProjectDetails(null)}
          title={`كشف المسحوبات للمشروع: ${selectedProjectDetails.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between font-bold">
              <span>العميل: {selectedProjectDetails.customerName || 'عام'}</span>
              <span className="text-emerald-600">
                إجمالي تكلفة المواد: {
                  movements
                    .filter(m => m.projectId === selectedProjectDetails.id && m.type === 'withdrawal')
                    .reduce((acc, m) => acc + (m.totalCost || 0), 0)
                    .toLocaleString()
                } {settings.defaultCurrency}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">
                    <th className="p-2.5">المادة المصروفة</th>
                    <th className="p-2.5">الكمية</th>
                    <th className="p-2.5">التكلفة</th>
                    <th className="p-2.5">المسؤول</th>
                    <th className="p-2.5">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                  {movements
                    .filter(m => m.projectId === selectedProjectDetails.id && m.type === 'withdrawal')
                    .map(m => (
                      <tr key={m.id}>
                        <td className="p-2.5 font-bold">{m.materialName}</td>
                        <td className="p-2.5 font-bold">{m.quantity}</td>
                        <td className="p-2.5 font-mono text-emerald-600">{m.totalCost?.toLocaleString()} {settings.defaultCurrency}</td>
                        <td className="p-2.5">{m.userName}</td>
                        <td className="p-2.5 font-mono text-slate-400">{m.dateStr}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
