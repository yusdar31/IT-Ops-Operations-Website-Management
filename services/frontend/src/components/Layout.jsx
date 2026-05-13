import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, LayoutDashboard, LogOut, Server, Ticket, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ticketApi } from '../api/axios';
import { useDensity } from '../lib/uiDensity';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', path: '/assets', icon: Server },
  { name: 'Tickets', path: '/tickets', icon: Ticket },
];

export default function Layout() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const { compact, density, toggleDensity } = useDensity();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

  useEffect(() => {
    let ignore = false;
    async function loadNotifications() {
      try {
        const response = await ticketApi.get('/tickets/notifications');
        if (!ignore) setUnread(response.data.unread || 0);
      } catch {
        if (!ignore) setUnread(0);
      }
    }
    loadNotifications();
    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 ${compact ? 'ui-compact' : 'ui-comfortable'}`}>
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 lg:flex">
          <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
            <ShieldCheck size={18} className="text-blue-400" />
            <span className="text-sm font-semibold">IT Operations Hub</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon size={16} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-sm font-medium text-white">{user.name || 'Operator'}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{user.role || 'viewer'}</p>
            <button
              onClick={handleLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className={`flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 ${compact ? 'h-12' : 'h-14'}`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Service Management</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDensity}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                title="Toggle compact mode"
              >
                {density === 'compact' ? 'Compact' : 'Comfortable'}
              </button>
              <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                <Bell size={14} />
                {unread > 0 ? `${unread} unread` : 'No new notifications'}
              </div>
            </div>
          </header>

          <main className={`flex-1 px-4 sm:px-6 ${compact ? 'py-3' : 'py-5'}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
