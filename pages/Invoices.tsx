
import React, { useState, useMemo } from 'react';
import { Transaction, AppView, Partner, StaffMember, Product, User, BillingSettings } from '../types';

interface InvoicesProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  staff: StaffMember[];
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  currentUser: User;
  settings: BillingSettings;
}

const Invoices: React.FC<InvoicesProps> = ({ transactions, setTransactions, partners, setPartners, products, setProducts, staff, setStaff, currentUser, settings }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'RETURN'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<Transaction | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Transaction | null>(null);

  const handleDeleteInvoice = (invoice: Transaction) => {
    const id = invoice.id;

    // 1. عكس تأثير المخزون
    if (invoice.type === 'SALE') {
      if (invoice.staffId && staff.some(s => s.id === invoice.staffId)) {
        setStaff((prev: StaffMember[]) => prev.map(s => {
          if (s.id === invoice.staffId) {
            const newInv = [...(s.currentInventory || [])];
            (invoice.items || []).forEach(item => {
              const idx = newInv.findIndex(i => i.productId === item.productId);
              if (idx > -1) newInv[idx].quantity += item.quantity;
              else newInv.push({ productId: item.productId, name: item.name, quantity: item.quantity });
            });
            return { 
              ...s, 
              currentInventory: newInv,
              performancePoints: Math.max(0, (s.performancePoints || 0) - Math.floor(invoice.amount / 100)),
              totalCollection: Math.max(0, (s.totalCollection || 0) - (invoice.status === 'PAID' ? invoice.amount : 0))
            };
          }
          return s;
        }));
      } else {
        setProducts((prev: Product[]) => prev.map(p => {
          const item = (invoice.items || []).find(i => i.productId === p.id);
          return item ? { ...p, stock: p.stock + item.quantity } : p;
        }));
      }
    } else if (invoice.type === 'PURCHASE') {
      setProducts((prev: Product[]) => prev.map(p => {
        const item = (invoice.items || []).find(i => i.productId === p.id);
        return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
      }));
    } else if (invoice.type === 'RETURN') {
      const isSaleReturn = invoice.notes?.includes('مبيعات');
      if (isSaleReturn) {
        // عكس مرتجع المبيعات (خصم من المخزن)
        setProducts((prev: Product[]) => prev.map(p => {
          const item = (invoice.items || []).find(i => i.productId === p.id);
          return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
        }));
      } else {
        // عكس مرتجع المشتريات (إضافة للمخزن)
        setProducts((prev: Product[]) => prev.map(p => {
          const item = (invoice.items || []).find(i => i.productId === p.id);
          return item ? { ...p, stock: p.stock + item.quantity } : p;
        }));
      }
    }

    // 2. عكس تأثير الحسابات (الشركاء)
    setPartners((prev: Partner[]) => prev.map(p => {
      if (p.name === invoice.partnerName) {
        let balanceChange = 0;
        if (invoice.type === 'SALE') {
          balanceChange = (invoice.status === 'PENDING' ? invoice.amount : 0);
        } else if (invoice.type === 'PURCHASE') {
          balanceChange = -(invoice.status === 'PENDING' ? invoice.amount : 0);
        } else if (invoice.type === 'RETURN') {
          const isSaleReturn = invoice.notes?.includes('مبيعات');
          balanceChange = isSaleReturn ? -invoice.amount : invoice.amount;
        }
        return { ...p, balance: p.balance + balanceChange };
      }
      return p;
    }));

    // 3. الحذف من السجل
    setTransactions((prev: Transaction[]) => prev.filter(t => t.id !== id));
    alert('تم حذف الفاتورة وعكس كافة تأثيراتها بنجاح ✅');
  };

  const filteredInvoices = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filterType === 'ALL' || t.type === filterType;
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const matchesSearch = t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.partnerName.toLowerCase().includes(searchQuery.toLowerCase());
      return (t.type === 'SALE' || t.type === 'PURCHASE' || t.type === 'RETURN') && matchesType && matchesStatus && matchesSearch;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, filterType, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            الكل
          </button>
          <button 
            onClick={() => setFilterType('SALE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'SALE' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            فواتير البيع
          </button>
          <button 
            onClick={() => setFilterType('PURCHASE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'PURCHASE' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            فواتير الشراء
          </button>
          <button 
            onClick={() => setFilterType('RETURN')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'RETURN' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            المرتجعات
          </button>
        </div>

        <div className="flex gap-2">
           <select 
             className="px-4 py-2 rounded-xl bg-gray-100 border-none text-xs font-bold outline-none"
             value={filterStatus}
             onChange={e => setFilterStatus(e.target.value as any)}
           >
             <option value="ALL">كل الحالات</option>
             <option value="PAID">مسددة</option>
             <option value="PENDING">آجلة</option>
           </select>
           <div className="relative">
              <input 
                type="text" 
                placeholder="بحث برقم الفاتورة أو الاسم..." 
                className="px-10 py-2 rounded-xl bg-gray-100 border-none text-xs font-bold outline-none w-64"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-3 top-2 opacity-30">🔍</span>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden print:hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400">رقم الفاتورة</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">التاريخ</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">النوع</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">الشريك</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">المبلغ</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">الحالة</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-slate-900">{inv.id}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-500">{inv.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${inv.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : inv.type === 'PURCHASE' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                    {inv.type === 'SALE' ? 'بيع' : inv.type === 'PURCHASE' ? 'شراء' : 'مرتجع'}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">{inv.partnerName}</td>
                <td className="px-6 py-4 font-black">{inv.amount.toLocaleString()} ج.م</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    {inv.status === 'PAID' ? 'مسددة' : 'آجلة'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setViewingInvoice(inv)}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                      title="عرض الفاتورة"
                    >
                      👁️
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button 
                        onClick={() => setInvoiceToDelete(inv)}
                        className="p-2 hover:bg-red-50 text-red-300 hover:text-red-600 rounded-xl transition-all"
                        title="حذف الفاتورة"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-bold">لا توجد فواتير مطابقة للبحث</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden print:shadow-none print:rounded-none">
            <div className={`p-8 ${viewingInvoice.type === 'SALE' ? 'bg-emerald-600' : viewingInvoice.type === 'PURCHASE' ? 'bg-indigo-600' : 'bg-red-600'} text-white flex justify-between items-center print:hidden`}>
              <h3 className="text-xl font-black">عرض الفاتورة #{viewingInvoice.id}</h3>
              <button onClick={() => setViewingInvoice(null)} className="text-3xl">&times;</button>
            </div>
            
            <div className="p-8 space-y-6 print:p-10">
              <div className="flex justify-between items-start border-b pb-6">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl">🚀</div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{settings.companyName}</h2>
                    <p className="text-xs text-slate-500 font-bold">{settings.companyAddress}</p>
                    <p className="text-xs text-slate-500 font-bold">هاتف: {settings.companyPhone}</p>
                    <p className="text-xs text-emerald-600 font-black mt-1">الرقم الضريبي: {settings.taxNumber}</p>
                  </div>
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-black text-slate-900 mb-2">{viewingInvoice.type === 'SALE' ? 'فاتورة ضريبية' : viewingInvoice.type === 'PURCHASE' ? 'فاتورة مشتريات' : 'فاتورة مرتجع'}</h1>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-400 uppercase">رقم الفاتورة: <span className="text-slate-900 font-mono">{viewingInvoice.id}</span></p>
                    <p className="text-xs font-black text-slate-400 uppercase">التاريخ: <span className="text-slate-900">{viewingInvoice.date}</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{viewingInvoice.type === 'SALE' ? 'العميل' : 'المورد'}</p>
                  <p className="text-lg font-bold text-slate-900">{viewingInvoice.partnerName}</p>
                  <p className="text-xs text-slate-500">{partners.find(p => p.name === viewingInvoice.partnerName)?.phone}</p>
                  <p className="text-xs text-slate-500">{partners.find(p => p.name === viewingInvoice.partnerName)?.address}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">تفاصيل الدفع</p>
                  <p className="text-lg font-bold text-slate-900">{viewingInvoice.status === 'PAID' ? 'تم السداد (نقدي)' : 'آجل (مديونية)'}</p>
                  {viewingInvoice.staffId && (
                    <p className="text-xs text-slate-500 mt-1">المسؤول: {staff.find(s => s.id === viewingInvoice.staffId)?.name}</p>
                  )}
                </div>
              </div>

              <div className="border rounded-3xl overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-black text-slate-500">الصنف</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-500 text-center">الكمية</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-500 text-left">السعر</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-500 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                        <td className="px-4 py-3 text-center font-black">{item.quantity}</td>
                        <td className="px-4 py-3 text-left font-bold">{item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-left font-black text-slate-900">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-start pt-6 border-t gap-10">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">المجموع الفرعي:</span>
                    <span className="font-black text-slate-900">{(viewingInvoice.subtotal || viewingInvoice.amount).toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">الخصم:</span>
                    <span className="font-black text-red-600">{(viewingInvoice.discountAmount || 0).toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">الضريبة ({settings.vatPercentage}%):</span>
                    <span className="font-black text-slate-900">{(viewingInvoice.taxAmount || 0).toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-xl border-t pt-2">
                    <span className="text-slate-900 font-black">الإجمالي النهائي:</span>
                    <span className="font-black text-emerald-600">{viewingInvoice.amount.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
                
                <div className="w-32 h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-center relative group">
                  <div className="text-[8px] font-black text-slate-300 absolute top-2">E-INVOICE QR</div>
                  <div className="grid grid-cols-4 gap-1 p-2 opacity-20">
                    {Array.from({length: 16}).map((_, i) => <div key={i} className="w-4 h-4 bg-slate-900"></div>)}
                  </div>
                </div>
              </div>

              <div className="hidden print:block text-center mt-10 text-slate-300 text-[10px] font-bold border-t pt-4">
                {settings.companyName} - الرقم الضريبي: {settings.taxNumber}
                <br />
                تم استخراج هذه الفاتورة آلياً بواسطة نظام ديسترو سمارت الذكي
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                ⚠️
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">تأكيد الحذف النهائي</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من حذف الفاتورة <span className="text-red-600 font-black">#{invoiceToDelete.id}</span>؟
                <br />
                سيتم إلغاء كافة تأثيرات الفاتورة على المخزون وأرصدة الحسابات فوراً. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setInvoiceToDelete(null)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-100 transition-all"
              >
                تراجع
              </button>
              <button 
                onClick={() => {
                  handleDeleteInvoice(invoiceToDelete);
                  setInvoiceToDelete(null);
                }}
                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
