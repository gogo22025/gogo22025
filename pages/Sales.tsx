
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, Product, InvoiceItem, Partner, StaffMember, User, BillingSettings, PriceLog } from '../types';

interface SalesProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  staff: StaffMember[];
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  currentUser: User;
  settings: BillingSettings;
}

const Sales: React.FC<SalesProps> = ({ products, setProducts, transactions, setTransactions, partners, setPartners, staff, setStaff, currentUser, settings }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Transaction | null>(null);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Transaction | null>(null);
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '' });
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    customer: '',
    staffId: currentUser.role === 'SALES_REP' ? currentUser.id : '', 
    date: new Date().toISOString().split('T')[0],
    status: 'PAID' as Transaction['status'],
    items: [] as InvoiceItem[],
    discount: 0
  });

  const [currentItem, setCurrentItem] = useState({ productId: '', quantity: 1, price: 0 });

  useEffect(() => {
    if (isModalOpen) {
      if (currentUser.role === 'SALES_REP') {
        setInvoiceForm(prev => ({ ...prev, staffId: currentUser.id }));
      }
      setTimeout(() => barcodeInputRef.current?.focus(), 500);
    }
  }, [isModalOpen, currentUser]);

  const availableItems = useMemo(() => {
    const sId = invoiceForm.staffId || (currentUser.role === 'SALES_REP' ? currentUser.id : '');
    if (sId) {
      const target = staff.find(s => s.id === sId);
      return target?.currentInventory || [];
    }
    return products.map(p => ({ productId: p.id, name: p.name, quantity: p.stock }));
  }, [invoiceForm.staffId, staff, products, currentUser]);

  const filteredSales = useMemo(() => {
    return transactions.filter(t => t.type === 'SALE' && (
      currentUser.role === 'ADMIN' || t.staffId === currentUser.id
    )).filter(t => t.partnerName.includes(searchQuery) || t.id.includes(searchQuery));
  }, [transactions, currentUser, searchQuery]);

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

  const addItem = (id?: string, qty?: number, price?: number) => {
    const pid = id || currentItem.productId;
    const finalQty = qty !== undefined ? qty : currentItem.quantity;
    
    if (!pid || finalQty <= 0) return;
    
    const stock = availableItems.find(i => i.productId === pid);
    const prod = products.find(p => p.id === pid);
    
    if (!stock || stock.quantity < finalQty) {
      alert(`عذراً، الكمية غير متوفرة! المتاح هو ${stock?.quantity || 0}`);
      return;
    }

    const finalPrice = price !== undefined ? price : (currentItem.price > 0 ? currentItem.price : prod!.price);
    
    const existIdx = invoiceForm.items.findIndex(i => i.productId === pid);
    if (existIdx > -1) {
      const items = [...invoiceForm.items];
      items[existIdx].quantity += finalQty;
      items[existIdx].total = items[existIdx].quantity * items[existIdx].price;
      setInvoiceForm({...invoiceForm, items});
    } else {
      setInvoiceForm({
        ...invoiceForm, 
        items: [...invoiceForm.items, {
          productId: pid, name: prod!.name, quantity: finalQty, price: finalPrice, total: finalPrice * finalQty
        }]
      });
    }
    
    setCurrentItem({ productId: '', quantity: 1, price: 0 });
  };

  const handleCancelInvoice = (invoiceToCancel: Transaction) => {
    const invoiceId = invoiceToCancel.id;

    // 1. عكس تأثير المخزون (إعادة البضاعة)
    if (invoiceToCancel.staffId && staff.some(s => s.id === invoiceToCancel.staffId)) {
      setStaff((prev: StaffMember[]) => prev.map(s => {
        if (s.id === invoiceToCancel.staffId) {
          const newInv = [...(s.currentInventory || [])];
          (invoiceToCancel.items || []).forEach(soldItem => {
            const idx = newInv.findIndex(i => i.productId === soldItem.productId);
            if (idx > -1) newInv[idx].quantity += soldItem.quantity;
            else newInv.push({ productId: soldItem.productId, name: soldItem.name, quantity: soldItem.quantity });
          });
          return { 
            ...s, 
            currentInventory: newInv, 
            performancePoints: Math.max(0, (s.performancePoints || 0) - Math.floor(invoiceToCancel.amount / 100)),
            totalCollection: Math.max(0, (s.totalCollection || 0) - (invoiceToCancel.status === 'PAID' ? invoiceToCancel.amount : 0))
          };
        }
        return s;
      }));
    } else {
      setProducts((prev: Product[]) => prev.map(p => {
        const sold = (invoiceToCancel.items || []).find(i => i.productId === p.id);
        return sold ? { ...p, stock: p.stock + sold.quantity } : p;
      }));
    }

    // 2. عكس تأثير مديونية العميل
    setPartners((prev: Partner[]) => prev.map(p => {
      if (p.name === invoiceToCancel.partnerName) {
        return { 
          ...p, 
          balance: p.balance + (invoiceToCancel.status === 'PENDING' ? invoiceToCancel.amount : 0),
          loyaltyPoints: Math.max(0, (p.loyaltyPoints || 0) - Math.floor(invoiceToCancel.amount / 50))
        };
      }
      return p;
    }));

    // 3. حذف الفاتورة من السجل باستخدام التحديث الوظيفي
    setTransactions((prev: Transaction[]) => prev.filter(t => t.id !== invoiceId));
    alert('تم إلغاء الفاتورة وعكس كافة التأثيرات بنجاح.');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.items.length || !invoiceForm.customer) return;
    
    const subtotal = invoiceForm.items.reduce((a, b) => a + b.total, 0);
    const discountAmount = invoiceForm.discount;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * (settings.vatPercentage / 100);
    const total = taxableAmount + taxAmount;

    const newSale: Transaction = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      date: invoiceForm.date,
      timestamp: Date.now(),
      type: 'SALE',
      partnerName: invoiceForm.customer,
      staffId: invoiceForm.staffId || currentUser.id,
      amount: total,
      subtotal: subtotal,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      status: invoiceForm.status,
      items: invoiceForm.items,
      qrCodeData: `Company:${settings.companyName}|TaxID:${settings.taxNumber}|Total:${total.toFixed(2)}|Tax:${taxAmount.toFixed(2)}`
    };
    
    setStaff((prev: StaffMember[]) => prev.map(s => {
      if (s.id === newSale.staffId) {
        const newInv = (s.currentInventory || []).map(item => {
          const sold = invoiceForm.items.find(i => i.productId === item.productId);
          return sold ? { ...item, quantity: item.quantity - sold.quantity } : item;
        });
        return { 
          ...s, 
          currentInventory: newInv, 
          performancePoints: (s.performancePoints || 0) + Math.floor(total / 100), 
          totalCollection: (s.totalCollection || 0) + (invoiceForm.status === 'PAID' ? total : 0) 
        };
      }
      return s;
    }));

    setPartners((prev: Partner[]) => prev.map(p => {
      if (p.name === invoiceForm.customer) {
        return { 
          ...p, 
          balance: p.balance - (invoiceForm.status === 'PENDING' ? total : 0), 
          loyaltyPoints: (p.loyaltyPoints || 0) + Math.floor(total / 50) 
        };
      }
      return p;
    }));

    setTransactions((prev: Transaction[]) => [newSale, ...prev]);
    setIsModalOpen(false);
    setInvoiceForm({ customer: '', staffId: currentUser.id, date: new Date().toISOString().split('T')[0], status: 'PAID', items: [] });
  };

  const handleReturnInvoice = (invoice: Transaction) => {
    if (!window.confirm('هل أنت متأكد من عمل مرتجع لهذه الفاتورة؟ سيتم إعادة البضاعة للمخزن وتعديل رصيد العميل.')) return;

    const returnTx: Transaction = {
      id: `RET-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      type: 'RETURN',
      partnerName: invoice.partnerName,
      staffId: currentUser.id,
      amount: invoice.amount,
      subtotal: invoice.subtotal || invoice.amount,
      taxAmount: invoice.taxAmount || 0,
      discountAmount: invoice.discountAmount || 0,
      status: 'PAID',
      items: invoice.items,
      notes: `مرتجع مبيعات للفاتورة رقم ${invoice.id}`
    };

    // 1. إعادة البضاعة
    if (invoice.staffId && staff.some(s => s.id === invoice.staffId)) {
      setStaff((prev: StaffMember[]) => prev.map(s => {
        if (s.id === invoice.staffId) {
          const newInv = [...(s.currentInventory || [])];
          invoice.items.forEach(item => {
            const idx = newInv.findIndex(i => i.productId === item.productId);
            if (idx > -1) newInv[idx].quantity += item.quantity;
            else newInv.push({ productId: item.productId, name: item.name, quantity: item.quantity });
          });
          return { ...s, currentInventory: newInv };
        }
        return s;
      }));
    } else {
      setProducts((prev: Product[]) => prev.map(p => {
        const item = invoice.items.find(i => i.productId === p.id);
        return item ? { ...p, stock: p.stock + item.quantity } : p;
      }));
    }

    // 2. تعديل رصيد العميل
    setPartners((prev: Partner[]) => prev.map(p => {
      if (p.name === invoice.partnerName) {
        return { ...p, balance: p.balance + (invoice.status === 'PENDING' ? invoice.amount : 0) };
      }
      return p;
    }));

    setTransactions((prev: Transaction[]) => [returnTx, ...prev]);
    setViewingInvoice(null);
    alert('تم تسجيل مرتجع المبيعات بنجاح ✅');
  };

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name) return;
    
    const newCustomer: Partner = {
      id: `p-q-${Date.now()}`,
      name: quickCustomer.name,
      type: 'CUSTOMER',
      phone: quickCustomer.phone,
      address: '',
      balance: 0,
      loyaltyPoints: 0
    };
    
    setPartners(prev => [...prev, newCustomer]);
    setInvoiceForm(prev => ({ ...prev, customer: newCustomer.name }));
    setIsQuickAddCustomerOpen(false);
    setQuickCustomer({ name: '', phone: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="relative flex-1 w-full">
            <input 
              type="text" 
              placeholder="بحث في المبيعات..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-10 py-3 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute left-3 top-3.5 opacity-30">🔍</span>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all w-full md:w-auto">
           ➕ فاتورة بيع جديدة
         </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400">الفاتورة</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">العميل</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">بواسطة</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">المبلغ</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">الحالة</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredSales.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-emerald-600">{s.id}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{s.partnerName}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{staff.find(st => st.id === s.staffId)?.name || '---'}</td>
                <td className="px-6 py-4 font-black">{s.amount.toLocaleString()} ج.م</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${s.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {s.status === 'PAID' ? 'نقدي' : 'آجل'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setViewingInvoice(s)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors text-lg"
                      title="عرض وطباعة الفاتورة"
                    >
                      👁️
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button 
                        onClick={() => setInvoiceToCancel(s)}
                        className="text-red-300 hover:text-red-600 transition-colors text-lg"
                        title="إلغاء وحذف الفاتورة"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">إصدار فاتورة بيع</h3>
                <p className="text-xs text-emerald-400 font-bold">المسؤول: {currentUser.name}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-3xl text-slate-500 hover:text-white">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100">
                 <input 
                   ref={barcodeInputRef}
                   type="text" 
                   placeholder="امسح باركود الصنف من عهدتك..." 
                   className="w-full bg-white border-none rounded-2xl px-6 py-4 font-mono font-bold shadow-sm focus:ring-2 focus:ring-emerald-500"
                   value={barcodeInput}
                   onChange={e => setBarcodeInput(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       const p = products.find(prod => prod.barcode === barcodeInput);
                       if (p) {
                         setCurrentItem({
                           productId: p.id,
                           quantity: 1,
                           price: p.price
                         });
                         setBarcodeInput('');
                         setTimeout(() => quantityInputRef.current?.focus(), 100);
                       } else {
                         alert('الصنف غير موجود!');
                       }
                     }
                   }}
                 />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">المندوب المسؤول</label>
                  <input readOnly value={currentUser.name} className="w-full px-5 py-3 bg-gray-50 border rounded-2xl font-bold text-slate-500 cursor-not-allowed text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">العميل</label>
                  <div className="flex gap-2">
                    <select required className="flex-1 px-5 py-3 bg-gray-50 border rounded-2xl font-bold text-xs" value={invoiceForm.customer} onChange={e => setInvoiceForm({...invoiceForm, customer: e.target.value})}>
                      <option value="">-- اختر عميل --</option>
                      {partners.filter(p => p.type === 'CUSTOMER').map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setIsQuickAddCustomerOpen(!isQuickAddCustomerOpen)}
                      className="bg-slate-100 text-slate-600 px-3 rounded-2xl font-black hover:bg-emerald-100 hover:text-emerald-600 transition-all text-xs"
                      title="إضافة عميل سريع"
                    >
                      {isQuickAddCustomerOpen ? '✕' : '＋'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">طريقة الدفع</label>
                  <select 
                    className="w-full px-5 py-3 bg-gray-50 border rounded-2xl font-bold text-xs" 
                    value={invoiceForm.status} 
                    onChange={e => setInvoiceForm({...invoiceForm, status: e.target.value as any})}
                  >
                    <option value="PAID">💵 كاش (نقدي)</option>
                    <option value="PENDING">💳 آجل (مديونية)</option>
                  </select>
                </div>
              </div>

              {isQuickAddCustomerOpen && (
                <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 animate-in slide-in-from-top duration-200">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-3 tracking-widest">إضافة عميل جديد سريعاً</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="اسم العميل..." 
                      className="px-4 py-2 rounded-xl border-none text-sm font-bold shadow-sm"
                      value={quickCustomer.name}
                      onChange={e => setQuickCustomer({...quickCustomer, name: e.target.value})}
                    />
                    <input 
                      type="tel" 
                      placeholder="رقم الهاتف..." 
                      className="px-4 py-2 rounded-xl border-none text-sm font-bold shadow-sm"
                      value={quickCustomer.phone}
                      onChange={e => setQuickCustomer({...quickCustomer, phone: e.target.value})}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleQuickAddCustomer}
                    className="w-full mt-3 bg-emerald-600 text-white py-2 rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 transition-all"
                  >
                    حفظ العميل واختياره
                  </button>
                </div>
              )}

              <div className="bg-indigo-50 p-5 rounded-3xl space-y-4">
                <div className="flex gap-2">
                  <select 
                    className="flex-1 px-4 py-3 rounded-2xl border-none font-bold text-sm" 
                    value={currentItem.productId} 
                    onChange={e => {
                      const pid = e.target.value;
                      const prod = products.find(p => p.id === pid);
                      setCurrentItem({...currentItem, productId: pid, price: prod?.price || 0});
                    }}
                  >
                    <option value="">-- اختر من عهدتك --</option>
                    {availableItems.map(i => <option key={i.productId} value={i.productId}>{i.name} (المتاح: {i.quantity})</option>)}
                  </select>
                  <input 
                    ref={quantityInputRef}
                    type="number" 
                    placeholder="كمية" 
                    className="w-20 px-4 py-3 rounded-2xl border-none font-black text-center" 
                    value={currentItem.quantity} 
                    onChange={e => setCurrentItem({...currentItem, quantity: Number(e.target.value)})} 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem();
                        barcodeInputRef.current?.focus();
                      }
                    }}
                  />
                  <input type="number" placeholder="سعر" className="w-24 px-4 py-3 rounded-2xl border-none font-black text-center" value={currentItem.price || ''} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} />
                  <button type="button" onClick={() => addItem()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black">أضف</button>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto border rounded-3xl bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-4">الصنف</th>
                      <th className="p-4 text-center">الكمية</th>
                      <th className="p-4 text-center">السعر</th>
                      <th className="p-4 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoiceForm.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-4 font-bold">{it.name}</td>
                        <td className="p-4 text-center">
                          <input 
                            type="number" 
                            className="w-16 px-2 py-1 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded text-center font-black outline-none transition-all"
                            value={it.quantity}
                            onChange={(e) => {
                              const newQty = Number(e.target.value);
                              const newItems = [...invoiceForm.items];
                              newItems[idx].quantity = newQty;
                              newItems[idx].total = newQty * newItems[idx].price;
                              setInvoiceForm({ ...invoiceForm, items: newItems });
                            }}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded text-center font-black outline-none transition-all"
                            defaultValue={it.price}
                            onBlur={(e) => {
                              const newPrice = Number(e.target.value);
                              if (newPrice !== it.price) {
                                // Update invoice item
                                const newItems = [...invoiceForm.items];
                                newItems[idx].price = newPrice;
                                newItems[idx].total = newItems[idx].quantity * newPrice;
                                setInvoiceForm({ ...invoiceForm, items: newItems });

                                // Update product price and log it
                                setProducts((prev: Product[]) => prev.map(p => 
                                  p.id === it.productId ? logPriceChange(p, newPrice, 'SALE') : p
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
                        <td className="p-4 text-left font-black text-indigo-600">{it.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t gap-6">
                <div className="flex-1 grid grid-cols-3 gap-4 text-right">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">المجموع</p>
                      <p className="text-lg font-bold text-slate-900">{invoiceForm.items.reduce((a,b)=>a+b.total,0).toLocaleString()} <span className="text-[10px]">{settings.currency}</span></p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">الخصم</p>
                      <input 
                        type="number" 
                        className="w-20 px-2 py-1 bg-gray-50 border rounded-lg font-bold text-sm" 
                        value={invoiceForm.discount} 
                        onChange={e => setInvoiceForm({...invoiceForm, discount: Number(e.target.value)})} 
                      />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">الضريبة ({settings.vatPercentage}%)</p>
                      <p className="text-lg font-bold text-slate-900">
                        {(Math.max(0, invoiceForm.items.reduce((a,b)=>a+b.total,0) - invoiceForm.discount) * (settings.vatPercentage / 100)).toLocaleString()} <span className="text-[10px]">{settings.currency}</span>
                      </p>
                   </div>
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase">الإجمالي النهائي</p>
                   <p className="text-3xl font-black text-emerald-600">
                     {(Math.max(0, invoiceForm.items.reduce((a,b)=>a+b.total,0) - invoiceForm.discount) * (1 + settings.vatPercentage / 100)).toLocaleString()} <span className="text-xs font-normal">{settings.currency}</span>
                   </p>
                </div>
                <button type="submit" className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all active:scale-95">حفظ وتأكيد العملية</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden print:shadow-none print:rounded-none">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center print:hidden">
              <h3 className="text-xl font-black">تفاصيل الفاتورة</h3>
              <button onClick={() => setViewingInvoice(null)} className="text-3xl text-slate-500 hover:text-white">&times;</button>
            </div>
            
            <div className="p-8 space-y-6 print:p-10">
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">فاتورة مبيعات</h2>
                  <p className="text-emerald-600 font-bold mt-1">ديسترو سمارت 🚀</p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-400 uppercase">رقم الفاتورة</p>
                  <p className="text-xl font-mono font-bold text-slate-900">{viewingInvoice.id}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">{viewingInvoice.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">العميل</p>
                  <p className="text-lg font-bold text-slate-900">{viewingInvoice.partnerName}</p>
                  <p className="text-xs text-slate-500">{partners.find(p => p.name === viewingInvoice.partnerName)?.phone}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المسؤول</p>
                  <p className="text-lg font-bold text-slate-900">{staff.find(s => s.id === viewingInvoice.staffId)?.name || '---'}</p>
                  <p className="text-xs text-slate-500">{viewingInvoice.status === 'PAID' ? 'الدفع: نقدي' : 'الدفع: آجل'}</p>
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
                        <td className="px-4 py-3 text-left font-black text-emerald-600">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <div className="print:hidden flex gap-2">
                  <button 
                    onClick={() => window.print()} 
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all"
                  >
                    <span>🖨️</span> طباعة
                  </button>
                  {viewingInvoice.type === 'SALE' && (
                    <button 
                      onClick={() => handleReturnInvoice(viewingInvoice)} 
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
      {invoiceToCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                ⚠️
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">تأكيد إلغاء الفاتورة</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من إلغاء الفاتورة <span className="text-red-600 font-black">#{invoiceToCancel.id}</span>؟
                <br />
                سيتم إعادة البضاعة للمخزن وتعديل الأرصدة فوراً. هذا الإجراء نهائي.
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setInvoiceToCancel(null)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-100 transition-all"
              >
                تراجع
              </button>
              <button 
                onClick={() => {
                  handleCancelInvoice(invoiceToCancel);
                  setInvoiceToCancel(null);
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

export default Sales;
