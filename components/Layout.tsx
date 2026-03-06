
import React from 'react';
import { AppView, User } from '../types';

interface LayoutProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, user, onLogout, children }) => {
  const allMenuItems = [
    { id: AppView.DASHBOARD, label: 'لوحة التحكم', icon: '📊' },
    { id: AppView.SAFE, label: 'الخزنة والمالية', icon: '🏦' },
    { id: AppView.INVENTORY, label: 'المخازن والمنتجات', icon: '📦' },
    { id: AppView.SALES, label: 'المبيعات', icon: '💰' },
    { id: AppView.PURCHASES, label: 'المشتريات', icon: '🛒' },
    { id: AppView.INVOICES, label: 'الفواتير', icon: '🧾' },
    { id: AppView.PARTNERS, label: 'العملاء والموردين', icon: '🤝' },
    { id: AppView.STAFF, label: 'المناديب والموظفين', icon: '🚚' },
    { id: AppView.REPORTS, label: 'التقارير والتحليلات', icon: '📈' },
    { id: AppView.SETTINGS, label: 'الإعدادات', icon: '⚙️' },
  ];

  // تصفية القائمة بناءً على صلاحيات المستخدم
  const menuItems = allMenuItems.filter(item => user.permissions.includes(item.id));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-slate-800 text-emerald-400 flex items-center">
          <span className="ml-2">🚀</span> ديسترو سمارت
        </div>
        
        {/* User Profile in Sidebar */}
        <div className="p-6 bg-slate-800/50 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-black text-white">
               {user.name[0]}
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-black truncate">{user.name}</p>
               <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                 {user.role === 'ADMIN' ? 'مدير النظام' : user.role === 'SALES_REP' ? 'مندوب مبيعات' : user.role === 'WAREHOUSE' ? 'أمين مخزن' : 'موظف'}
               </p>
             </div>
          </div>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id 
                ? 'bg-emerald-600 text-white' 
                : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span className="ml-3 text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button 
            onClick={onLogout}
            className="w-full flex items-center px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs font-bold"
          >
            <span className="ml-2">🚪</span> تسجيل الخروج
          </button>
          <div className="text-slate-500 text-[10px] text-center">
            v1.2.0 - نظام حماية الدخول
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 z-10 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <span className="ml-2 text-2xl">{menuItems.find(i => i.id === currentView)?.icon}</span>
            {menuItems.find(i => i.id === currentView)?.label}
          </h2>
          <div className="flex items-center space-x-reverse space-x-4">
             <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-gray-400 font-bold uppercase">تاريخ اليوم</span>
                <span className="text-sm font-bold text-gray-700">{new Date().toLocaleDateString('ar-EG')}</span>
             </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center text-xl cursor-pointer hover:bg-slate-200">👤</div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#fdfdfd]">
          {children}
        </div>

        {/* Bottom Nav for Mobile */}
        <nav className="md:hidden bg-white border-t border-gray-200 flex justify-around p-2 shrink-0">
           {menuItems.slice(0, 5).map((item) => (
             <button
               key={item.id}
               onClick={() => setView(item.id)}
               className={`flex flex-col items-center p-2 rounded ${currentView === item.id ? 'text-emerald-600' : 'text-gray-500'}`}
             >
               <span className="text-xl">{item.icon}</span>
               <span className="text-[10px] mt-1 font-bold">{item.label.split(' ')[0]}</span>
             </button>
           ))}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
