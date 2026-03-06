
import React, { useState, useMemo } from 'react';
import { Transaction, Product, Partner, StaffMember, BillingSettings } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
  products: Product[];
  partners: Partner[];
  staff: StaffMember[];
  settings: BillingSettings;
}

const Reports: React.FC<ReportsProps> = ({ transactions, products, partners, staff, settings }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'SALES' | 'PURCHASES' | 'EXPENSES' | 'STAFF' | 'PARTNERS' | 'PRODUCT_SALES' | 'STOCK_LEVELS' | 'SUPPLIER_EXPENSES'>('SALES');
  const [globalThreshold, setGlobalThreshold] = useState<number>(10);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date;
      return tDate >= startDate && tDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  const reportData = useMemo(() => {
    const data: any[] = [];
    const dateMap = new Map();

    filteredTransactions.forEach(t => {
      const date = t.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, sales: 0, purchases: 0, expenses: 0, income: 0 });
      }
      const entry = dateMap.get(date);
      if (t.type === 'SALE') entry.sales += t.amount;
      if (t.type === 'PURCHASE') entry.purchases += t.amount;
      if (t.type === 'EXPENSE') entry.expenses += t.amount;
      if (t.type === 'INCOME') entry.income += t.amount;
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  const productSalesData = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    filteredTransactions.filter(t => t.type === 'SALE').forEach(t => {
      t.items.forEach(item => {
        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, { name: item.name, quantity: 0, revenue: 0 });
        }
        const entry = productMap.get(item.productId)!;
        entry.quantity += item.quantity;
        entry.revenue += item.total;
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  const staffPerformanceData = useMemo(() => {
    const staffMap = new Map<string, { id: string; name: string; sales: number; count: number; points: number }>();

    // Initialize with all staff members
    staff.forEach(s => {
      staffMap.set(s.id, { id: s.id, name: s.name, sales: 0, count: 0, points: s.performancePoints || 0 });
    });

    filteredTransactions.filter(t => t.type === 'SALE').forEach(t => {
      if (t.staffId && staffMap.has(t.staffId)) {
        const entry = staffMap.get(t.staffId)!;
        entry.sales += t.amount;
        entry.count += 1;
      }
    });

    return Array.from(staffMap.values()).sort((a, b) => b.sales - a.sales);
  }, [filteredTransactions, staff]);

  const supplierExpensesData = useMemo(() => {
    const supplierMap = new Map<string, { name: string; totalPaid: number; count: number }>();

    filteredTransactions.filter(t => t.type === 'EXPENSE' || t.type === 'PURCHASE').forEach(t => {
      const partner = partners.find(p => p.name === t.partnerName);
      if (partner && partner.type === 'SUPPLIER') {
        if (!supplierMap.has(t.partnerName)) {
          supplierMap.set(t.partnerName, { name: t.partnerName, totalPaid: 0, count: 0 });
        }
        const entry = supplierMap.get(t.partnerName)!;
        entry.totalPaid += t.amount;
        entry.count += 1;
      }
    });

    return Array.from(supplierMap.values()).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [filteredTransactions, partners]);

  const stats = useMemo(() => {
    const totalSales = filteredTransactions.filter(t => t.type === 'SALE').reduce((a, b) => a + b.amount, 0);
    const totalPurchases = filteredTransactions.filter(t => t.type === 'PURCHASE').reduce((a, b) => a + b.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
    const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;

    return { totalSales, totalPurchases, totalExpenses, totalIncome, netProfit };
  }, [filteredTransactions]);

  const COLORS = ['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-6 print:hidden">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-black text-slate-400 uppercase mb-2">نوع التقرير</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
          >
            <option value="SALES">تقرير المبيعات</option>
            <option value="PURCHASES">تقرير المشتريات</option>
            <option value="EXPENSES">تقرير المصروفات</option>
            <option value="PRODUCT_SALES">مبيعات الأصناف</option>
            <option value="STOCK_LEVELS">مستويات المخزون</option>
            <option value="SUPPLIER_EXPENSES">مصروفات الموردين</option>
            <option value="STAFF">أداء المناديب</option>
            <option value="PARTNERS">كشف حساب العملاء</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase mb-2">من تاريخ</label>
          <input 
            type="date" 
            className="bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase mb-2">إلى تاريخ</label>
          <input 
            type="date" 
            className="bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {reportType === 'STOCK_LEVELS' && (
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">حد التنبيه العام</label>
            <input 
              type="number" 
              className="bg-slate-50 border-none rounded-2xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 w-32"
              value={globalThreshold}
              onChange={(e) => setGlobalThreshold(Number(e.target.value))}
            />
          </div>
        )}
        <button 
          onClick={() => window.print()}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <span>🖨️</span> طباعة التقرير
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-100">
          <p className="text-xs font-black opacity-80 uppercase mb-1">إجمالي المبيعات</p>
          <p className="text-3xl font-black">{stats.totalSales.toLocaleString()} <span className="text-sm font-normal">{settings.currency}</span></p>
        </div>
        <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-100">
          <p className="text-xs font-black opacity-80 uppercase mb-1">إجمالي المشتريات</p>
          <p className="text-3xl font-black">{stats.totalPurchases.toLocaleString()} <span className="text-sm font-normal">{settings.currency}</span></p>
        </div>
        <div className="bg-rose-600 text-white p-6 rounded-3xl shadow-lg shadow-rose-100">
          <p className="text-xs font-black opacity-80 uppercase mb-1">إجمالي المصروفات</p>
          <p className="text-3xl font-black">{stats.totalExpenses.toLocaleString()} <span className="text-sm font-normal">{settings.currency}</span></p>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg shadow-slate-200">
          <p className="text-xs font-black opacity-80 uppercase mb-1">صافي الربح التقديري</p>
          <p className={`text-3xl font-black ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.netProfit.toLocaleString()} <span className="text-sm font-normal">{settings.currency}</span>
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-[400px]">
          <h3 className="text-lg font-black text-slate-900 mb-6">تحليل العمليات المالية</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="sales" name="المبيعات" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" name="المشتريات" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-[400px]">
          <h3 className="text-lg font-black text-slate-900 mb-6">توزيع المصروفات والمداخيل</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="expenses" name="المصروفات" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="income" name="الإيداعات" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-900">
            {reportType === 'PRODUCT_SALES' ? 'تقرير مبيعات الأصناف' : 
             reportType === 'STAFF' ? 'تقرير أداء المناديب والموظفين' :
             reportType === 'STOCK_LEVELS' ? 'تقرير مستويات المخزون' :
             reportType === 'SUPPLIER_EXPENSES' ? 'تقرير مصروفات الموردين' :
             'سجل العمليات التفصيلي'}
          </h3>
          <span className="bg-slate-100 text-slate-600 px-4 py-1 rounded-full text-xs font-bold">
            {reportType === 'PRODUCT_SALES' ? `${productSalesData.length} صنف` : 
             reportType === 'STAFF' ? `${staffPerformanceData.length} موظف` :
             reportType === 'STOCK_LEVELS' ? `${products.length} صنف` :
             reportType === 'SUPPLIER_EXPENSES' ? `${supplierExpensesData.length} مورد` :
             `${filteredTransactions.length} عملية`}
          </span>
        </div>
        <div className="overflow-x-auto">
          {reportType === 'PRODUCT_SALES' ? (
            <table className="w-full text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">اسم الصنف</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">الكمية المباعة</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">إجمالي الإيرادات</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">متوسط السعر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productSalesData.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-900">{p.name}</td>
                    <td className="px-8 py-4 font-black text-indigo-600">{p.quantity.toLocaleString()}</td>
                    <td className="px-8 py-4 font-black text-emerald-600">{p.revenue.toLocaleString()} {settings.currency}</td>
                    <td className="px-8 py-4 text-slate-400 font-bold">
                      {(p.revenue / p.quantity).toFixed(2)} {settings.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'STOCK_LEVELS' ? (
            <table className="w-full text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">اسم الصنف</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">الكمية الحالية</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">حد إعادة الطلب</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.sort((a, b) => a.stock - b.stock).map((p, idx) => {
                  const threshold = p.reorderThreshold || globalThreshold;
                  const isLow = p.stock <= threshold;
                  return (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-rose-50/50' : ''}`}>
                      <td className="px-8 py-4 font-bold text-slate-900">{p.name}</td>
                      <td className={`px-8 py-4 font-black ${isLow ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {p.stock.toLocaleString()} {p.unit}
                      </td>
                      <td className="px-8 py-4 text-slate-400 font-bold">
                        {threshold} {p.unit}
                      </td>
                      <td className="px-8 py-4">
                        {isLow ? (
                          <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black">
                            ⚠️ مخزون منخفض
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black">
                            ✅ متوفر
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : reportType === 'SUPPLIER_EXPENSES' ? (
            <table className="w-full text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">اسم المورد</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">إجمالي المدفوعات</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">عدد العمليات</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">متوسط العملية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supplierExpensesData.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-900">{s.name}</td>
                    <td className="px-8 py-4 font-black text-rose-600">{s.totalPaid.toLocaleString()} {settings.currency}</td>
                    <td className="px-8 py-4 font-black text-indigo-600">{s.count.toLocaleString()}</td>
                    <td className="px-8 py-4 text-slate-400 font-bold">
                      {s.count > 0 ? (s.totalPaid / s.count).toFixed(2) : 0} {settings.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'STAFF' ? (
            <table className="w-full text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">اسم الموظف / المندوب</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">إجمالي المبيعات</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">عدد العمليات</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">نقاط الأداء</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">متوسط الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffPerformanceData.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-900">{s.name}</td>
                    <td className="px-8 py-4 font-black text-emerald-600">{s.sales.toLocaleString()} {settings.currency}</td>
                    <td className="px-8 py-4 font-black text-indigo-600">{s.count.toLocaleString()}</td>
                    <td className="px-8 py-4">
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black">
                        ⭐ {s.points} نقطة
                      </span>
                    </td>
                    <td className="px-8 py-4 text-slate-400 font-bold">
                      {s.count > 0 ? (s.sales / s.count).toFixed(2) : 0} {settings.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">التاريخ</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">النوع</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">الطرف الثاني</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">المبلغ</th>
                  <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.sort((a, b) => b.timestamp - a.timestamp).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-700">{t.date}</td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        t.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' :
                        t.type === 'PURCHASE' ? 'bg-indigo-100 text-indigo-700' :
                        t.type === 'EXPENSE' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.type === 'SALE' ? 'بيع' : t.type === 'PURCHASE' ? 'شراء' : t.type === 'EXPENSE' ? 'مصروف' : 'إيداع'}
                      </span>
                    </td>
                    <td className="px-8 py-4 font-bold text-slate-900">{t.partnerName}</td>
                    <td className="px-8 py-4 font-black text-slate-900">{t.amount.toLocaleString()}</td>
                    <td className="px-8 py-4">
                      <span className={`text-[10px] font-bold ${t.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {t.status === 'PAID' ? '● مدفوع' : '● معلق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center mt-10 text-slate-400 text-[10px] font-bold border-t pt-4">
        {settings.companyName} - تقرير مالي للفترة من {startDate} إلى {endDate}
        <br />
        تم استخراج هذا التقرير آلياً بواسطة نظام ديسترو سمارت الذكي
      </div>
    </div>
  );
};

export default Reports;
