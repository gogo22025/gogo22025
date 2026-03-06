
import React, { useState, useMemo } from 'react';
import { Partner, Transaction } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

interface PartnersProps {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const Partners: React.FC<PartnersProps> = ({ partners, setPartners, transactions, setTransactions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DEBT' | 'CREDIT' | 'ZERO'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const [formData, setFormData] = useState<Omit<Partner, 'id'>>({
    name: '',
    type: 'CUSTOMER',
    phone: '',
    address: '',
    balance: 0,
    loyaltyPoints: 0
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.phone || '').includes(searchQuery);
      const matchesType = filterType === 'ALL' || p.type === filterType;
      const matchesBalance = balanceFilter === 'ALL' || 
                           (balanceFilter === 'DEBT' && p.balance < 0) || 
                           (balanceFilter === 'CREDIT' && p.balance > 0) ||
                           (balanceFilter === 'ZERO' && p.balance === 0);
      return matchesSearch && matchesType && matchesBalance;
    });
  }, [partners, searchQuery, filterType, balanceFilter]);

  const stats = useMemo(() => {
    const customersDebt = partners.filter(p => p.type === 'CUSTOMER' && p.balance < 0).reduce((a, b) => a + Math.abs(b.balance), 0);
    const suppliersCredit = partners.filter(p => p.type === 'SUPPLIER' && p.balance > 0).reduce((a, b) => a + b.balance, 0);
    const customersCredit = partners.filter(p => p.type === 'CUSTOMER' && p.balance > 0).reduce((a, b) => a + b.balance, 0);
    const suppliersDebt = partners.filter(p => p.type === 'SUPPLIER' && p.balance < 0).reduce((a, b) => a + Math.abs(b.balance), 0);
    return { customersDebt, suppliersCredit, customersCredit, suppliersDebt };
  }, [partners]);

  const handleDeletePartner = (id: string, name: string, balance: number) => {
    if (balance !== 0) {
      alert(`عذراً، لا يمكن حذف "${name}" لوجود رصيد متبقي (${balance.toLocaleString()} ج.م). يجب تصفية الحساب أولاً قبل الحذف.`);
      return;
    }

    setConfirmation({
      isOpen: true,
      title: 'حذف الشريك',
      message: `هل أنت متأكد من حذف الشريك "${name}" نهائياً من النظام؟ لا يمكن التراجع عن هذه الخطوة.`,
      type: 'danger',
      onConfirm: () => {
        setPartners((prev: Partner[]) => prev.filter(p => p.id !== id));
        setConfirmation(prev => ({ ...prev, isOpen: false }));
        alert('تم حذف الشريك بنجاح ✅');
      }
    });
  };

  const handleZeroBalance = (partner: Partner) => {
    if (partner.balance === 0) {
      alert('الحساب مصفّر بالفعل.');
      return;
    }

    setConfirmation({
      isOpen: true,
      title: 'تصفير الحساب',
      message: `هل أنت متأكد من تصفير حساب "${partner.name}"؟ سيتم تسجيل حركة تسوية بالرصيد المتبقي (${partner.balance.toLocaleString()} ج.م).`,
      type: 'warning',
      onConfirm: () => {
        const amount = Math.abs(partner.balance);
        
        const newTx: Transaction = {
          id: `ZERO-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          type: partner.balance < 0 ? 'INCOME' : 'EXPENSE',
          partnerName: partner.name,
          amount: amount,
          subtotal: amount,
          taxAmount: 0,
          discountAmount: 0,
          status: 'PAID',
          items: [],
          notes: `تصفير حساب آلي (تسوية رصيد)`
        };

        setTransactions((prev: Transaction[]) => [newTx, ...prev]);
        setPartners((prevPartners: Partner[]) => prevPartners.map(p => {
          if (p.id === partner.id) {
            return { ...p, balance: 0 };
          }
          return p;
        }));
        
        setConfirmation(prev => ({ ...prev, isOpen: false }));
        alert('تم تصفير الحساب بنجاح ✅');
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newPartner: Partner = {
      ...formData,
      id: `p${Math.random().toString(36).substr(2, 5)}`
    };
    setPartners((prev: Partner[]) => [...prev, newPartner]);
    setIsModalOpen(false);
    setFormData({ name: '', type: 'CUSTOMER', phone: '', address: '', balance: 0, loyaltyPoints: 0 });
  };

  const handleSettlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || paymentForm.amount <= 0) return;

    const isCustomer = selectedPartner.type === 'CUSTOMER';
    const newTx: Transaction = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      date: paymentForm.date,
      timestamp: Date.now(),
      type: isCustomer ? 'INCOME' : 'EXPENSE',
      partnerName: selectedPartner.name,
      amount: paymentForm.amount,
      subtotal: paymentForm.amount,
      taxAmount: 0,
      discountAmount: 0,
      status: 'PAID',
      items: [],
      notes: paymentForm.notes || (isCustomer ? `تحصيل دفعة من حساب عميل` : `سداد دفعة من حساب مورد`)
    };

    setTransactions((prev: Transaction[]) => [newTx, ...prev]);
    setPartners((prevPartners: Partner[]) => prevPartners.map(p => {
      if (p.id === selectedPartner.id) {
        const change = isCustomer ? paymentForm.amount : -paymentForm.amount;
        return { ...p, balance: p.balance + change };
      }
      return p;
    }));

    setIsPaymentModalOpen(false);
    setPaymentForm({ amount: 0, notes: '', date: new Date().toISOString().split('T')[0] });
    alert('تم تنفيذ العملية وتحديث الأرصدة بنجاح ✅');
  };

  const partnerTransactions = useMemo(() => {
    if (!selectedPartner) return [];
    return transactions.filter(t => t.partnerName === selectedPartner.name)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedPartner, transactions]);

  const predictedBalance = useMemo(() => {
    if (!selectedPartner) return 0;
    const isCustomer = selectedPartner.type === 'CUSTOMER';
    const change = isCustomer ? (paymentForm.amount || 0) : -(paymentForm.amount || 0);
    return selectedPartner.balance + change;
  }, [selectedPartner, paymentForm.amount]);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-100">💰</div>
            <div className="text-left">
              <span className="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">مديونيات العملاء (لنا)</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-slate-900 tracking-tight">{stats.customersDebt.toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span></p>
            <p className="text-[11px] text-slate-400 font-bold mt-2 leading-relaxed">إجمالي المبالغ المستحقة للتحصيل من العملاء المدينين</p>
          </div>
          {stats.customersCredit > 0 && (
            <div className="pt-6 border-t border-slate-50 flex justify-between items-center relative z-10">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">أرصدة عملاء دائنة (أمانات):</span>
              <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{stats.customersCredit.toLocaleString()} ج.م</span>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-100">🏦</div>
            <div className="text-left">
              <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">مستحقات الموردين (علينا)</span>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black text-slate-900 tracking-tight">{stats.suppliersCredit.toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span></p>
            <p className="text-[11px] text-slate-400 font-bold mt-2 leading-relaxed">إجمالي المبالغ المطلوب سدادها للموردين الدائنين</p>
          </div>
          {stats.suppliersDebt > 0 && (
            <div className="pt-6 border-t border-slate-50 flex justify-between items-center relative z-10">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">أرصدة موردين مدينة (سلف):</span>
              <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{stats.suppliersDebt.toLocaleString()} ج.م</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-6 items-center">
          <div className="relative flex-1 w-full">
            <input 
              type="text" 
              placeholder="بحث باسم الشريك أو رقم الهاتف..." 
              className="w-full pr-12 pl-4 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
            <span className="absolute right-4 top-4 text-xl opacity-30">🔍</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="w-full md:w-auto bg-slate-950 text-white px-10 py-4 rounded-2xl font-black hover:bg-slate-800 shadow-xl flex items-center justify-center whitespace-nowrap transition-all active:scale-95"
          >
            <span className="ml-2">👤</span> إضافة شريك جديد
          </button>
        </div>

        <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-gray-50">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'CUSTOMER', 'SUPPLIER'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
                  filterType === type 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type === 'ALL' ? 'الكل' : type === 'CUSTOMER' ? 'العملاء' : 'الموردين'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block" />

          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'DEBT', 'CREDIT', 'ZERO'] as const).map((bType) => (
              <button
                key={bType}
                onClick={() => setBalanceFilter(bType)}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
                  balanceFilter === bType 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {bType === 'ALL' ? 'كل الأرصدة' : bType === 'DEBT' ? 'مدين' : bType === 'CREDIT' ? 'دائن' : 'حسابات مصفّرة'}
              </button>
            ))}
          </div>
          
          <div className="mr-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
            عرض {filteredPartners.length} من {partners.length} شريك
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPartners.map(p => (
          <div key={p.id} className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-100 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ml-4 shadow-sm ${p.type === 'CUSTOMER' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>{p.name[0]}</div>
                 <div>
                   <h4 className="font-black text-gray-900 text-lg leading-tight">{p.name}</h4>
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{p.phone || 'بدون رقم هاتف'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => handleZeroBalance(p)} className="bg-amber-50 text-amber-500 hover:text-amber-700 p-2 rounded-xl transition-colors" title="تصفير الحساب">⚖️</button>
                 <button onClick={() => handleDeletePartner(p.id, p.name, p.balance)} className="bg-red-50 text-red-400 hover:text-red-600 p-2 rounded-xl transition-colors" title="حذف الشريك">🗑️</button>
                 <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${p.type === 'CUSTOMER' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-700'}`}>{p.type === 'CUSTOMER' ? '🛒 عميل' : '🚛 مورد'}</div>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-3xl mb-8 flex justify-between items-center border border-gray-100">
               <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">الرصيد الفعلي</p>
                  <p className={`text-2xl font-black ${p.balance < 0 ? 'text-red-500' : p.balance > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{Math.abs(p.balance).toLocaleString()} <span className="text-xs font-normal">ج.م</span></p>
               </div>
               <div className="text-left"><span className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 ${p.balance < 0 ? 'bg-red-50 text-red-600 border-red-100' : p.balance > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{p.balance < 0 ? 'مطلوب منه (دين)' : p.balance > 0 ? 'مستحق له (دائن)' : 'الحساب خالص'}</span></div>
            </div>
            <div className="flex gap-4 relative z-10">
              <button onClick={() => {setSelectedPartner(p); setIsStatementOpen(true)}} className="flex-1 bg-white border-2 border-slate-100 text-slate-500 py-3.5 rounded-2xl text-[11px] font-black hover:border-slate-900 hover:text-slate-900 transition-all uppercase tracking-widest">📑 كشف الحساب</button>
              <button onClick={() => {setSelectedPartner(p); setIsPaymentModalOpen(true)}} className={`flex-1 text-white py-3.5 rounded-2xl text-[11px] font-black shadow-xl transition-all active:scale-95 uppercase tracking-widest ${p.type === 'CUSTOMER' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>{p.type === 'CUSTOMER' ? '💵 تحصيل نقدية' : '💸 سداد نقدية'}</button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal & Statement Modal ... (rest remains same but using handleDeletePartner) */}
      {/* Statement Modal */}
      {isStatementOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-10 bg-slate-950 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-3xl font-black tracking-tight">كشف حساب تفصيلي</h3>
                <p className="text-emerald-400 text-sm font-bold mt-1 uppercase tracking-widest">{selectedPartner.name} • {selectedPartner.type === 'CUSTOMER' ? 'عميل' : 'مورد'}</p>
              </div>
              <button onClick={() => setIsStatementOpen(false)} className="text-5xl font-light text-slate-500 hover:text-white transition-colors">&times;</button>
            </div>
            
            <div className="p-10 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-100 shrink-0">
               <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm text-center">
                 <p className="text-[10px] text-gray-400 font-black uppercase mb-2 tracking-widest">الرصيد الختامي</p>
                 <p className={`text-3xl font-black ${selectedPartner.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                   {Math.abs(selectedPartner.balance).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                 </p>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm text-center">
                 <p className="text-[10px] text-gray-400 font-black uppercase mb-2 tracking-widest">إجمالي الحركات</p>
                 <p className="text-3xl font-black text-slate-800">{partnerTransactions.length}</p>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm text-center">
                 <p className="text-[10px] text-gray-400 font-black uppercase mb-2 tracking-widest">آخر معاملة</p>
                 <p className="text-2xl font-black text-slate-800">{partnerTransactions[0]?.date || '-'}</p>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
               <table className="w-full text-right border-separate border-spacing-y-3">
                 <thead className="sticky top-0 bg-white z-10">
                   <tr className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                     <th className="pb-6 pr-6">التاريخ</th>
                     <th className="pb-6">نوع العملية والبيان</th>
                     <th className="pb-6">مدين (سحب/فاتورة)</th>
                     <th className="pb-6">دائن (دفع/توريد)</th>
                     <th className="pb-6 text-left pl-6">الحالة</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm">
                   {partnerTransactions.length > 0 ? partnerTransactions.map((t) => (
                     <tr key={t.id} className="group transition-all hover:scale-[1.01]">
                       <td className="py-6 pr-6 bg-white border-y border-r rounded-r-[1.5rem] border-gray-100 shadow-sm">
                          <p className="font-bold text-slate-800">{t.date}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-1">Ref: #{t.id}</p>
                       </td>
                       <td className="py-6 bg-white border-y border-gray-100 shadow-sm">
                          <p className="font-black text-slate-900">
                             {t.type === 'SALE' ? '🛍️ فاتورة مبيعات' : 
                              t.type === 'PURCHASE' ? '📦 فاتورة مشتريات' : 
                              t.type === 'INCOME' ? '💵 تحصيل دفعة' : 
                              t.type === 'EXPENSE' ? '💸 سداد دفعة' : t.type}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 truncate max-w-xs">{t.notes || 'لا يوجد ملاحظات'}</p>
                       </td>
                       <td className="py-6 bg-white border-y border-gray-100 shadow-sm text-red-500 font-black text-lg">
                          {(t.type === 'SALE' || t.type === 'EXPENSE') ? t.amount.toLocaleString() : '-'}
                       </td>
                       <td className="py-6 bg-white border-y border-gray-100 shadow-sm text-emerald-600 font-black text-lg">
                          {(t.type === 'PURCHASE' || t.type === 'INCOME') ? t.amount.toLocaleString() : '-'}
                       </td>
                       <td className="py-6 pl-6 bg-white border-y border-l rounded-l-[1.5rem] border-gray-100 shadow-sm text-left">
                          <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest">PAID</span>
                       </td>
                     </tr>
                   )) : (
                     <tr><td colSpan={5} className="py-24 text-center text-gray-300">
                        <span className="text-7xl block mb-6">📂</span>
                        <p className="font-black italic text-lg text-gray-200">لا توجد حركات مالية مسجلة لهذا الشريك</p>
                     </td></tr>
                   )}
                 </tbody>
               </table>
            </div>
            <div className="p-10 border-t bg-gray-50 flex justify-between items-center shrink-0">
               <div className="flex gap-4">
                 <button onClick={() => window.print()} className="bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-3"><span>🖨️</span> طباعة كشف الحساب</button>
                 <button 
                   onClick={() => handleZeroBalance(selectedPartner)} 
                   className="bg-amber-500 text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl hover:bg-amber-600 transition-all active:scale-95 flex items-center gap-3"
                 >
                   <span>⚖️</span> تصفير الحساب الحالي
                 </button>
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">ديسترو سمارت - سجلات محاسبية دقيقة</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Partner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">إضافة شريك جديد</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">اسم العميل / المورد</label>
                <input required type="text" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">التصنيف</label>
                  <select className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold cursor-pointer" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="CUSTOMER">🛒 عميل</option>
                    <option value="SUPPLIER">🚛 مورد</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">رقم الهاتف</label>
                  <input required type="tel" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">العنوان</label>
                <input type="text" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">رصيد البداية المفتوح (ج.م)</label>
                <input type="number" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold text-lg" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} />
              </div>
              <button type="submit" className="w-full bg-slate-950 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-slate-900 transition-all active:scale-95 uppercase tracking-widest text-sm">حفظ شريك جديد</button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {isPaymentModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className={`p-8 ${selectedPartner.type === 'CUSTOMER' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white flex justify-between items-center`}>
              <div>
                <h3 className="text-xl font-black">{selectedPartner.type === 'CUSTOMER' ? 'تحصيل نقدية من عميل' : 'سداد نقدية لمورد'}</h3>
                <p className="text-xs opacity-80 font-bold mt-1">{selectedPartner.name}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-3xl">&times;</button>
            </div>
            
            <form onSubmit={handleSettlePayment} className="p-10 space-y-6">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">الرصيد الحالي</p>
                  <p className={`text-2xl font-black ${selectedPartner.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {Math.abs(selectedPartner.balance).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </p>
                </div>
                <div className="text-left">
                   <p className="text-[10px] text-gray-400 font-black uppercase mb-1">الرصيد المتوقع</p>
                   <p className={`text-lg font-black ${predictedBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {Math.abs(predictedBalance).toLocaleString()}
                   </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">المبلغ المدفوع (ج.م)</label>
                <input 
                  required 
                  type="number" 
                  className={`w-full px-6 py-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 ${selectedPartner.type === 'CUSTOMER' ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500'} font-black text-3xl text-slate-800`}
                  value={paymentForm.amount || ''} 
                  onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">تاريخ العملية</label>
                <input 
                  required 
                  type="date" 
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold"
                  value={paymentForm.date} 
                  onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest mr-2">ملاحظات إضافية</label>
                <textarea 
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold resize-none h-24"
                  placeholder="مثال: دفعة تحت الحساب، تسوية فاتورة رقم..."
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                ></textarea>
              </div>

              <button 
                type="submit" 
                className={`w-full text-white font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm ${selectedPartner.type === 'CUSTOMER' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
              >
                تأكيد العملية وتحديث الحساب
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={confirmation.onConfirm}
        onCancel={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
        type={confirmation.type}
      />
    </div>
  );
};

export default Partners;
