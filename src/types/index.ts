export type UserRole = 'super_admin' | 'warehouse_manager' | 'employee' | 'viewer';
export type UserStatus = 'active' | 'disabled';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  status: UserStatus;
  isDisabled?: boolean;
  photoURL?: string;
  notes?: string;
  createdAt: string;
  lastLogin?: string;
  createdBy?: string;
}

export interface Material {
  id: string;
  code: string;
  barcode: string;
  nameAr: string;
  nameEn?: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  avgCost: number;
  purchasePrice: number;
  supplierId?: string;
  supplierName?: string;
  location?: string;
  rackNumber?: string;
  description?: string;
  image?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  code?: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  createdAt?: string;
}

export interface Unit {
  id: string;
  nameAr: string;
  nameEn?: string;
  symbol?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company?: string;
  notes?: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  code?: string;
  name: string;
  customerId?: string;
  customerName?: string;
  startDate?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  manager?: string;
  description?: string;
  totalCost?: number;
  totalMaterialCost?: number;
  createdDate?: string;
  createdAt: string;
}

export type MovementType = 'incoming' | 'withdrawal' | 'adjustment' | 'transfer';

export interface Movement {
  id: string;
  type: MovementType;
  materialId: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  unitPrice?: number;
  totalCost?: number;
  userId: string;
  userName: string;
  userRole: UserRole;
  projectId?: string;
  projectName?: string;
  department?: string;
  supplierName?: string;
  invoiceNumber?: string;
  reason?: string;
  notes?: string;
  timestamp: string;
  dateStr: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  details: any;
  timestamp: string;
  dateStr: string;
  device?: string;
  ip?: string;
}

export interface NotificationItem {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'large_withdrawal' | 'new_purchase' | 'system';
  title: string;
  message: string;
  materialId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SystemSettings {
  companyName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  defaultCurrency: string;
  defaultUnit?: string;
  updatedAt?: string;
}

export interface WarehouseLocation {
  id: string;
  warehouse: string;
  section: string;
  shelf: string;
  rack: string;
  code: string;
}

export interface RequisitionItem {
  id: string;
  materialId?: string;
  materialCode: string;
  materialName: string;
  categoryName?: string;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  requestedQuantity: number;
  estimatedUnitPrice: number;
  totalEstimatedPrice: number;
  notes?: string;
}

export interface PurchaseRequisition {
  id: string;
  reqNumber: string;
  title: string;
  recipient: string;
  applicantName: string;
  warehouseName: string;
  priority: 'urgent' | 'high' | 'normal';
  justification: string;
  items: RequisitionItem[];
  totalItemsCount: number;
  totalEstimatedAmount: number;
  currency: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  dateStr: string;
}
