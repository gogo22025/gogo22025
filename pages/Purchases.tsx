
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, Partner, Product, InvoiceItem, User, BillingSettings, PriceLog } from '../types';

interface PurchasesProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currentUser: User;
  settings: BillingSettings;
}

const Purchases: React.FC<PurchasesProps> = ({ transactions, setTransactions, partners, setPartners, products, setProducts, currentUser, settings }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Transaction | null>(null);
  const [purchaseToCancel, setPurchaseToCancel] = useState<Transaction | null>(null);
  const [isQuickAddSupplierOpen, setIsQuickAddSupplierOpen] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState({ name: '', phone: '' });
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [purchaseForm, setPurchaseForm] = useState({
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PAID' as Transaction['status'],
    items: [] as InvoiceItem[],
    discount: 0
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    quantity: 1,
    buyPrice: 0
  });

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return transactions.filter(t => 
      t.type === 'PURCHASE' && (
        t.partnerName.includes(q) || 
        t.id.toLowerCase().includes(q)
      )
    );
  }, [transactions, searchQuery]);

  const handleCancelPurchase = (purchaseToCancel: Transaction) => {
    const id = purchaseToCancel.id;

    // 1. خصم البضاعة من المخزن
    setProducts((prev: Product[]) => prev.map(p => {
      const bought = (purchaseToCancel.items || []).find(i => i.productId === p.id);
      return bought ? { ...p, stock: Math.max(0, p.stock - bought.quantity) } : p;
    }));

    // 2. تعديل رصيد المورد
    setPartners((prev: Partner[]) => prev.map(p => {
      if (p.name === purchaseToCancel.partnerName) {
        return { ...p, balance: p.balance - (purchaseToCancel.status === 'PENDING' ? purchaseToCancel.amount : 0) };
      }
      return p;
    }));

    // 3. الحذف من السجل
    setTransactions((prev: Transaction[]) => prev.filter(t => t.id !== id));
    alert('تم إلغاء فاتورة الشراء وتحديث الأرصدة بنجاح.');
  };

  const logPriceChange = (product: Product, newPrice: number, source: 'INVENTORY' | 'SALE' | 'PURCHASE') => {
    if (product.price === newPrice) return product;
    
    const log: PriceLog = {
      oldPrice: product.price,
      newPrice: newPrice,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      source
    };
    
    return {
      ...product,
      price: newPrice,
      priceHistory: [log, ...(product.priceHistory || [])]
    };
  };

  const addItemToPurchase = (prodId?: string, qty?: number, price?: number) => {
    const id = prodId || currentItem.productId;
    const finalQty = qty !== undefined ? qty : currentItem.quantity;
    
    if (!id || finalQty <= 0) return;
    
    const product = products.find(p => p.id === id);
    if (!product) return;

    const finalPrice = price !== undefined ? price : (currentItem.buyPrice > 0 ? currentItem.buyPrice : product.price);
    
    const existingIdx = purchaseForm.items.findIndex(item => item.productId === id);
    if (existingIdx > -1) {
      const updatedItems = [...purchaseForm.items];
      updatedItems[existingIdx].quantity += finalQty;
      updatedItems[existingIdx].total = updatedItems[existingIdx].quantity * updatedItems[existingIdx].price;
      setPurchaseForm({ ...purchaseForm, items: updatedItems });
    } else {
      setPurchaseForm({ 
        ...purchaseForm, 
        items: [...purchaseForm.items, { 
          productId: product.id, 
          name: product.name, 
          quantity: finalQty, 
          price: finalPrice, 
          total: finalPrice * finalQty 
        }] 
      });
    }
    
    // إعادة تعيين حقول الإدخال
    setCurrentItem({ productId: '', quantity: 1, buyPrice: 0 });
    barcodeInputRef.current?.focus();
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseForm.items.length === 0) return;
    
    const subtotal = purchaseForm.items.reduce((acc, item) => acc + item.total, 0);
    const discountAmount = purchaseForm.discount;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * (settings.vatPercentage / 100);
    const total = taxableAmount + taxAmount;

    const newPurchase: Transaction = {
      id: `PO-${Math.floor(Math.random() * 9000) + 1000}`,
      date: purchaseForm.date,
      timestamp: Date.now(),
      type: 'PURCHASE',
      partnerName: purchaseForm.supplier,
      amount: total,
      subtotal: subtotal,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      status: purchaseForm.status,
      items: purchaseForm.items
    };
    
    setProducts((prev: Product[]) => prev.map(p => {
      const boughtItem = purchaseForm.items.find(item => item.productId === p.id);
      return boughtItem ? { ...p, stock: p.stock + boughtItem.quantity } : p;
    }));

    if (purchaseForm.status === 'PENDING') {
      setPartners((prev: Partner[]) => prev.map(p => {
        if (p.name === purchaseForm.supplier) return { ...p, balance: p.balance + total };
        return p;
      }));
    }
    
    setTransactions((prev: Transaction[]) => [newPurchase, ...prev]);
    setIsModalOpen(false);
    setPurchaseForm({ supplier: '', date: new Date().toISOString().split('T')[0], status: 'PAID', items: [] });
  };

  const handleReturnPurchase = (invoice: Transaction) => {
    if (!window.confirm('هل أنت متأكد من عمل مرتجع لهذه المشتريات؟ سيتم خصم البضاعة من المخزن وتعديل رصيد المورد.')) return;

    const returnTx: Transaction = {
      id: `RET-P-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      type: 'RETURN',
      partnerName: invoice.partnerName,
      amount: invoice.amount,
      subtotal: invoice.subtotal || invoice.amount,
      taxAmount: invoice.taxAmount || 0,
      discountAmount: invoice.discountAmount || 0,
      status: 'PAID',
      items: invoice.items,
      notes: `مرتجع مشتريات للفاتورة رقم ${invoice.id}`
    };

    // 1. خصم البضاعة من المخزن
    setProducts((prev: Product[]) => prev.map(p => {
      const item = invoice.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
    }));

    // 2. تعديل رصيد المورد
    setPartners((prev: Partner[]) => prev.map(p => {
      if (p.name === invoice.partnerName) {
        return { ...p, balance: p.balance - (invoice.status === 'PENDING' ? invoice.amount : 0) };
      }
      return p;
    }));

    setTransactions((prev: Transaction[]) => [returnTx, ...prev]);
    setViewingInvoice(null);
    alert('تم تسجيل مرتجع المشتريات بنجاح ✅');
  };

  const handleQuickAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplier.name) return;
    
    const newSupplier: Partner = {
      id: `p-q-s-${Date.now()}`,
      name: quickSupplier.name,
      type: 'SUPPLIER',
      phone: quickSupplier.phone,
      address: '',
      balance: 0,
      loyaltyPoints: 0
    };
    
    setPartners(prev => [...prev, newSupplier]);
    setPurchaseForm(prev => ({ ...prev, supplier: newSupplier.name }));
    setIsQuickAddSupplierOpen(false);
    setQuickSupplier({ name: '', phone: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="بحث في المشتريات..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-10 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="absolute left-3 top-3.5 opacity-30">🔍</span>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 shadow-lg"
        >
          ➕ تسجيل فاتورة شراء
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500">الرقم</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500">المورد</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500">القيمة</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500">الحالة</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPurchases.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{p.id}</td>
                <td className="px-6 py-4 font-bold text-gray-800">{p.partnerName}</td>
                <td className="px-6 py-4 font-bold text-gray-900">{p.amount.toLocaleString()} ج.م</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status === 'PAID' ? 'كاش' : 'آجل'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setViewingInvoice(p)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors text-lg"
                      title="عرض الفاتورة"
                    >
                      👁️
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button 
                        onClick={() => setPurchaseToCancel(p)}
                        className="text-red-300 hover:text-red-600 text-lg"
                        title="حذف فاتورة شراء"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">تسجيل فاتورة مشتريات</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSavePurchase} className="p-8 space-y-6">
              <div className="bg-indigo-50 p-4 rounded-3xl">
                 <input 
                   ref={barcodeInputRef}
                   type="text" 
                   placeholder="امسح باركود استلام البضاعة..." 
                   className="w-full bg-white border-none rounded-2xl px-6 py-4 font-mono font-bold shadow-sm"
                   value={barcodeInput}
                   onChange={e => setBarcodeInput(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       const prod = products.find(p => p.barcode === barcodeInput);
                       if (prod) addItemToPurchase(prod.id, 1, prod.price);
                       setBarcodeInput('');
                     }
                   }}
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <select required className="flex-1 px-4 py-3 bg-gray-50 border rounded-2xl font-bold" value={purchaseForm.supplier} onChange={e => setPurchaseForm({...purchaseForm, supplier: e.target.value})}>
                    <option value="">-- المورد --</option>
                    {partners.filter(p => p.type === 'SUPPLIER').map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setIsQuickAddSupplierOpen(!isQuickAddSupplierOpen)}
                    className="bg-indigo-50 text-indigo-600 px-4 rounded-2xl font-black hover:bg-indigo-100 transition-all"
                    title="إضافة مورد سريع"
                  >
                    {isQuickAddSupplierOpen ? '✕' : '＋'}
                  </button>
                </div>
                <select className="w-full px-4 py-3 bg-gray-50 border rounded-2xl font-bold" value={purchaseForm.status} onChange={e => setPurchaseForm({...purchaseForm, status: e.target.value as any})}>
                  <option value="PAID">💵 كاش</option>
                  <option value="PENDING">💳 آجل</option>
                </select>
              </div>

              {isQuickAddSupplierOpen && (
                <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 animate-in slide-in-from-top duration-200">
                  <p className="text-[10px] font-black text-indigo-600 uppercase mb-3 tracking-widest">إضافة مورد جديد سريعاً</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="اسم المورد..." 
                      className="px-4 py-2 rounded-xl border-none text-sm font-bold shadow-sm"
                      value={quickSupplier.name}
                      onChange={e => setQuickSupplier({...quickSupplier, name: e.target.value})}
                    />
                    <input 
                      type="tel" 
                      placeholder="رقم الهاتف..." 
                      className="px-4 py-2 rounded-xl border-none text-sm font-bold shadow-sm"
                      value={quickSupplier.phone}
                      onChange={e => setQuickSupplier({...quickSupplier, phone: e.target.value})}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleQuickAddSupplier}
                    className="w-full mt-3 bg-indigo-600 text-white py-2 rounded-xl text-xs font-black shadow-md hover:bg-indigo-700 transition-all"
                  >
                    حفظ المورد واختياره
                  </button>
                </div>
              )}
              <div className="bg-slate-50 p-5 rounded-3xl space-y-3">
                 <div className="flex gap-2">
                    <select 
                      className="flex-1 px-4 py-2 rounded-xl border-none font-bold text-sm" 
                      value={currentItem.productId} 
                      onChange={e => {
                        const pid = e.target.value;
                        const prod = products.find(p => p.id === pid);
                        setCurrentItem({...currentItem, productId: pid, buyPrice: prod?.price || 0});
                      }}
                    >
                       <option value="">-- اختر صنف --</option>
                       {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" className="w-20 px-4 py-2 rounded-xl text-center font-bold" placeholder="كمية" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: Number(e.target.value)})} />
                    <input type="number" className="w-24 px-4 py-2 rounded-xl text-center font-bold" placeholder="سعر الشراء" value={currentItem.buyPrice || ''} onChange={e => setCurrentItem({...currentItem, buyPrice: Number(e.target.value)})} />
                    <button type="button" onClick={() => addItemToPurchase()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold">+</button>
                 </div>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3">الصنف</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">السعر</th>
                      <th className="p-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseForm.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-bold">{it.name}</td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" 
                            className="w-16 px-2 py-1 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded text-center font-bold outline-none transition-all"
                            value={it.quantity}
                            onChange={(e) => {
                              const newQty = Number(e.target.value);
                              const newItems = [...purchaseForm.items];
                              newItems[idx].quantity = newQty;
                              newItems[idx].total = newQty * newItems[idx].price;
                              setPurchaseForm({ ...purchaseForm, items: newItems });
                            }}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded text-center font-bold outline-none transition-all"
                            defaultValue={it.price}
                            onBlur={(e) => {
                              const newPrice = Number(e.target.value);
                              if (newPrice !== it.price) {
                                // Update invoice item
                                const newItems = [...purchaseForm.items];
                                newItems[idx].price = newPrice;
                                newItems[idx].total = newItems[idx].quantity * newPrice;
                                setPurchaseForm({ ...purchaseForm, items: newItems });

                                // Update product price and log it
                                setProducts((prev: Product[]) => prev.map(p => 
                                  p.id === it.productId ? logPriceChange(p, newPrice, 'PURCHASE') : p
                                ));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 text-left font-bold text-indigo-600">{it.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-4 border-t gap-6">
                <div className="flex-1 grid grid-cols-3 gap-4 text-right">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">المجموع</p>
                      <p className="text-lg font-bold text-slate-900">{purchaseForm.items.reduce((a,b)=>a+b.total,0).toLocaleString()} <span className="text-[10px]">{settings.currency}</span></p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">الخصم</p>
                      <input 
                        type="number" 
                        className="w-20 px-2 py-1 bg-gray-50 border rounded-lg font-bold text-sm" 
                        value={purchaseForm.discount} 
                        onChange={e => setPurchaseForm({...purchaseForm, discount: Number(e.target.value)})} 
                      />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">الضريبة ({settings.vatPercentage}%)</p>
                      <p className="text-lg font-bold text-slate-900">
                        {(Math.max(0, purchaseForm.items.reduce((a,b)=>a+b.total,0) - purchaseForm.discount) * (settings.vatPercentage / 100)).toLocaleString()} <span className="text-[10px]">{settings.currency}</span>
                      </p>
                   </div>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase">الإجمالي النهائي</p>
                  <p className="text-3xl font-black text-indigo-600">
                    {(Math.max(0, purchaseForm.items.reduce((a,b)=>a+b.total,0) - purchaseForm.discount) * (1 + settings.vatPercentage / 100)).toLocaleString()} <span className="text-sm font-normal">{settings.currency}</span>
                  </p>
                </div>
                <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl">حفظ الفاتورة</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden print:shadow-none print:rounded-none">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center print:hidden">
              <h3 className="text-xl font-black">تفاصيل فاتورة الشراء</h3>
              <button onClick={() => setViewingInvoice(null)} className="text-3xl">&times;</button>
            </div>
            
            <div className="p-8 space-y-6 print:p-10">
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">فاتورة مشتريات</h2>
                  <p className="text-indigo-600 font-bold mt-1">ديسترو سمارت 🚀</p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-400 uppercase">رقم الفاتورة</p>
                  <p className="text-xl font-mono font-bold text-slate-900">{viewingInvoice.id}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">{viewingInvoice.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المورد</p>
                  <p className="text-lg font-bold text-slate-900">{viewingInvoice.partnerName}</p>
                  <p className="text-xs text-slate-500">{partners.find(p => p.name === viewingInvoice.partnerName)?.phone}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الحالة</p>
                  <p className="text-lg font-bold text-slate-900">{viewingInvoice.status === 'PAID' ? 'تم السداد' : 'آجل (مديونية)'}</p>
                </div>
              </div>

              <div className="border rounded-3xl overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-black text-slate-400">الصنف</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 text-center">الكمية</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 text-left">السعر</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                        <td className="px-4 py-3 text-center font-black">{item.quantity}</td>
                        <td className="px-4 py-3 text-left font-bold">{item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-left font-black text-indigo-600">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <div className="print:hidden flex gap-2">
                  <button 
                    onClick={() => window.print()} 
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all"
                  >
                    <span>🖨️</span> طباعة
                  </button>
                  {viewingInvoice.type === 'PURCHASE' && (
                    <button 
                      onClick={() => handleReturnPurchase(viewingInvoice)} 
                      className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black hover:bg-red-100 transition-all"
                    >
                      🔄 عمل مرتجع
                    </button>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي الفاتورة</p>
                  <p className="text-4xl font-black text-slate-900">{viewingInvoice.amount.toLocaleString()} <span className="text-sm font-normal">ج.م</span></p>
                </div>
              </div>

              <div className="hidden print:block text-center mt-20 text-slate-300 text-[10px] font-bold">
                تم استخراج هذه الفاتورة آلياً بواسطة نظام ديسترو سمارت الذكي
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {purchaseToCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                ⚠️
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">تأكيد إلغاء المشتريات</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من إلغاء فاتورة الشراء <span className="text-red-600 font-black">#{purchaseToCancel.id}</span>؟
                <br />
                سيتم خصم البضاعة من المخزن وتعديل رصيد المورد فوراً. هذا الإجراء نهائي.
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setPurchaseToCancel(null)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-100 transition-all"
              >
                تراجع
              </button>
              <button 
                onClick={() => {
                  handleCancelPurchase(purchaseToCancel);
                  setPurchaseToCancel(null);
                }}
                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
