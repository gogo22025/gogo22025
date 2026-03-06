
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { getSmartBusinessInsight } from '../services/geminiService';
import { Transaction, Product, Partner, StaffMember } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  staff: StaffMember[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, products, partners, staff }) => {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // حساب الإحصائيات الحقيقية
  const stats = useMemo(() => {
    const sales = transactions.filter(t => t.type === 'SALE');
    const purchases = transactions.filter(t => t.type === 'PURCHASE');
    const returns = transactions.filter(t => t.type === 'RETURN');
    
    const salesReturns = returns.filter(r => r.notes?.includes('مبيعات')).reduce((a, b) => a + b.amount, 0);
    const purchaseReturns = returns.filter(r => r.notes?.includes('مشتريات')).reduce((a, b) => a + b.amount, 0);

    const totalSales = sales.reduce((a, b) => a + b.amount, 0) - salesReturns;
    const totalPurchases = purchases.reduce((a, b) => a + b.amount, 0) - purchaseReturns;
    const activeCustomers = partners.filter(p => p.type === 'CUSTOMER').length;
    const lowStockItems = products.filter(p => p.stock < 10).length;

    return { totalSales, totalPurchases, activeCustomers, lowStockItems };
  }, [transactions, partners, products]);

  const fetchInsight = async () => {
    setLoading(true);
    const summaryStr = `
      المبيعات الإجمالية: ${stats.totalSales} ج.م.
      المشتريات الإجمالية: ${stats.totalPurchases} ج.م.
      عدد العملاء: ${stats.activeCustomers}.
      أصناف قاربت على النفاد: ${stats.lowStockItems}.
      أفضل الموظفين أداءً: ${staff.sort((a, b) => b.performancePoints - a.performancePoints)[0]?.name || 'لا يوجد'}.
    `;
    const result = await getSmartBusinessInsight(summaryStr);
    setInsight(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, [stats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي المبيعات" value={`${stats.totalSales.toLocaleString()} ج.م`} color="emerald" icon="💰" />
        <StatCard title="إجمالي المشتريات" value={`${stats.totalPurchases.toLocaleString()} ج.م`} color="blue" icon="🛒" />
        <StatCard title="العملاء المسجلون" value={stats.activeCustomers} color="amber" icon="👥" />
        <StatCard title="تنبيهات المخزن" value={stats.lowStockItems} color="red" icon="⚠️" />
      </div>

      <div className="bg-white border border-indigo-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-black text-indigo-900 flex items-center">
             <span className="ml-3 text-2xl">🤖</span>
             مساعد ديسترو الذكي (Gemini AI)
           </h3>
           <button onClick={fetchInsight} disabled={loading} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all">
             {loading ? 'جاري تحليل البيانات...' : 'تحديث التحليل المالي'}
           </button>
        </div>
        
        {insight ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">حالة العمل الآن</p>
              <p className="text-sm text-gray-700 leading-relaxed font-bold">{insight.summary}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-500 uppercase mb-2">نصيحة استراتيجية للنمو</p>
              <p className="text-sm text-gray-700 leading-relaxed font-bold">{insight.advice}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-500 uppercase mb-2">التوقعات المستقبلية</p>
              <p className="text-sm text-gray-700 leading-relaxed font-bold">{insight.forecast}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded-full w-full animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded-full w-5/6 animate-pulse"></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="font-bold mb-6 text-gray-800 flex items-center">📈 أداء المبيعات الحقيقي</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transactions.filter(t => t.type === 'SALE').slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#10b981" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col">
           <h3 className="font-bold mb-6 text-gray-800">🏆 صدارة المناديب (النقاط)</h3>
           <div className="flex-1 space-y-4">
              {staff.filter(s => s.role === 'SALES_REP').sort((a,b) => b.performancePoints - a.performancePoints).map((rep, idx) => (
                <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'}`}>{idx+1}</span>
                    <span className="text-sm font-bold text-gray-700">{rep.name}</span>
                  </div>
                  <span className="text-xs font-black text-indigo-600">{rep.performancePoints} نقطة</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, icon }: any) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-${color}-50 text-${color}-600`}>
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase">{title}</p>
      <h4 className="text-xl font-black text-gray-900 mt-1">{value}</h4>
    </div>
  </div>
);

export default Dashboard;
