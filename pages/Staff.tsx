
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StaffMember, Product, AppView, UserRole, Transaction, User } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

interface StaffProps {
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const Staff: React.FC<StaffProps> = ({ staffList, setStaffList, products, setProducts, transactions, setTransactions }) => {
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DISPATCH' | 'RECONCILE'>('LIST');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; staffId: string; staffName: string }>({
    isOpen: false,
    staffId: '',
    staffName: ''
  });

  const selectedRep = useMemo(() => staffList.find(s => s.id === selectedRepId), [staffList, selectedRepId]);

  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  const [staffForm, setStaffForm] = useState<Partial<StaffMember>>({
    name: '',
    username: '',
    password: '',
    role: 'SALES_REP',
    phone: '',
    permissions: [AppView.SALES]
  });

  const [dispatchForm, setDispatchForm] = useState({
    productId: '',
    quantity: 0
  });

  useEffect(() => {
    if (activeTab === 'DISPATCH') {
      const timer = setTimeout(() => barcodeRef.current?.focus(), 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const togglePermission = (view: AppView) => {
    const current = staffForm.permissions || [];
    if (current.includes(view)) {
      setStaffForm({ ...staffForm, permissions: current.filter(v => v !== view) });
    } else {
      setStaffForm({ ...staffForm, permissions: [...current, view] });
    }
  };

  const handleDeleteStaff = (id: string, name: string, collection: number, invCount: number) => {
    if (invCount > 0 || collection > 0) {
      alert(`عذراً، لا يمكن حذف "${name}" لوجود عهدة متبقية (${invCount}) أو تحصيل غير مورد (${collection} ج.م). يجب إجراء تصفية جرد أولاً.`);
      return;
    }

    setDeleteConfirmation({ isOpen: true, staffId: id, staffName: name });
  };

  const confirmDeleteStaff = () => {
    const { staffId } = deleteConfirmation;
    setStaffList((prev: StaffMember[]) => prev.filter(s => s.id !== staffId));
    setDeleteConfirmation({ isOpen: false, staffId: '', staffName: '' });
    alert('تم حذف الموظف بنجاح ✅');
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      setStaffList((prev: StaffMember[]) => prev.map(s => s.id === editingStaff.id ? { ...s, ...staffForm } as StaffMember : s));
    } else {
      const newStaff: StaffMember = {
        ...(staffForm as StaffMember),
        id: Math.random().toString(36).substr(2, 9),
        status: 'ACTIVE',
        currentInventory: [],
        totalCollection: 0,
        performancePoints: 0
      };
      setStaffList((prev: StaffMember[]) => [...prev, newStaff]);
    }
    setIsManageModalOpen(false);
    setEditingStaff(null);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setStaffForm({
      name: staff.name,
      username: staff.username,
      password: staff.password,
      role: staff.role,
      phone: staff.phone,
      permissions: staff.permissions
    });
    setIsManageModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'مدير نظام';
      case 'SALES_REP': return 'مندوب مبيعات';
      case 'DELIVERY': return 'سائق توصيل';
      case 'WAREHOUSE': return 'أمين مخزن';
      default: return role;
    }
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.barcode === barcodeScanInput.trim());
    if (product) {
      if (product.stock <= 0) {
        alert('هذا الصنف نفد من المخزن الرئيسي!');
        setBarcodeScanInput('');
        return;
      }
      setDispatchForm({ ...dispatchForm, productId: product.id });
      setBarcodeScanInput('');
      setTimeout(() => quantityRef.current?.focus(), 100);
    } else {
      alert('الباركود غير موجود في المخزن!');
      setBarcodeScanInput('');
    }
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep || !dispatchForm.productId) return;
    
    const product = products.find(p => p.id === dispatchForm.productId);
    if (!product || product.stock < dispatchForm.quantity) {
      alert('الكمية المطلوبة غير متوفرة بالمخزن الرئيسي!');
      return;
    }

    setProducts(products.map(p => 
      p.id === dispatchForm.productId ? { ...p, stock: p.stock - dispatchForm.quantity } : p
    ));

    setStaffList((prev: StaffMember[]) => prev.map(s => {
      if (s.id === selectedRep.id) {
        const existingInv = s.currentInventory || [];
        const itemIdx = existingInv.findIndex(i => i.productId === dispatchForm.productId);
        let newInv;
        if (itemIdx > -1) {
          newInv = [...existingInv];
          newInv[itemIdx].quantity += dispatchForm.quantity;
        } else {
          newInv = [...existingInv, { productId: dispatchForm.productId, name: product.name, quantity: dispatchForm.quantity }];
        }
        return { ...s, currentInventory: newInv, status: 'BUSY' as any };
      }
      return s;
    }));

    setActiveTab('LIST');
    setDispatchForm({ productId: '', quantity: 0 });
    alert(`تم خصم الكمية من المخزن وإصدار إذن صرف لـ ${selectedRep.name}`);
  };

  const handleFullReconcile = () => {
    if (!selectedRep) return;
    if (collectedAmount <= 0 && selectedRep.totalCollection > 0) {
      if (!window.confirm('المبلغ المحصل 0 رغم وجود مبيعات متوقعة. هل تريد المتابعة؟')) return;
    }
    const newTx: Transaction = {
      id: `COLL-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      type: 'INCOME',
      partnerName: `توريد مندوب: ${selectedRep.name}`,
      amount: collectedAmount,
      subtotal: collectedAmount,
      taxAmount: 0,
      discountAmount: 0,
      status: 'PAID',
      items: [],
      notes: `تصفية مبيعات يومية - المبلغ المتوقع كان ${selectedRep.totalCollection}`
    };
    setTransactions([newTx, ...transactions]);
    setStaffList((prev: StaffMember[]) => prev.map(s => {
      if (s.id === selectedRep.id) {
        return { 
          ...s, 
          totalCollection: 0, 
          status: 'ACTIVE',
          performancePoints: s.performancePoints + 10
        };
      }
      return s;
    }));
    alert(`تم توريد مبلغ ${collectedAmount.toLocaleString()} ج.م للخزنة بنجاح وتصفية عهدة المندوب.`);
    setActiveTab('LIST');
    setSelectedRepId(null);
    setCollectedAmount(0);
  };

  const handleReturnUnsoldToWarehouse = () => {
    if (!selectedRep || !selectedRep.currentInventory?.length) {
      alert('لا توجد بضاعة في عهدة المندوب لإرجاعها.');
      return;
    }
    
    if (!window.confirm(`هل أنت متأكد من إرجاع كافة بضاعة العهدة المتبقية (${selectedRep.currentInventory.length} صنف) إلى المخزن الرئيسي؟`)) return;

    const inventoryToReturn = [...selectedRep.currentInventory];

    // 1. تحديث المخزن الرئيسي
    setProducts((prev: Product[]) => prev.map(p => {
      const repItem = inventoryToReturn.find(i => i.productId === p.id);
      return repItem ? { ...p, stock: p.stock + repItem.quantity } : p;
    }));

    // 2. تصفية عهدة المندوب
    setStaffList((prev: StaffMember[]) => prev.map(s => {
      if (s.id === selectedRep.id) {
        return { ...s, currentInventory: [], status: 'ACTIVE' };
      }
      return s;
    }));

    // 3. تسجيل حركة في السجل (اختياري للتوثيق)
    const returnTx: Transaction = {
      id: `RET-W-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      type: 'RETURN',
      partnerName: `إرجاع عهدة: ${selectedRep.name}`,
      amount: 0,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      status: 'COMPLETED',
      items: inventoryToReturn.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: 0,
        total: 0
      })),
      notes: `إرجاع بضاعة غير مباعة من عهدة المندوب للمخزن الرئيسي`
    };
    setTransactions(prev => [returnTx, ...prev]);

    alert('تم إرجاع البضاعة للمخزن الرئيسي وتصفية عهدة المندوب بنجاح ✅');
    setActiveTab('LIST');
    setSelectedRepId(null);
  };

  if (activeTab === 'DISPATCH' && selectedRep) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">إذن صرف عهدة بضاعة</h3>
            <p className="text-indigo-100 text-sm">تجهيز عهدة ل: {selectedRep.name}</p>
          </div>
          <button onClick={() => setActiveTab('LIST')} className="text-white hover:bg-white/10 p-2 rounded-lg">✕</button>
        </div>
        <div className="p-8 space-y-6">
          <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 shadow-sm">
             <form onSubmit={handleBarcodeScan} className="flex gap-2">
                <div className="relative flex-1">
                   <input ref={barcodeRef} type="text" placeholder="امسح باركود الصنف هنا..." className="w-full bg-white border-2 border-transparent focus:border-indigo-400 rounded-2xl px-10 py-3 font-mono font-bold shadow-inner" value={barcodeScanInput} onChange={e => setBarcodeScanInput(e.target.value)} />
                   <span className="absolute left-3 top-3.5 opacity-30">🔳</span>
                </div>
                <button type="submit" className="bg-indigo-800 text-white px-6 rounded-2xl font-bold text-xs">بحث</button>
             </form>
          </div>
          <form onSubmit={handleDispatch} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase">المنتج المراد صرفه</label>
              <select className="w-full px-4 py-4 border-2 border-slate-50 bg-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold" value={dispatchForm.productId} onChange={(e) => setDispatchForm({...dispatchForm, productId: e.target.value})} required>
                <option value="">-- اختر من القائمة أو امسح الباركود --</option>
                {products.map(p => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} (المتاح: {p.stock} {p.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase">الكمية المسلمة للمندوب</label>
              <input ref={quantityRef} type="number" className="w-full px-4 py-4 border-2 border-slate-50 bg-slate-50 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none font-black text-2xl text-indigo-600" placeholder="0" value={dispatchForm.quantity || ''} onChange={(e) => setDispatchForm({...dispatchForm, quantity: Number(e.target.value)})} required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">تأكيد وتحميل البضاعة</button>
          </form>
        </div>
      </div>
    );
  }

  if (activeTab === 'RECONCILE' && selectedRep) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black">جرد وتصفية الحساب اليومي</h3>
              <p className="text-emerald-100 text-sm font-bold opacity-80">المندوب: {selectedRep.name}</p>
            </div>
            <button onClick={() => {setActiveTab('LIST'); setSelectedRepId(null); setCollectedAmount(0)}} className="text-white hover:bg-white/10 p-2 rounded-lg text-2xl">&times;</button>
          </div>
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h4 className="font-black text-slate-800 flex items-center"><span className="ml-2 text-xl">📦</span> جرد العهدة المتبقية</h4>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {selectedRep.currentInventory?.length ? selectedRep.currentInventory.map(item => (
                  <div key={item.productId} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                    <div><p className="font-bold text-slate-700 text-sm">{item.name}</p></div>
                    <div className="text-left"><span className="text-lg font-black text-slate-800">{item.quantity}</span></div>
                  </div>
                )) : <div className="text-center py-10"><p className="text-slate-300 font-bold mt-2">لا يوجد بضاعة متبقية</p></div>}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b pb-4"><h4 className="font-black text-slate-800 flex items-center"><span className="ml-2 text-xl">💵</span> تسوية النقدية</h4></div>
              <div className="space-y-6 flex-1">
                <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">المبيعات المتوقعة (كاش)</p>
                  <p className="text-4xl font-black text-emerald-400">{selectedRep.totalCollection?.toLocaleString()} <span className="text-xs font-normal">ج.م</span></p>
                </div>
                <input type="number" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-emerald-500 transition-all font-black text-3xl text-emerald-600" placeholder="0" value={collectedAmount || ''} onChange={e => setCollectedAmount(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-50 border-t border-gray-100 flex gap-4">
            <button onClick={handleFullReconcile} className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 text-lg uppercase tracking-widest">اعتماد الجرد وتوريد النقدية</button>
            <button onClick={handleReturnUnsoldToWarehouse} className="bg-slate-200 text-slate-600 font-black px-8 py-5 rounded-2xl hover:bg-slate-300 transition-all">إرجاع البضاعة للمخزن</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">إدارة المناديب وطاقم العمل</h3>
        <button onClick={() => { setEditingStaff(null); setStaffForm({ name: '', username: '', password: '', role: 'SALES_REP', phone: '', permissions: [AppView.SALES] }); setIsManageModalOpen(true); }} className="bg-slate-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-slate-800 transition-all">+ إضافة موظف جديد</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map((person) => (
          <div key={person.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-reverse space-x-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold bg-slate-100 text-slate-600">{person.name[0]}</div>
                  <div><h4 className="font-bold text-gray-900">{person.name}</h4><span className="text-[10px] text-gray-400 font-bold uppercase">{getRoleBadge(person.role)}</span></div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => openEditModal(person)} className="text-slate-400 hover:text-indigo-600 p-1" title="تعديل">⚙️</button>
                   <button onClick={() => handleDeleteStaff(person.id, person.name, person.totalCollection, person.currentInventory?.length || 0)} className="text-slate-400 hover:text-red-500 p-1" title="حذف">🗑️</button>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs"><span className="text-gray-400">الحالة:</span><span className={`font-bold ${person.status === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'}`}>{person.status === 'ACTIVE' ? 'نشط / متاح' : 'خارج في مهمة'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-400">العهدة الحالية:</span><span className="font-bold text-indigo-600">{person.currentInventory?.reduce((a, b) => a + b.quantity, 0) || 0} صنف</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-400">مبيعات اليوم:</span><span className="font-black text-slate-800">{person.totalCollection?.toLocaleString()} ج.م</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => {setSelectedRepId(person.id); setActiveTab('DISPATCH')}} className="text-[11px] bg-slate-100 text-slate-700 py-3 rounded-xl font-black hover:bg-indigo-600 hover:text-white transition-all">🚚 صرف عهدة</button>
                <button onClick={() => {setSelectedRepId(person.id); setActiveTab('RECONCILE')}} className="text-[11px] bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black hover:bg-emerald-600 hover:text-white transition-all">⚖️ تصفية جرد</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg my-auto overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="p-6 bg-slate-900 text-white flex justify-between"><h3 className="text-xl font-black">{editingStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h3><button onClick={() => setIsManageModalOpen(false)} className="text-2xl">&times;</button></div>
             <form onSubmit={handleSaveStaff} className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-xs font-bold text-gray-400 mb-1">الاسم بالكامل</label><input required type="text" className="w-full px-4 py-3 bg-gray-50 border rounded-xl" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-gray-400 mb-1">رقم الهاتف</label><input required type="tel" className="w-full px-4 py-3 bg-gray-50 border rounded-xl" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                   <div><label className="block text-xs font-bold text-blue-400 mb-1">اسم المستخدم</label><input required type="text" className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl" value={staffForm.username} onChange={e => setStaffForm({...staffForm, username: e.target.value})} /></div>
                   <div><label className="block text-xs font-bold text-blue-400 mb-1">كلمة المرور</label><input required type="text" className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl" value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-400 mb-1">المسمى الوظيفي</label><select className="w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value as UserRole})}><option value="SALES_REP">مندوب مبيعات</option><option value="WAREHOUSE">أمين مخزن</option><option value="DELIVERY">سائق توصيل</option><option value="ADMIN">مدير (ADMIN)</option></select></div>
                <div><label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">صلاحيات الوصول</label><div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl">{Object.values(AppView).map(view => (<label key={view} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer"><input type="checkbox" checked={staffForm.permissions?.includes(view)} onChange={() => togglePermission(view)} className="w-4 h-4 text-indigo-600 rounded-full" /><span className="text-[10px] font-black text-gray-700 uppercase">{view}</span></label>))}</div></div>
                <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95">{editingStaff ? 'تحديث البيانات' : 'إضافة الموظف'}</button>
             </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={deleteConfirmation.isOpen}
        onCancel={() => setDeleteConfirmation({ isOpen: false, staffId: '', staffName: '' })}
        onConfirm={confirmDeleteStaff}
        title="حذف موظف"
        message={`هل أنت متأكد من حذف الموظف "${deleteConfirmation.staffName}" نهائياً؟ سيتم إلغاء صلاحيات الدخول الخاصة به.`}
        confirmText="حذف نهائي"
        cancelText="تراجع"
        type="danger"
      />
    </div>
  );
};

export default Staff;
