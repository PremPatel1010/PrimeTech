import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Factory, 
  BarChart,
  Truck,
  Settings,
  Users,
  FileText,
  Shield,
  ChevronDown,
  Plus,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, text, isActive }) => {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        isActive 
          ? 'bg-factory-primary text-white' 
          : 'text-factory-gray-600 hover:bg-factory-gray-100'
      )}
    >
      {icon}
      <span className="font-medium">{text}</span>
    </Link>
  );
};

interface NavDropdownProps {
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
  children: React.ReactNode;
}

const NavDropdown: React.FC<NavDropdownProps> = ({ icon, text, isActive, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        className={cn(
          'flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2 transition-colors',
          isActive 
            ? 'bg-factory-primary text-white' 
            : 'text-factory-gray-600 hover:bg-factory-gray-100'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{text}</span>
        </div>
        <ChevronDown size={16} className={cn('transition-transform', isOpen && 'transform rotate-180')} />
      </button>
      
      {isOpen && (
        <div className="mt-1 pl-8 space-y-1 border-l-2 border-factory-gray-200 ml-3">
          {children}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { authState } = useAuth();
  const admin = authState.user?.role === 'admin';
  
  // Check if current path is related to sales
  const isSalesActive = currentPath.includes('/sales');
  
  return (
    <div className="w-64 shrink-0 border-r border-factory-gray-200 h-screen bg-white flex flex-col">
      <div className="p-6 border-b border-factory-gray-200">
        <h1 className="text-xl font-bold text-factory-primary flex items-center gap-2">
          <Factory size={24} />
          <span>Primetech Industry</span>
        </h1>
        <p className="text-xs text-factory-gray-500 mt-1">Solar Pump Manufacturing ERP</p>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 py-2 space-y-1">
          <NavItem 
            to="/" 
            icon={<LayoutDashboard size={20} />} 
            text="Dashboard" 
            isActive={currentPath === '/'} 
          />
          
          {/* Sales Orders Dropdown */}
          <NavDropdown
            icon={<ShoppingCart size={20} />}
            text="Sales Orders"
            isActive={isSalesActive}
          >
            <NavItem
              to="/sales/new"
              icon={<Plus size={16} />}
              text="Add New Order"
              isActive={currentPath === '/sales/new'}
            />
            <NavItem
              to="/sales/status"
              icon={<Eye size={16} />}
              text="View Order Status"
              isActive={currentPath === '/sales/status'}
            />
          </NavDropdown>
          
          <NavItem 
            to="/purchase" 
            icon={<Truck size={20} />} 
            text="Purchase Orders" 
            isActive={currentPath === '/purchase'} 
          />
          <NavItem 
            to="/inventory" 
            icon={<Package size={20} />} 
            text="Inventory" 
            isActive={currentPath === '/inventory'} 
          />
          <NavItem 
            to="/products" 
            icon={<FileText size={20} />} 
            text="Products" 
            isActive={currentPath === '/products'} 
          />
          <NavItem 
            to="/manufacturing" 
            icon={<Factory size={20} />} 
            text="Manufacturing" 
            isActive={currentPath === '/manufacturing'} 
          />
          <NavItem 
            to="/reports" 
            icon={<BarChart size={20} />} 
            text="Reports" 
            isActive={currentPath === '/reports'} 
          />
          {admin && (
            <NavItem 
              to="/users" 
              icon={<Users size={20} />} 
              text="User Management" 
              isActive={currentPath === '/users'} 
            />
          )}
          <NavItem 
            to="/settings" 
            icon={<Settings size={20} />} 
            text="Settings" 
            isActive={currentPath === '/settings'} 
          />
        </nav>
      </div>
      
      <div className="p-4 border-t border-factory-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-factory-primary/10 flex items-center justify-center">
            <Shield size={16} className="text-factory-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-xs text-factory-gray-500">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
