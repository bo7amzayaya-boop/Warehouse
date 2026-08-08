import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Image as ImageIcon,
  Trash2,
  UserCog,
  Plus,
  Shield,
  UserX,
  UserCheck,
  UserPlus,
  Users,
  Layers,
  Database,
  Eraser,
  Sparkles,
  FolderX
} from 'lucide-react';
import { SystemSettings, UserProfile, UserRole, Category } from '../types';
import {
  updateSystemSettings,
  cleanDuplicateCategories,
  clearAllDatabaseEntries,
  subscribeCategories,
  addCategory,
  deleteCategory
} from '../services/inventoryService';
import { exportFullDatabaseBackup, importFullDatabaseBackup } from '../services/backupService';
import {
  subscribeUsers,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount
} from '../services/authService';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface SettingsPageProps {
  settings: SystemSettings;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [companyName, setCompanyName] = useState(settings.companyName || 'مؤسسة الخيال للطباعة والإعلان');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [address, setAddress] = useState(settings.address || 'الرياض - المملكة العربية السعودية');
  const [phone, setPhone] = useState(settings.phone || '0500000000');
  const [email, setEmail] = useState(settings.email || 'info@khayal.com');
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency || 'ر.س');
  const [loading, setLoading] = useState(false);

  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFileData, setImportFileData] = useState<any>(null);

  // User Management State inside Settings
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userPhone, setUserPhone] = useState('');
  const [userDepartment, setUserDepartment] = useState('المستودع');
  const [userNotes, setUserNotes] = useState('');
  const [userSubmitting, setUserSubmitting] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName || 'مؤسسة الخيال للطباعة والإعلان');
    setLogoUrl(settings.logoUrl || '');
    setAddress(settings.address || 'الرياض - المملكة العربية السعودية');
    setPhone(settings.phone || '0500000000');
    setEmail(settings.email || 'info@khayal.com');
    setDefaultCurrency(settings.defaultCurrency || 'ر.س');
  }, [settings]);

  // Categories & Database Management State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [isCleaningCats, setIsCleaningCats] = useState(false);
  const [showWipeDbConfirm, setShowWipeDbConfirm] = useState(false);
  const [isWipingDb, setIsWipingDb] = useState(false);

  useEffect(() => {
    const unsubCats = subscribeCategories(setCategories);
    return () => unsubCats();
  }, []);

  const handleCleanDuplicates = async () => {
    setIsCleaningCats(true);
    try {
      const removedCount = await cleanDuplicateCategories();
      if (removedCount > 0) {
        showSuccess(`تم حذف وتنظيف ${removedCount} قسم/تصنيف مكرر بنجاح!`);
      } else {
        showSuccess('جميع الأقسام والتصنيفات فريدة ومميزة الآن، لا يقع أي تكرار!');
      }
    } catch (err) {
      showError('فشلت عملية تنظيف الأقسام المكررة');
    } finally {
      setIsCleaningCats(false);
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameAr.trim()) {
      showError('يرجى ادخال اسم القسم أو التصنيف');
      return;
    }

    try {
      await addCategory({
        nameAr: newCatNameAr.trim(),
        nameEn: '',
        description: 'قسم / تصنيف مخصص'
      });
      showSuccess('تم إضافة القسم الجديد بنجاح');
      setNewCatNameAr('');
    } catch (err: any) {
      showError(err.message || 'فشلت إضافة القسم');
    }
  };

  const handleDeleteCategoryItem = async (catId: string, nameAr: string) => {
    if (!window.confirm(`هل أنت تأكد من رغبتك في حذف القسم (${nameAr})؟`)) return;
    try {
      await deleteCategory(catId);
      showSuccess('تم حذف القسم بنجاح');
    } catch (err) {
      showError('فشل حذف القسم');
    }
  };

  const handleWipeDatabaseConfirm = async () => {
    setIsWipingDb(true);
    try {
      await clearAllDatabaseEntries(true);
      showSuccess('تم مسح كافة المدخلات والبيانات بالكامل من قاعدة البيانات (قاعدة البيانات فاضية الآن).');
      setShowWipeDbConfirm(false);
    } catch (err: any) {
      showError(err.message || 'فشلت عملية تفريغ قاعدة البيانات');
    } finally {
      setIsWipingDb(false);
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFullName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('employee');
    setUserPhone('');
    setUserDepartment('المستودع');
    setUserNotes('');
    setShowAddUserModal(true);
  };

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setUserFullName(u.fullName || '');
    setUserEmail(u.email || '');
    setUserPassword('');
    setUserRole(u.role || 'employee');
    setUserPhone(u.phone || '');
    setUserDepartment(u.department || 'المستودع');
    setUserNotes(u.notes || '');
    setShowAddUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName || !userEmail) {
      showError('يرجى كتابة الاسم والبريد الإلكتروني');
      return;
    }

    setUserSubmitting(true);
    try {
      if (editingUser) {
        await updateUserAccount(
          editingUser.uid,
          {
            fullName: userFullName,
            role: userRole,
            phone: userPhone,
            department: userDepartment,
            notes: userNotes,
          },
          currentUser || undefined
        );
        showSuccess('تم تحديث بيانات وصلاحيات المستخدم بنجاح');
      } else {
        if (!userPassword || userPassword.length < 6) {
          showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          setUserSubmitting(false);
          return;
        }
        await createUserAccount(
          {
            fullName: userFullName,
            email: userEmail,
            password: userPassword,
            role: userRole,
            phone: userPhone,
            department: userDepartment,
            notes: userNotes,
          },
          currentUser || undefined
        );
        showSuccess('تم إضافة وإنشاء حساب المستخدم الجديد بنجاح');
      }
      setShowAddUserModal(false);
    } catch (err: any) {
      showError(err.message || 'فشلت عملية حفظ المستخدم');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (u: UserProfile) => {
    try {
      const isCurrentlyDisabled = u.isDisabled || u.status === 'disabled';
      await updateUserAccount(
        u.uid,
        {
          isDisabled: !isCurrentlyDisabled,
          status: isCurrentlyDisabled ? 'active' : 'disabled',
        },
        currentUser || undefined
      );
      showSuccess(isCurrentlyDisabled ? 'تم تفعيل حساب المستخدم' : 'تم تعطيل حساب المستخدم');
    } catch (err) {
      showError('فشل تغيير حالة الحساب');
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (!window.confirm(`هل أنت تأكد من رغبتك في حذف المستخدم (${u.fullName})؟`)) return;
    try {
      await deleteUserAccount(u.uid, currentUser || undefined);
      showSuccess('تم حذف المستخدم بنجاح');
    } catch (err: any) {
      showError(err.message || 'فشل حذف المستخدم');
    }
  };

  const getRoleBadgeLabel = (r: UserRole) => {
    if (r === 'super_admin') return 'مدير النظام (سوبر أدمن)';
    if (r === 'warehouse_manager') return 'مدير المستودع';
    if (r === 'employee') return 'موظف مستودع';
    return 'مراقب (مشاهدة فقط)';
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('يرجى اختيار ملف صورة صالحة (PNG, JPG, WEBP, SVG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      if (file.type.includes('svg')) {
        setLogoUrl(dataUrl);
        showSuccess('تم اختيار شعار SVG بنجاح');
        return;
      }

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
          setLogoUrl(resizedDataUrl);
        } else {
          setLogoUrl(dataUrl);
        }
        showSuccess('تم تحميل ومعالجة صورة الشعار بنجاح');
      };
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    showSuccess('تم إزالة الشعار، يرجى حفظ الإعدادات لتطبيق التغييرات');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSystemSettings({
        companyName,
        logoUrl,
        address,
        phone,
        email,
        defaultCurrency,
      });
      showSuccess('تم حفظ إعدادات النظام وشعار الشركة بنجاح');
    } catch (err: any) {
      showError('تعذر حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      await exportFullDatabaseBackup();
      showSuccess('تم تصدير النسخة الاحتياطية وتنزيل ملف JSON بنجاح!');
    } catch (e) {
      showError('فشل تصدير النسخة الاحتياطية');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setImportFileData(json);
        setShowImportConfirm(true);
      } catch (err) {
        showError('ملف النسخة الاحتياطية غير صالح (JSON متضرر)');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importFileData) return;
    setLoading(true);
    try {
      await importFullDatabaseBackup(importFileData);
      showSuccess('تم استرجاع واستعادة النسخة الاحتياطية بنجاح في قاعدة البيانات!');
      setShowImportConfirm(false);
      window.location.reload();
    } catch (e: any) {
      showError(e.message || 'فشلت استعادة النسخة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>إعدادات النظام والنسخ الاحتياطي</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            بيانات المنشأة، العملة الافتراضية، وتصدير واسترجاع قاعدة البيانات كاملة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-xs space-y-5">
          <h3 className="font-extrabold text-slate-800 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-3">
            بيانات المنشأة والسندات المطبوعة
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-semibold">
            {/* Logo Upload Section */}
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 space-y-3">
              <label className="block text-slate-800 dark:text-slate-200 font-extrabold text-xs">
                شعار الشركة / المؤسسة
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview Box */}
                <div className="relative w-24 h-24 rounded-xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center p-2 shrink-0 shadow-xs overflow-hidden group">
                  {logoUrl ? (
                    <>
                      <img src={logoUrl} alt="شعار الشركة" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        title="إزالة الشعار"
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 shadow-md opacity-90 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 dark:text-slate-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-60" />
                      <span className="text-[10px] block font-bold">بلا شعار</span>
                    </div>
                  )}
                </div>

                {/* Upload Action & Notes */}
                <div className="flex-1 space-y-2 text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>اختيار صورة من الجهاز</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                    </label>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إزالة الشعار</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    يتم حفظ الشعار ليظهر في القائمة الجانبية، خطابات طلب التوريد، والسندات المطبوعة.
                    <br />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">الصيغ المدعومة: PNG, JPG, WEBP, SVG.</span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">اسم المؤسسة / المستودع الرئيسي *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">العملة الافتراضية</label>
                <input
                  type="text"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني للشركة</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">العنوان والموقع</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </form>
        </div>

        {/* Backup, Categories & Maintenance Panel */}
        <div className="space-y-4">
          {/* Backup & Restore Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
              النسخ الاحتياطي والاسترجاع
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              تصدير نسخة احتياطية شاملة لجميع المواد، الحركات، المشاريع، والأقسام بصيغة JSON آمنة.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleExportBackup}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة احتياطية (Download JSON)</span>
              </button>

              {isSuperAdmin && (
                <div>
                  <label className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-100 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-600">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>استرجاع نسخة احتياطية من ملف</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Category Deduplication & Management Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>إدارة وتنظيف الأقسام / التصنيفات ({categories.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleCleanDuplicates}
                disabled={isCleaningCats}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>{isCleaningCats ? 'جاري التنظيف...' : 'مسح وإلغاء المكررات'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              إضافة قسم/تصنيف فريد، وإلغاء أي أقسام مكررة أوتوماتيكياً لضمان سلامة الفهرسة.
            </p>

            <form onSubmit={handleAddCategorySubmit} className="flex gap-2">
              <input
                type="text"
                value={newCatNameAr}
                onChange={(e) => setNewCatNameAr(e.target.value)}
                placeholder="اسم القسم الجديد (مثال: أكريليك، ورق...)"
                className="flex-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-lg flex items-center gap-1.5"
                >
                  <span>{c.nameAr}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategoryItem(c.id, c.nameAr)}
                    className="text-slate-400 hover:text-rose-500"
                    title="حذف القسم"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Database Wipe Panel */}
          {isSuperAdmin && (
            <div className="bg-rose-50/70 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-5 shadow-xs space-y-3">
              <h3 className="font-extrabold text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-rose-600" />
                <span>تفريغ قاعدة البيانات بالكامل (مسح المدخلات)</span>
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                مسح وتنظيف كافة المواد، حركات المخزون، طلبات الشراء، والمشاريع وتفريغ قاعدة البيانات كلياً لتبدأ فارغة من الصفر.
              </p>

              <button
                type="button"
                onClick={() => setShowWipeDbConfirm(true)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all"
              >
                <FolderX className="w-4 h-4" />
                <span>مسح كافة المدخلات وتفريغ قاعدة البيانات</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Users Management Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-600" />
              <span>إدارة وإضافة مستخدمي المنظومة</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              إضافة مستخدم جديد، تحديد أدوار الصلاحيات (سوبر أدمن، مدير مستودع، موظف، مراقب)، وتحديث أو تعطيل الحسابات
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddUser}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">الاسم الكامل</th>
                <th className="p-3">البريد الإلكتروني</th>
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">القسم / الإدارة</th>
                <th className="p-3">الدور والصلاحية</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              {usersLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    جاري تحميل قيد المستخدمين...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا يوجد مستخدمون مسجلون حتى الآن. اضغط فوق "إضافة مستخدم جديد" لإنشاء أول حساب.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isDisabled = u.isDisabled || u.status === 'disabled';
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="p-3 font-extrabold text-slate-800 dark:text-white">
                        {u.fullName}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {u.phone || '-'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {u.department || 'المستودع'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-block ${
                            u.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : u.role === 'warehouse_manager'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : u.role === 'employee'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {getRoleBadgeLabel(u.role)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-block ${
                            isDisabled
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isDisabled ? 'معطل' : 'نشط'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            title={isDisabled ? 'تفعيل الحساب' : 'تعطيل الحساب'}
                          >
                            {isDisabled ? (
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <UserX className="w-4 h-4 text-amber-600" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            title="تعديل البيانات والصلاحيات"
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {currentUser?.uid !== u.uid && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit User */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title={editingUser ? 'تعديل بيانات وصلاحيات المستخدم' : 'إضافة مستخدم جديد إلى المنظومة'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUserSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل للمستخدم *</label>
            <input
              type="text"
              required
              value={userFullName}
              onChange={(e) => setUserFullName(e.target.value)}
              placeholder="مثال: محمد أحمد علي"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              required
              disabled={!!editingUser}
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono disabled:opacity-50"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">كلمة المرور *</label>
              <input
                type="password"
                required
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">دور الصلاحية بالنظام *</label>
            <select
              value={userRole}
              onChange={(e: any) => setUserRole(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-bold"
            >
              <option value="super_admin">مدير النظام (سوبر أدمن - صلاحيات كاملة)</option>
              <option value="warehouse_manager">مدير المستودع (إدارة المواد والطلبات)</option>
              <option value="employee">موظف مستودع (صرف وتوريد)</option>
              <option value="viewer">مراقب (صلاحية استعراض فقط)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف / الجوال</label>
              <input
                type="text"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="0500000000"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">القسم / الإدارة</label>
              <input
                type="text"
                value={userDepartment}
                onChange={(e) => setUserDepartment(e.target.value)}
                placeholder="مثال: إشراف المستودع"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="أي ملاحظات حول صلاحيات هذا المستخدم"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={userSubmitting}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {userSubmitting ? 'جاري الحفظ...' : editingUser ? 'تحديث البيانات' : 'حفظ وإنشاء الحساب'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Import Backup Dialog */}
      {showImportConfirm && (
        <ConfirmDialog
          isOpen={showImportConfirm}
          onClose={() => setShowImportConfirm(false)}
          onConfirm={handleConfirmImport}
          title="تأكيد استرجاع النسخة الاحتياطية"
          message="تحذير: سيتم دمج أو استبدال البيانات الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية. هل تريد المتابعة؟"
          confirmText="تأكيد الاسترجاع الان"
          isLoading={loading}
        />
      )}

      {/* Confirm Wipe Database Dialog */}
      {showWipeDbConfirm && (
        <ConfirmDialog
          isOpen={showWipeDbConfirm}
          onClose={() => setShowWipeDbConfirm(false)}
          onConfirm={handleWipeDatabaseConfirm}
          title="تأكيد تفريغ ومسح كافة المدخلات من قاعدة البيانات"
          message="تحذير هام جداً: هل أنت متأكد تماماً من رغبتك في حذف وتفريغ جميع المواد وحركات المخزون وطلبات الشراء والمشاريع والأقسام؟ لا يمكن التراجع عن هذه العملية بعد إتمامها وتصبح قاعدة البيانات خالية تماماً."
          confirmText="نعم، امسح كل المدخلات وفرغ قاعدة البيانات"
          isLoading={isWipingDb}
        />
      )}
    </div>
  );
};
