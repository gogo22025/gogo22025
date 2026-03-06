
import React, { useState, useEffect } from 'react';
import { AppView, Product, StaffMember, Partner, Transaction, User, BillingSettings } from './types';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Partners from './pages/Partners';
import Safe from './pages/Safe';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Settings from './pages/Settings';

const initialSettings: BillingSettings = {
  companyName: 'ديسترو سمارت 🚀',
  companyAddress: 'القاهرة، مصر',
  companyPhone: '01000000000',
  taxNumber: '300000000000003',
  logoUrl: '',
  vatPercentage: 14,
  currency: 'ج.م'
};

const initialProducts: Product[] = [
  { id: '1', barcode: '6221234567890', name: 'أرز بسمتي 5كج', category: 'مواد غذائية', price: 45, stock: 150, unit: 'كيس' },
  { id: '2', barcode: '6220000111222', name: 'لحم بقري مفروم', category: 'مجمدات', price: 60, stock: 42, unit: 'كج' },
];

const initialStaff: StaffMember[] = [
  { 
    id: 's1', name: 'أحمد علي', username: 'ahmed', password: '111', role: 'SALES_REP', phone: '01012345678', status: 'BUSY',
    permissions: [AppView.SALES, AppView.PARTNERS],
    currentInventory: [
      { productId: '1', name: 'أرز بسمتي 5كج', quantity: 20 }
    ],
    totalCollection: 4500,
    performancePoints: 120
  }
];

const initialPartners: Partner[] = [
  { id: 'p1', name: 'سوبر ماركت الهدى', type: 'CUSTOMER', phone: '01011112222', address: 'القاهرة', balance: -4500, loyaltyPoints: 50 },
];

const initialTransactions: Transaction[] = [
  { 
    id: 'INV-5001', 
    date: '2024-03-01', 
    timestamp: Date.now(), 
    type: 'SALE', 
    partnerName: 'سوبر ماركت الهدى', 
    amount: 4500, 
    subtotal: 3947.37,
    taxAmount: 552.63,
    discountAmount: 0,
    status: 'PAID', 
    items: [], 
    staffId: 's1' 
  },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<BillingSettings>(initialSettings);
  const [loading, setLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resProducts, resStaff, resPartners, resTransactions, resSettings] = await Promise.all([
          fetch('/api/products').then(r => r.json()),
          fetch('/api/staff').then(r => r.json()),
          fetch('/api/partners').then(r => r.json()),
          fetch('/api/transactions').then(r => r.json()),
          fetch('/api/settings').then(r => r.json())
        ]);

        // If DB is empty, use initial mock data and sync it
        if (resProducts.length === 0 && resStaff.length === 0) {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              products: initialProducts,
              staff: initialStaff,
              partners: initialPartners,
              transactions: initialTransactions,
              settings: initialSettings
            })
          });
          setProducts(initialProducts);
          setStaff(initialStaff);
          setPartners(initialPartners);
          setTransactions(initialTransactions);
          setSettings(initialSettings);
        } else {
          setProducts(resProducts);
          setStaff(resStaff);
          setPartners(resPartners);
          setTransactions(resTransactions);
          if (resSettings && Object.keys(resSettings).length > 0) {
            setSettings(resSettings);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync state to DB on changes
  useEffect(() => {
    if (loading) return;
    const sync = async () => {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products, staff, partners, transactions, settings })
        });
      } catch (e) {
        console.error("Sync failed:", e);
      }
    };
    const timer = setTimeout(sync, 1000);
    return () => clearTimeout(timer);
  }, [products, staff, partners, transactions, settings, loading]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView(user.permissions.includes(AppView.DASHBOARD) ? AppView.DASHBOARD : user.permissions[0]);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-black animate-pulse">جاري تحميل قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard transactions={transactions} products={products} partners={partners} staff={staff} />;
      case AppView.SAFE:
        return <Safe transactions={transactions} setTransactions={setTransactions} currentUser={currentUser} />;
      case AppView.INVOICES:
        return <Invoices 
          transactions={transactions} 
          setTransactions={setTransactions}
          partners={partners} 
          setPartners={setPartners}
          products={products}
          setProducts={setProducts}
          staff={staff}
          setStaff={setStaff}
          currentUser={currentUser}
          settings={settings}
        />;
      case AppView.INVENTORY:
        return <Inventory products={products} setProducts={setProducts} staff={staff} currentUser={currentUser} />;
      case AppView.STAFF:
        return (
          <Staff 
            staffList={staff} 
            setStaffList={setStaff} 
            products={products} 
            setProducts={setProducts} 
            transactions={transactions} 
            setTransactions={setTransactions} 
          />
        );
      case AppView.PURCHASES:
        return (
          <Purchases 
            transactions={transactions} setTransactions={setTransactions} 
            partners={partners} setPartners={setPartners} 
            products={products} setProducts={setProducts} 
            currentUser={currentUser}
            settings={settings}
          />
        );
      case AppView.SALES:
        return (
          <Sales 
            products={products} setProducts={setProducts} 
            transactions={transactions} setTransactions={setTransactions} 
            partners={partners} setPartners={setPartners} 
            staff={staff} setStaff={setStaff} 
            currentUser={currentUser}
            settings={settings}
          />
        );
      case AppView.PARTNERS:
        return (
          <Partners 
            partners={partners} 
            setPartners={setPartners} 
            transactions={transactions} 
            setTransactions={setTransactions} 
          />
        );
      case AppView.SETTINGS:
        return <Settings settings={settings} setSettings={setSettings} />;
      case AppView.REPORTS:
        return <Reports 
          transactions={transactions}
          products={products}
          partners={partners}
          staff={staff}
          settings={settings}
        />;
      default:
        return <Dashboard transactions={transactions} products={products} partners={partners} staff={staff} />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} staffList={staff} />;
  }

  return (
    <Layout currentView={currentView} setView={setCurrentView} user={currentUser} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

export default App;
