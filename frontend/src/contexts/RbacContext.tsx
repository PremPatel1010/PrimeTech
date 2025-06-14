import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { rbacService, Permission } from '../services/rbac.service';
import { parseJSON } from 'date-fns';

interface RbacContextType {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  checkPermission: (routePath: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const RbacContext = createContext<RbacContextType | undefined>(undefined);

export const RbacProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = localStorage.getItem('user')
      const User = JSON.parse(user)
      const userId = User.id
      const userPermissions = await rbacService.getUserPermissions(
        userId
      );
      console.log(userPermissions)
      setPermissions(userPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const checkPermission = useCallback(
    (routePath: string): boolean => {
      // Always allow access to login and error pages
      if (['/login', '/unauthorized', '/404'].includes(routePath)) {
        return true;
      }

      // Check if user has the specific permission
      const permission = permissions.find(p => p.route_path === routePath);
      return permission?.is_allowed ?? false;
    },
    [permissions]
  );

  const value = {
    permissions,
    loading,
    error,
    checkPermission,
    refreshPermissions: loadPermissions,
  };

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
};

export const useRbac = () => {
  const context = useContext(RbacContext);
  if (context === undefined) {
    throw new Error('useRbac must be used within a RbacProvider');
  }
  return context;
};

// Higher-order component to protect routes
export const withPermission = (WrappedComponent: React.ComponentType<any>, requiredRoute: string) => {
  return function WithPermissionComponent(props: any) {
    const { checkPermission, loading } = useRbac();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!checkPermission(requiredRoute)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
            <button 
              onClick={() => window.history.back()} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}; 