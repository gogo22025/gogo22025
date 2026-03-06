
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, User } from '../types';

interface SafeProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUser: User;
}

const Safe: React.FC<SafeProps> = ({ transactions, setTransactions, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [printTrigger, setPrintTrigger] = useState(0);
  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    notes: '',
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const safeMovements = useMemo(() => {
    return transactions.filter(t => 
      t.status === 'PAID' && (t.type === 'SALE' || t.type === 'PURCHASE' || t.type === 'EXPENSE' || t.type === 'INCOME' || t.type === 'RETURN')
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions]);

  const dailyStats = useMemo(() => {
    const todayMovements = safeMovements.filter(m => m.date === todayStr);
    const cashIn = todayMovements
      .filter(m => m.type === 'SALE' || m.type === 'INCOME' || (m.type === 'RETURN' && m.notes?.includes('مشتريات')))
      .reduce((a, b) => a + b.amount, 0);
    const cashOut = todayMovements
      .filter(m => m.type === 'PURCHASE' || m.type === 'EXPENSE' || (m.type === 'RETURN' && m.notes?.includes('مبيعات')))
      .reduce((a, b) => a + b.amount, 0);
    
    const totalBalance = safeMovements.reduce((acc, m) => {
      if (m.type === 'SALE' || m.type === 'INCOME' || (m.type === 'RETURN' && m.notes?.includes('مشتريات'))) return acc + m.amount;
      if (m.type === 'PURCHASE' || m.type === 'EXPENSE' || (m.type === 'RETURN' && m.notes?.includes('مبيعات'))) return acc - m.amount;
      return acc;
    }, 0);

    return { cashIn, cashOut, totalBalance, todayCount: todayMovements.length, todayMovements };
  }, [safeMovements, todayStr]);

  useEffect(() => {
    if (printTrigger > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printTrigger]);

  const preparePrint = (tx: Transaction | null) => {
    setActiveReceipt(tx);
    setPrintTrigger(prev => prev + 1);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const confirmMsg = tx.type === 'SALE' || tx.type === 'PURCHASE' 
      ? 'هذه الحركة مرتبطة بفاتورة بيع أو شراء. يفضل حذفها من قسمها المخصص لضمان دقة المخزون. هل تريد حذف الحركة المالية فقط من الخزنة؟'
      : 'هل أنت متأكد من حذف هذه الحركة المالية من السجل؟';

    if (window.confirm(confirmMsg)) {
      setTransactions((prev: Transaction[]) => prev.filter(t => t.id !== id));
      alert('تم حذف الحركة المالية بنجاح ✅');
    }
  };

  const handleAddManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.amount <= 0) return;

    const newTx: Transaction = {
      id: `SAFE-${Date.now().toString().slice(-6)}`,
      date: todayStr,
      timestamp: Date.now(),
      type: expenseForm.type,
      partnerName: expenseForm.type === 'EXPENSE' ? 'مصروفات عامة' : 'إيداع يدوي',
      amount: expenseForm.amount,
      subtotal: expenseForm.amount,
      taxAmount: 0,
      discountAmount: 0,
      status: 'PAID',
      items: [],
      notes: expenseForm.notes
    };

    setTransactions((prev: Transaction[]) => [newTx, ...prev]);
    setIsModalOpen(false);
    setExpenseForm({ amount: 0, notes: '', type: 'EXPENSE' });
    preparePrint(newTx);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-10 -translate-y-10"></div>
           <p className="text-slate-400 text-sm font-bold uppercase mb-2 tracking-widest">الرصيد الفعلي الحالي</p>
           <h4 className="text-4xl font-black">{dailyStats.totalBalance.toLocaleString()} <span className="text-lg font-normal">ج.م</span></h4>
           <div className="mt-6 flex gap-4">
              <button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-4 py-2 rounded-full font-bold transition-colors shadow-lg">💸 حركة يدوية</button>
              <button onClick={() => preparePrint(null)} className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-full font-bold transition-colors">🖨️ ملخص اليوم</button>
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
           <p className="text-gray-400 text-xs font-black mb-1 uppercase">إجمالي الوارد اليوم</p>
           <h4 className="text-2xl font-black text-emerald-600">+{dailyStats.cashIn.toLocaleString()} ج.م</h4>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
           <p className="text-gray-400 text-xs font-black mb-1 uppercase">إجمالي الصادر اليوم</p>
           <h4 className="text-2xl font-black text-red-500">-{dailyStats.cashOut.toLocaleString()} ج.م</h4>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden print:hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
           <h3 className="font-black text-slate-800">سجل حركة الخزنة</h3>
           <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border">
             {safeMovements.length} حركة مسجلة
           </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">البيان</th>
                <th className="px-6 py-4 text-center">النوع</th>
                <th className="px-6 py-4 text-left">المبلغ</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {safeMovements.map((m) => {
                const isPositive = m.type === 'SALE' || m.type === 'INCOME';
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{m.date}</p>
                      <p className="text-[10px] text-slate-400 font-mono">#{m.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{m.partnerName}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{m.notes}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {m.type === 'SALE' ? 'مبيعات' : m.type === 'PURCHASE' ? 'مشتريات' : m.type === 'EXPENSE' ? 'مصروف' : m.type === 'RETURN' ? 'مرتجع' : 'إيداع'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-left font-mono font-bold text-lg ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : '-'}{m.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2">
                          <button onClick={() => preparePrint(m)} className="p-2 hover:bg-slate-100 rounded-lg" title="طباعة">🖨️</button>
                          {currentUser.role === 'ADMIN' && (
                            <button 
                              /* Fixed: Use m.id instead of undefined id */
                              onClick={() => handleDeleteTransaction(m.id)} 
                              className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                              title="حذف الحركة"
                            >
                              🗑️
                            </button>
                          )}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🧾 قالب الطباعة الموحد */}
      <div className="hidden print:block p-10 bg-white text-black min-h-screen" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
        <div className="text-center border-b-4 border-black pb-6 mb-8">
          <h1 className="text-4xl font-black">ديسترو سمارت 🚀</h1>
          <p className="text-lg font-bold mt-2">نظام إدارة التوزيع المتكامل</p>
          <p className="text-sm mt-1">{new Date().toLocaleString('ar-EG')}</p>
        </div>

        {activeReceipt ? (
          /* ✅ وضع طباعة إيصال حركة واحدة */
          <div className="space-y-8">
            <div className="text-center bg-gray-100 py-4 rounded-3xl">
              <h2 className="text-3xl font-black">{activeReceipt.type === 'EXPENSE' || activeReceipt.type === 'PURCHASE' ? 'سند صرف نقدية' : 'سند قبض نقدية'}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-10 text-xl border-b border-dashed pb-8">
              <div className="flex flex-col gap-2">
                <span className="text-gray-500">رقم العملية:</span>
                <span className="font-black">#{activeReceipt.id}</span>
              </div>
              <div className="flex flex-col gap-2 text-left">
                <span className="text-gray-500">تاريخ المعاملة:</span>
                <span className="font-black">{activeReceipt.date}</span>
              </div>
            </div>

            <div className="space-y-6 py-4">
              <div className="flex justify-between items-center text-xl">
                <span className="font-bold">يصرف لـ / يستلم من:</span>
                <span className="font-black underline decoration-2 underline-offset-8">{activeReceipt.partnerName}</span>
              </div>
              <div className="flex justify-between items-start text-xl">
                <span className="font-bold whitespace-nowrap ml-4">وذلك عن:</span>
                <span className="font-medium text-right leading-relaxed">{activeReceipt.notes || 'تسوية حساب مالي'}</span>
              </div>
            </div>

            <div className="mt-12 p-8 border-4 border-black rounded-[2rem] flex justify-between items-center">
              <span className="text-3xl font-black">المبلغ الإجمالي:</span>
              <span className="text-5xl font-black">{activeReceipt.amount.toLocaleString()} ج.م</span>
            </div>

            <div className="grid grid-cols-2 gap-20 mt-20 text-center font-bold">
              <div className="border-t-2 border-black pt-4">توقيع المستلم</div>
              <div className="border-t-2 border-black pt-4">توقيع أمين الخزنة</div>
            </div>
          </div>
        ) : (
          /* 📊 وضع طباعة ملخص اليوم المالي */
          <div className="space-y-10">
            <div className="text-center bg-slate-900 text-white py-6 rounded-3xl">
              <h2 className="text-3xl font-black">تقرير ملخص الخزنة اليومي</h2>
              <p className="text-emerald-400 font-bold mt-1 tracking-widest">{todayStr}</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
               <div className="border-2 border-gray-100 p-6 rounded-3xl text-center">
                  <p className="text-gray-400 font-black text-xs uppercase mb-2">إجمالي الوارد اليوم</p>
                  <p className="text-2xl font-black text-emerald-600">+{dailyStats.cashIn.toLocaleString()} ج.م</p>
               </div>
               <div className="border-2 border-gray-100 p-6 rounded-3xl text-center">
                  <p className="text-gray-400 font-black text-xs uppercase mb-2">إجمالي الصادر اليوم</p>
                  <p className="text-2xl font-black text-red-500">-{dailyStats.cashOut.toLocaleString()} ج.م</p>
               </div>
               <div className="bg-gray-50 p-6 rounded-3xl text-center">
                  <p className="text-gray-400 font-black text-xs uppercase mb-2">صافي حركة اليوم</p>
                  <p className={`text-2xl font-black ${(dailyStats.cashIn - dailyStats.cashOut) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {(dailyStats.cashIn - dailyStats.cashOut).toLocaleString()} ج.م
                  </p>
               </div>
            </div>

            <div className="mt-8">
               <h3 className="text-xl font-black mb-4 border-r-4 border-black pr-4">تفاصيل الحركات (اليوم)</h3>
               <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-black text-sm">
                      <th className="p-3 border">رقم الحركة</th>
                      <th className="p-3 border">البيان / الشريك</th>
                      <th className="p-3 border">النوع</th>
                      <th className="p-3 border">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStats.todayMovements.map(m => (
                      <tr key={m.id} className="text-sm font-bold border-b">
                        <td className="p-3 border font-mono">#{m.id}</td>
                        <td className="p-3 border">{m.partnerName}</td>
                        <td className="p-3 border text-xs">{m.type}</td>
                        <td className="p-3 border font-black">
                          {m.amount.toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))}
                    {dailyStats.todayMovements.length === 0 && (
                      <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold">لا توجد حركات مسجلة لهذا اليوم</td></tr>
                    )}
                  </tbody>
               </table>
            </div>

            <div className="p-8 bg-slate-100 rounded-3xl mt-10">
               <div className="flex justify-between items-center">
                  <span className="text-2xl font-black">رصيد الخزنة الختامي:</span>
                  <span className="text-4xl font-black">{dailyStats.totalBalance.toLocaleString()} ج.م</span>
               </div>
            </div>

            <div className="text-center mt-20 text-gray-300 text-[10px] font-bold">
               تم استخراج هذا التقرير آلياً بواسطة نظام ديسترو سمارت الذكي
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="text-xl font-black">حركة مالية يدوية</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-2xl">&times;</button>
             </div>
             <form onSubmit={handleAddManualEntry} className="p-8 space-y-5">
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setExpenseForm({...expenseForm, type: 'EXPENSE'})}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${expenseForm.type === 'EXPENSE' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}
                  >
                    🔻 مصروف
                  </button>
                  <button 
                    type="button"
                    onClick={() => setExpenseForm({...expenseForm, type: 'INCOME'})}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${expenseForm.type === 'INCOME' ? 'bg-white text-emerald-500 shadow-sm' : 'text-gray-400'}`}
                  >
                    🔺 إيداع
                  </button>
                </div>
                <div>
                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">المبلغ (ج.م)</label>
                   <input 
                     required type="number" 
                     className="w-full text-3xl font-black text-center border-b-2 border-gray-100 focus:border-slate-900 outline-none pb-2" 
                     value={expenseForm.amount || ''}
                     onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">البيان</label>
                   <textarea 
                     className="w-full bg-gray-50 rounded-2xl p-4 text-sm border-none focus:ring-2 focus:ring-slate-900 outline-none h-24" 
                     placeholder="ادخل تفاصيل العملية..."
                     value={expenseForm.notes}
                     onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})}
                   />
                </div>
                <button type="submit" className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${expenseForm.type === 'EXPENSE' ? 'bg-red-500' : 'bg-emerald-500'}`}>حفظ وتأكيد</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Safe;
