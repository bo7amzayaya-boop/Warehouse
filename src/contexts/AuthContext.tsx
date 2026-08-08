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

  const checkLocalCustomUser = async () => {
    const stored = localStorage.getItem('khayal_custom_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserProfile;
        const fresh = await getUserProfile(parsed.uid);
        if (fresh && fresh.status !== 'disabled' && !fresh.isDisabled) {
          setCurrentUser(fresh);
          setLoading(false);
          return true;
        } else {
          localStorage.removeItem('khayal_custom_user');
        }
      } catch (e) {
        localStorage.removeItem('khayal_custom_user');
      }
    }
    return false;
  };

  useEffect(() => {
    // Seed initial categories, units, sample materials if empty
    seedInitialDataIfEmpty();

    const handleAuthChangeEvent = async () => {
      if (!auth.currentUser) {
        const found = await checkLocalCustomUser();
        if (!found) setCurrentUser(null);
      }
    };

    window.addEventListener('khayal_auth_change', handleAuthChangeEvent);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            profile = await createInitialSuperAdminProfile(user);
          }
          if (profile.status === 'disabled' || profile.isDisabled) {
            await logoutUser();
            setCurrentUser(null);
          } else {
            setCurrentUser(profile);
            localStorage.removeItem('khayal_custom_user');
          }
        } catch (e) {
          console.error('Failed to load user profile:', e);
          setCurrentUser(null);
        }
      } else {
        const found = await checkLocalCustomUser();
        if (!found) {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('khayal_auth_change', handleAuthChangeEvent);
    };
  }, []);

  const logout = async () => {
    await logoutUser(currentUser || undefined);
    localStorage.removeItem('khayal_custom_user');
    setCurrentUser(null);
    setFbUser(null);
    window.dispatchEvent(new Event('khayal_auth_change'));
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
