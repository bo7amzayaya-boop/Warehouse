import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import { getUserProfile, createInitialSuperAdminProfile, logoutUser } from '../services/authService';
import { seedInitialDataIfEmpty } from '../services/inventoryService';

interface AuthContextType {
  currentUser: UserProfile | null;
  fbUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  canManageUsers: boolean;
  canEditMaterials: boolean;
  canDelete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seed initial categories, units, sample materials if empty
    seedInitialDataIfEmpty();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            profile = await createInitialSuperAdminProfile(user);
          }
          setCurrentUser(profile);
        } catch (e) {
          console.error('Failed to load user profile:', e);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await logoutUser(currentUser || undefined);
    setCurrentUser(null);
    setFbUser(null);
  };

  const role: UserRole = currentUser?.role || 'viewer';
  const isSuperAdmin = role === 'super_admin';
  const isManager = isSuperAdmin || role === 'warehouse_manager';
  const isEmployee = isManager || role === 'employee';
  const isViewer = role === 'viewer';

  const canManageUsers = isSuperAdmin;
  const canEditMaterials = isManager || isEmployee;
  const canDelete = isSuperAdmin || isManager;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        fbUser,
        loading,
        logout,
        isSuperAdmin,
        isManager,
        isEmployee,
        isViewer,
        canManageUsers,
        canEditMaterials,
        canDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
