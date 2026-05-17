import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { LayoutDashboard, Target, Calendar, BarChart3, Users, LogOut, Menu, X, Sparkles } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] },
    { name: 'Goals', path: '/goals', icon: Target, roles: ['employee', 'manager', 'admin'] },
    { name: 'Check-ins', path: '/checkins', icon: Calendar, roles: ['employee', 'manager', 'admin'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['manager', 'admin'] },
    { name: 'Admin', path: '/admin', icon: Users, roles: ['admin'] },
  ];

  const filtered = navItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-white rounded-xl shadow-lg">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-20 w-72 bg-white/90 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center justify-center border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                GoalTracker Pro
              </h1>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1">
            {filtered.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between bg-gray-50/50 rounded-xl p-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{user?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-danger rounded-lg transition-all">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="p-6 md:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;