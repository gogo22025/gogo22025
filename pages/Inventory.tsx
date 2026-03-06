
import React, { useState, useMemo } from 'react';
import { Product, StaffMember, User, PriceLog } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  staff: StaffMember[];
  currentUser: User;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts, staff, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [bulkStockData, setBulkStockData] = useState<Record<string, number>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; productId: string; productName: string }>({
    isOpen: false,
    productId: '',
    productName: ''
  });

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    barcode: '',
    name: '',
    category: 'مواد غذائية',
    price: 0,
    stock: 0,
    unit: 'قطعة',
    reorderThreshold: 0
  });

  const getInCustodyCount = (productId: string) => {
    return staff.reduce((acc, member) => {
      const item = member.currentInventory?.find(i => i.productId === productId);
      return acc + (item?.quantity || 0);
    }, 0);
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    );
  }, [products, searchQuery]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        unit: product.unit,
        reorderThreshold: product.reorderThreshold || 0
      });
    } else {
      setEditingProduct(null);
      setFormData({ barcode: '', name: '', category: 'مواد غذائية', price: 0, stock: 0, unit: 'قطعة', reorderThreshold: 0 });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    const custody = getInCustodyCount(id);
    if (custody > 0) {
      alert(`عذراً، لا يمكن حذف "${name}" لوجود عهدة متبقية مع المناديب (${custody} قطعة). يجب تصفية العهدة أولاً.`);
      return;
    }

    setDeleteConfirmation({ isOpen: true, productId: id, productName: name });
  };

  const confirmDelete = () => {
    const { productId } = deleteConfirmation;
    setProducts((prev: Product[]) => prev.filter(p => p.id !== productId));
    setDeleteConfirmation({ isOpen: false, productId: '', productName: '' });
    alert('تم حذف الصنف بنجاح ✅');
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      setProducts((prev: Product[]) => prev.map(p => {
        if (p.id === editingProduct.id) {
          const updated = { ...formData, id: p.id, priceHistory: p.priceHistory };
          if (p.price !== formData.price) {
            return logPriceChange(p, formData.price, 'INVENTORY');
          }
          return { ...p, ...formData };
        }
        return p;
      }));
    } else {
      const newProduct: Product = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        priceHistory: []
      };
      setProducts((prev: Product[]) => [newProduct, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleBulkUpdate = () => {
    setProducts((prev: Product[]) => prev.map(p => {
      if (bulkStockData[p.id] !== undefined) {
        return { ...p, stock: bulkStockData[p.id] };
      }
      return p;
    }));
    setIsBulkModalOpen(false);
    setBulkStockData({});
    alert('تم تحديث المخزون بنجاح ✅');
  };

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-bold mb-1 uppercase">إجمالي الأصناف</p>
          <p className="text-xl font-bold text-gray-800">{products.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-indigo-400 font-bold mb-1 uppercase">بضاعة في المخزن</p>
          <p className="text-xl font-bold text-indigo-600">{products.reduce((a, b) => a + b.stock, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-amber-400 font-bold mb-1 uppercase">عهدة مع المناديب</p>
          <p className="text-xl font-bold text-amber-600">
            {products.reduce((acc, p) => acc + getInCustodyCount(p.id), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-emerald-400 font-bold mb-1 uppercase">قيمة المخزون</p>
          <p className="text-xl font-bold text-emerald-600">
            {products.reduce((a, b) => a + (b.price * (b.stock + getInCustodyCount(b.id))), 0).toLocaleString()} ج.م
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="البحث بالاسم أو الباركود أو التصنيف..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const initialData: Record<string, number> = {};
              products.forEach(p => initialData[p.id] = p.stock);
              setBulkStockData(initialData);
              setIsBulkModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all flex items-center"
          >
            <span className="ml-2">📦</span> تحديث كميات الجرد
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center"
          >
            <span className="ml-2">➕</span> إضافة صنف جديد
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">الصنف / الباركود</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">في المخزن</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">مع المناديب</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">السعر</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => {
                const custody = getInCustodyCount(p.id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-xl ml-3">{p.category === 'مواد غذائية' ? '🍞' : p.category === 'مجمدات' ? '❄️' : p.category === 'ألعاب' ? '🧸' : '👕'}</span>
                        <div>
                          <p className="font-bold text-gray-800">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono tracking-tighter">Barcode: {p.barcode || '---'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{p.stock} <span className="text-[10px] text-gray-400 font-normal">{p.unit}</span></td>
                    <td className="px-6 py-4 font-bold text-amber-600">{custody > 0 ? custody : '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          className="w-24 px-2 py-1 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-emerald-500 rounded-lg outline-none font-bold text-gray-900 transition-all"
                          defaultValue={p.price}
                          onBlur={(e) => {
                            const newPrice = Number(e.target.value);
                            if (newPrice !== p.price) {
                              setProducts((prev: Product[]) => prev.map(prod => 
                                prod.id === p.id ? logPriceChange(prod, newPrice, 'INVENTORY') : prod
                              ));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            setHistoryProduct(p);
                            setIsHistoryModalOpen(true);
                          }}
                          className="text-gray-300 hover:text-indigo-500 transition-colors"
                          title="سجل الأسعار"
                        >
                          🕒
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-3">
                         <button onClick={() => handleOpenModal(p)} className="text-indigo-600 hover:text-indigo-900 text-sm font-bold bg-indigo-50 px-3 py-1 rounded-lg">تعديل</button>
                         <button onClick={() => handleDelete(p.id, p.name)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1 rounded-lg">حذف</button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-900 text-white">
              <h3 className="text-xl font-black">{editingProduct ? 'تعديل الصنف' : 'إضافة صنف جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-3xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">الباركود (Barcode)</label>
                <div className="relative">
                   <input 
                     required 
                     type="text" 
                     placeholder="امسح الباركود أو اكتبه هنا..."
                     value={formData.barcode} 
                     onChange={(e) => setFormData({...formData, barcode: e.target.value})} 
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono" 
                   />
                   <span className="absolute left-3 top-3 opacity-30">🔳</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">اسم الصنف</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">التصنيف</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="مواد غذائية">مواد غذائية</option>
                    <option value="مجمدات">مجمدات</option>
                    <option value="ألعاب">ألعاب</option>
                    <option value="ملابس">ملابس</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">الوحدة</label>
                  <input required type="text" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">السعر (ج.م)</label>
                  <input required type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">الكمية بالمخزن</label>
                  <input required type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">حد إعادة الطلب (تنبيه نقص المخزون)</label>
                <input type="number" value={formData.reorderThreshold} onChange={(e) => setFormData({...formData, reorderThreshold: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 mt-4 transition-all active:scale-95 uppercase tracking-widest text-sm">حفظ البيانات</button>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <div>
                <h3 className="text-xl font-black">تحديث كميات الجرد (Bulk Update)</h3>
                <p className="text-xs opacity-80 font-bold mt-1">قم بتعديل الكميات الفعلية الموجودة في المخزن حالياً</p>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-white/60 hover:text-white text-3xl transition-colors">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <table className="w-full text-right">
                <thead className="sticky top-0 bg-white border-b-2 border-gray-100">
                  <tr>
                    <th className="pb-4 text-xs font-black text-gray-400 uppercase">الصنف</th>
                    <th className="pb-4 text-xs font-black text-gray-400 uppercase">الكمية الحالية</th>
                    <th className="pb-4 text-xs font-black text-gray-400 uppercase w-48">الكمية الجديدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-gray-800">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.barcode}</p>
                      </td>
                      <td className="py-4 font-black text-gray-400">{p.stock} {p.unit}</td>
                      <td className="py-4">
                        <input 
                          type="number"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-indigo-600"
                          value={bulkStockData[p.id] || 0}
                          onChange={(e) => setBulkStockData({...bulkStockData, [p.id]: Number(e.target.value)})}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
              >
                إلغاء
              </button>
              <button 
                onClick={handleBulkUpdate}
                className="px-12 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                حفظ كافة التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="حذف الصنف"
        message={`هل أنت متأكد من حذف الصنف "${deleteConfirmation.productName}" نهائياً من النظام؟ لا يمكن التراجع عن هذه الخطوة.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        confirmText="نعم، احذف الصنف"
        cancelText="تراجع"
        type="danger"
      />
      {/* Price History Modal */}
      {isHistoryModalOpen && historyProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">سجل تغييرات الأسعار</h3>
                <p className="text-xs opacity-80 font-bold mt-1">{historyProduct.name}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-3xl">&times;</button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {(!historyProduct.priceHistory || historyProduct.priceHistory.length === 0) ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-4">📜</p>
                  <p className="font-bold">لا يوجد سجل تغييرات لهذا الصنف بعد</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyProduct.priceHistory.map((log, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{log.source === 'INVENTORY' ? 'المخزن' : log.source === 'SALE' ? 'فاتورة بيع' : 'فاتورة شراء'}</span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">بواسطة: {log.userName}</p>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 line-through">{log.oldPrice.toLocaleString()}</span>
                          <span className="text-lg font-black text-indigo-600">← {log.newPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold">ج.م</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50 border-t flex justify-end">
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-black hover:bg-gray-100 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
