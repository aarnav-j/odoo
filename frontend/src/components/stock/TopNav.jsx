import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Activity, History, Settings, ChevronDown, Warehouse, MapPin } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/operations', label: 'Operations', icon: Activity },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/move-history', label: 'Move History', icon: History },
];

const settingsItems = [
  { path: '/settings/warehouse', label: 'Warehouse', icon: Warehouse },
  { path: '/settings/location', label: 'Locations', icon: MapPin },
];

export default function TopNav() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const location = useLocation();

  // Check if current route is a settings route
  const isSettingsActive = location.pathname.startsWith('/settings');

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="w-full border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            );
          })}
          
          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              onMouseEnter={() => setIsSettingsOpen(true)}
              onMouseLeave={() => setIsSettingsOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                isSettingsActive
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isSettingsOpen && (
              <div
                className="absolute left-0 mt-1 w-48 rounded-lg border border-white/10 bg-slate-900 shadow-lg z-50"
                onMouseEnter={() => setIsSettingsOpen(true)}
                onMouseLeave={() => setIsSettingsOpen(false)}
              >
                <div className="p-1">
                  {settingsItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSettingsOpen(false)}
                        className={`flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - User Avatar */}
        <div className="flex items-center gap-3 ml-4">
          <div className="h-8 w-8 rounded-md border border-white/10 bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-medium">
            A
          </div>
        </div>
      </div>
    </nav>
  );
}

