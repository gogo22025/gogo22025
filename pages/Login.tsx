
import React, { useState } from 'react';
import { User, StaffMember, AppView } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  staffList: StaffMember[];
}

const Login: React.FC<LoginProps> = ({ onLogin, staffList }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // البحث في قائمة الموظفين
    const foundStaff = staffList.find(s => s.username === username && s.password === password);

    // حساب مدير النظام الافتراضي (لأول مرة)
    const isAdmin = username === 'admin' && password === '123';

    setTimeout(() => {
      if (isAdmin) {
        onLogin({
          id: 'admin',
          username: 'admin',
          name: 'المدير العام',
          role: 'ADMIN',
          permissions: Object.values(AppView)
        });
      } else if (foundStaff) {
        onLogin({
          id: foundStaff.id,
          username: foundStaff.username,
          name: foundStaff.name,
          role: foundStaff.role,
          permissions: foundStaff.permissions
        });
      } else {
        setError('بيانات الدخول غير صحيحة');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md p-8 z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-block p-4 bg-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
              <span className="text-4xl">🚀</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">ديسترو سمارت</h1>
            <p className="text-slate-400 text-sm font-bold">تسجيل الدخول للنظام</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 mr-2">اسم المستخدم</label>
              <input 
                required
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                placeholder="اسم المستخدم..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 mr-2">كلمة المرور</label>
              <input 
                required
                type="password" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
