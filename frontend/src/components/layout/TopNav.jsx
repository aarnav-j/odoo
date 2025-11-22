import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Download, Upload, User, LogOut, UserCircle, Menu, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/receipts', label: 'Receipts', icon: Download },
  { path: '/deliveries', label: 'Deliveries', icon: Upload },
];

export default function TopNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Logo and Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 grid place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-sm font-medium tracking-tight">
              SM
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-100 hidden sm:inline">StockMaster</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right side: User menu and mobile menu button */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-md p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <UserCircle className="h-5 w-5" />
              <span className="hidden sm:inline">{user?.name || 'User'}</span>
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-slate-900 shadow-lg">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // Navigate to profile page if needed
                    }}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-sm">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

