import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, MapPin, Building, Trash2, Edit, Search } from 'lucide-react';
import { Supplier, Customer } from '../types';
import { Modal } from '../components/Modal';
import { addSupplier, updateSupplier, deleteSupplier, addCustomer, updateCustomer, deleteCustomer } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface ContactsPageProps {
  suppliers: Supplier[];
  customers: Customer[];
}

export const ContactsPage: React.FC<ContactsPageProps> = ({ suppliers, customers }) => {
  const { currentUser, canEditMaterials, canDelete } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState<'suppliers' | 'customers'>('suppliers');
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone && s.phone.includes(searchTerm))
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setPhone(item.phone || '');
    setEmail(item.email || '');
    setAddress(item.address || '');
    setNotes(item.notes || '');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      if (activeTab === 'suppliers') {
        if (editingItem) {
          await updateSupplier(editingItem.id, { name, phone, email, address, notes });
          showSuccess('تم تحديث بيانات المورد بنجاح');
        } else {
          await addSupplier({ name, phone, email, address, notes });
          showSuccess('تم إضافة المورد بنجاح');
        }
      } else {
        if (editingItem) {
          await updateCustomer(editingItem.id, { name, phone, email, address, notes });
          showSuccess('تم تحديث بيانات العميل بنجاح');
        } else {
          await addCustomer({ name, phone, email, address, notes });
          showSuccess('تم إضافة العميل بنجاح');
        }
      }
      setShowAddModal(false);
    } catch (err: any) {
      showError(err.message || 'فشلت العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      if (activeTab === 'suppliers') {
        await deleteSupplier(id);
        showSuccess('تم حذف المورد');
      } else {
        await deleteCustomer(id);
        showSuccess('تم حذف العميل');
      }
    } catch (e) {
      showError('فشل الحذف');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>سجل الموردين والعملاء</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دليل هاتف وعناوين شركات التوريد وعملاء المطبعة والدعاية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              شركات التوريد ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              العملاء ({customers.length})
            </button>
          </div>

          {canEditMaterials && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === 'suppliers' ? 'إضافة مورد' : 'إضافة عميل'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالاسم أو رقم الهاتف..."
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-4 text-xs font-semibold text-slate-800 dark:text-slate-100"
        />
        <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
      </div>

      {/* Contacts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'suppliers' ? filteredSuppliers : filteredCustomers).map(item => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                {item.name}
              </h3>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {item.phone && (
                  <p className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{item.phone}</span>
                  </p>
                )}
                {item.email && (
                  <p className="flex items-center gap-2 font-mono">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{item.email}</span>
                  </p>
                )}
                {item.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{item.address}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-1">
              {canEditMaterials && (
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingItem ? 'تعديل البيانات' : activeTab === 'suppliers' ? 'إضافة مورد جديد' : 'إضافة عميل جديد'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">الاسم / اسم الشركة *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">العنوان</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1">ملاحظات</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
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
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
