import React from 'react';
import { BillingSettings } from '../types';

interface SettingsProps {
  settings: BillingSettings;
  setSettings: React.Dispatch<React.SetStateAction<BillingSettings>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'vatPercentage' ? Number(value) : value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 bg-slate-900 text-white">
          <h3 className="text-2xl font-black">إعدادات الفوترة والنظام</h3>
          <p className="text-slate-400 text-sm font-bold mt-1">تكوين بيانات الشركة والضرائب والعملة</p>
        </div>
        
        <div className="p-8 space-y-8">
          <section className="space-y-4">
            <h4 className="text-lg font-black text-slate-800 border-b pb-2">بيانات المنشأة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">اسم الشركة / المؤسسة</label>
                <input 
                  type="text" 
                  name="companyName"
                  value={settings.companyName}
                  onChange={handleChange}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold"
                  placeholder="شركة ديسترو سمارت..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">الرقم الضريبي (VAT ID)</label>
                <input 
                  type="text" 
                  name="taxNumber"
                  value={settings.taxNumber}
                  onChange={handleChange}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-mono font-bold"
                  placeholder="300000000000003..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">العنوان</label>
                <input 
                  type="text" 
                  name="companyAddress"
                  value={settings.companyAddress}
                  onChange={handleChange}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold"
                  placeholder="القاهرة، مصر..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">رقم الهاتف</label>
                <input 
                  type="text" 
                  name="companyPhone"
                  value={settings.companyPhone}
                  onChange={handleChange}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold"
                  placeholder="01000000000..."
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-lg font-black text-slate-800 border-b pb-2">إعدادات الضرائب والعملة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">نسبة ضريبة القيمة المضافة (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    name="vatPercentage"
                    value={settings.vatPercentage}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-black text-xl text-emerald-600"
                    placeholder="15"
                  />
                  <span className="absolute left-6 top-4 text-slate-400 font-black text-xl">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">العملة</label>
                <select 
                  name="currency"
                  value={settings.currency}
                  onChange={handleChange}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold"
                >
                  <option value="ج.م">جنيه مصري (ج.م)</option>
                  <option value="ر.س">ريال سعودي (ر.س)</option>
                  <option value="د.إ">درهم إماراتي (د.إ)</option>
                  <option value="$">دولار أمريكي ($)</option>
                </select>
              </div>
            </div>
          </section>

          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
            <div className="text-3xl">💡</div>
            <p className="text-emerald-800 text-sm font-bold leading-relaxed">
              سيتم تطبيق هذه الإعدادات تلقائياً على كافة الفواتير الجديدة. 
              تأكد من صحة الرقم الضريبي لضمان توافق الفواتير مع المتطلبات القانونية.
            </p>
          </div>

          <section className="space-y-4 pt-8 border-t border-slate-100">
            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>💾</span> النسخ الاحتياطي (Backup)
            </h4>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-1">
                <p className="text-slate-900 font-black">تحميل نسخة من قاعدة البيانات</p>
                <p className="text-slate-500 text-xs font-bold">يمكنك تحميل ملف قاعدة البيانات (SQLite) للاحتفاظ بنسخة احتياطية خارج النظام.</p>
              </div>
              <a 
                href="/api/download-db" 
                download
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
              >
                <span>📥</span> تحميل قاعدة البيانات
              </a>
            </div>
          </section>

          <section className="space-y-4 pt-8 border-t border-red-100">
            <h4 className="text-lg font-black text-red-600 flex items-center gap-2">
              <span>⚠️</span> منطقة الخطر (إدارة البيانات)
            </h4>
            <div className="p-6 bg-red-50 rounded-3xl border border-red-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-1">
                <p className="text-red-900 font-black">تصفير كافة بيانات النظام</p>
                <p className="text-red-700/70 text-xs font-bold">سيتم حذف كافة (المنتجات، الفواتير، الموظفين، والعملاء) بشكل نهائي. لا يمكن التراجع عن هذه الخطوة.</p>
              </div>
              <button 
                type="button"
                onClick={async () => {
                  console.log('Reset button clicked');
                  if (window.confirm('هل أنت متأكد تماماً؟ سيتم حذف كافة البيانات (المنتجات، الفواتير، الموظفين، والعملاء) ولن تتمكن من استعادتها!')) {
                    const password = window.prompt('يرجى إدخال كلمة مرور المدير للتأكيد:');
                    console.log('Password entered:', password);
                    if (password === '0106010495294') {
                      try {
                        console.log('Sending reset request to server...');
                        const res = await fetch('/api/reset', { method: 'POST' });
                        if (res.ok) {
                          console.log('Reset successful');
                          alert('تم تصفير قاعدة البيانات بنجاح. سيتم إعادة تحميل النظام الآن.');
                          window.location.reload();
                        } else {
                          const errorText = await res.text();
                          console.error('Reset failed on server:', errorText);
                          alert('فشل تصفير البيانات من جهة الخادم.');
                        }
                      } catch (e) {
                        console.error('Reset request error:', e);
                        alert('فشل تصفير البيانات. يرجى المحاولة لاحقاً.');
                      }
                    } else {
                      console.warn('Incorrect password entered');
                      alert('كلمة المرور غير صحيحة.');
                    }
                  }
                }}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95 whitespace-nowrap"
              >
                تصفير الداتا والبدء من جديد
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
