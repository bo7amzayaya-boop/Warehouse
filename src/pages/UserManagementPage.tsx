import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Shield, UserX, UserCheck, Key, Trash2, Mail } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { getAllUsers, createUserProfile, updateUserProfile, deleteUserProfile } from '../services/authService';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const UserManagementPage: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (err: any) {
      showError('تعذر جلب قائمة المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('employee');
    setPhone('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (u: UserProfile) => {
    setEditingUser(u);
    setEmail(u.email);
    setFullName(u.fullName);
    setRole(u.role);
    setPhone(u.phone || '');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      showError('يرجى تعبئة البريد والاسم كاملاً');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        await updateUserProfile(editingUser.uid, {
          fullName,
          role,
          phone,
        });
        showSuccess('تم تحديث بيانات وصلاحية المستخدم بنجاح');
      } else {
        if (!password || password.length < 6) {
          showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          setSubmitting(false);
          return;
        }
        await createUserProfile(
          'USR-' + Date.now(),
          email,
          fullName,
          role,
          phone
        );
        showSuccess('تم إنشاء حساب المستخدم الجديد بنجاح');
      }
      setShowAddModal(false);
      fetchUsers();
    } catch (err: any) {
      showError(err.message || 'فشلت العملية');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: UserProfile) => {
    try {
      await updateUserProfile(u.uid, { isDisabled: !u.isDisabled });
      showSuccess(u.isDisabled ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب');
      fetchUsers();
    } catch (e) {
      showError('فشل تغيير حالة الحساب');
    }
  };

  const handleDelete = async (uid: string) => {
    try {
      await deleteUserProfile(uid);
      showSuccess('تم حذف المستخدم بنجاح');
      fetchUsers();
    } catch (e) {
      showError('فشل حذف المستخدم');
    }
  };

  const getRoleLabel = (r: UserRole) => {
    if (r === 'super_admin') return 'مدير النظام (سوبر أدمن)';
    if (r === 'warehouse_manager') return 'مدير المستودع';
    if (r === 'employee') return 'موظف مستودع';
    return 'مراقب (صلاحية قراءة)';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-indigo-600" />
            <span>إدارة مستخدمي منظومة المستودع والصلاحيات</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إضافة وإلغاء وتعديل أدوار مستخدمي النظام (سوبر أدمن، مدير مستودع، موظف، مراقب)
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3.5">الاسم الكامل</th>
                <th className="p-3.5">البريد الإلكتروني</th>
                <th className="p-3.5">رقم الهاتف</th>
                <th className="p-3.5">الدور والصلاحية</th>
                <th className="p-3.5">حالة الحساب</th>
                <th className="p-3.5 text-center">خيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    جاري تحميل قيد المستخدمين...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-extrabold text-slate-800 dark:text-white">
                      {u.fullName}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {u.phone || '-'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        u.role === 'super_admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : u.role === 'warehouse_manager'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : u.role === 'employee'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                      }`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        u.isDisabled
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {u.isDisabled ? 'معطل' : 'نشط'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          title={u.isDisabled ? 'تفعيل الحساب' : 'تعطيل الحساب'}
                        >
                          {u.isDisabled ? <UserCheck className="w-4 h-4 text-emerald-600" /> : <UserX className="w-4 h-4 text-amber-600" />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          title="تعديل الصلاحيات"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        {currentUser?.uid !== u.uid && (
                          <button
                            onClick={() => handleDelete(u.uid)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingUser ? 'تعديل بيانات وصلاحية المستخدم' : 'إنشاء حساب مستخدم جديد'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              required
              disabled={!!editingUser}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono disabled:opacity-50"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">كلمة المرور *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">دور الصلاحية بالنظام *</label>
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-bold"
            >
              <option value="super_admin">مدير النظام (سوبر أدمن - كامل التحكم)</option>
              <option value="warehouse_manager">مدير المستودع (إدارة المواد، الاعتماد، التقارير)</option>
              <option value="employee">موظف مستودع (صرف وتوريد)</option>
              <option value="viewer">مراقب (صلاحية استعراض فقط)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">رقم الجوال</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 font-bold text-slate-500"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl"
            >
              حفظ المستخدم
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
