import React, { useState, useEffect } from 'react';
import { Settings, Save, Download, Upload, RefreshCw, CheckCircle2, ShieldAlert, Image as ImageIcon, Trash2 } from 'lucide-react';
import { SystemSettings } from '../types';
import { updateSystemSettings } from '../services/inventoryService';
import { exportFullDatabaseBackup, importFullDatabaseBackup } from '../services/backupService';
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

  useEffect(() => {
    setCompanyName(settings.companyName || 'مؤسسة الخيال للطباعة والإعلان');
    setLogoUrl(settings.logoUrl || '');
    setAddress(settings.address || 'الرياض - المملكة العربية السعودية');
    setPhone(settings.phone || '0500000000');
    setEmail(settings.email || 'info@khayal.com');
    setDefaultCurrency(settings.defaultCurrency || 'ر.س');
  }, [settings]);

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

        {/* Backup & Restore Panel */}
        <div className="space-y-4">
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
        </div>
      </div>

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
    </div>
  );
};
