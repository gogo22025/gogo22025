import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database("database.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    barcode TEXT UNIQUE,
    name TEXT,
    category TEXT,
    price REAL,
    stock INTEGER,
    unit TEXT
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    phone TEXT,
    status TEXT,
    permissions TEXT,
    currentInventory TEXT,
    totalCollection REAL,
    performancePoints INTEGER
  );

  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    type TEXT,
    phone TEXT,
    address TEXT,
    balance REAL,
    loyaltyPoints INTEGER
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT,
    timestamp INTEGER,
    type TEXT,
    partnerName TEXT,
    staffId TEXT,
    amount REAL,
    subtotal REAL,
    taxAmount REAL,
    discountAmount REAL,
    status TEXT,
    items TEXT,
    notes TEXT,
    qrCodeData TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = JSON.parse(curr.value);
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    Object.entries(settings).forEach(([key, value]) => {
      stmt.run(key, JSON.stringify(value));
    });
    res.json({ status: "success" });
  });

  // Products
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { id, barcode, name, category, price, stock, unit } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO products (id, barcode, name, category, price, stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, barcode, name, category, price, stock, unit);
    res.json({ status: "success" });
  });

  app.delete("/api/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ status: "success" });
  });

  // Staff
  app.get("/api/staff", (req, res) => {
    const staff = db.prepare("SELECT * FROM staff").all().map((s: any) => ({
      ...s,
      permissions: JSON.parse(s.permissions || "[]"),
      currentInventory: JSON.parse(s.currentInventory || "[]")
    }));
    res.json(staff);
  });

  app.post("/api/staff", (req, res) => {
    const { id, name, username, password, role, phone, status, permissions, currentInventory, totalCollection, performancePoints } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO staff (id, name, username, password, role, phone, status, permissions, currentInventory, totalCollection, performancePoints) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, name, username, password, role, phone, status, JSON.stringify(permissions), JSON.stringify(currentInventory), totalCollection, performancePoints);
    res.json({ status: "success" });
  });

  app.delete("/api/staff/:id", (req, res) => {
    db.prepare("DELETE FROM staff WHERE id = ?").run(req.params.id);
    res.json({ status: "success" });
  });

  // Partners
  app.get("/api/partners", (req, res) => {
    const partners = db.prepare("SELECT * FROM partners").all();
    res.json(partners);
  });

  app.post("/api/partners", (req, res) => {
    const { id, name, type, phone, address, balance, loyaltyPoints } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO partners (id, name, type, phone, address, balance, loyaltyPoints) VALUES (?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, name, type, phone, address, balance, loyaltyPoints);
    res.json({ status: "success" });
  });

  app.delete("/api/partners/:id", (req, res) => {
    db.prepare("DELETE FROM partners WHERE id = ?").run(req.params.id);
    res.json({ status: "success" });
  });

  // Transactions
  app.get("/api/transactions", (req, res) => {
    const transactions = db.prepare("SELECT * FROM transactions").all().map((t: any) => ({
      ...t,
      items: JSON.parse(t.items || "[]")
    }));
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const { id, date, timestamp, type, partnerName, staffId, amount, subtotal, taxAmount, discountAmount, status, items, notes, qrCodeData } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO transactions (id, date, timestamp, type, partnerName, staffId, amount, subtotal, taxAmount, discountAmount, status, items, notes, qrCodeData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, date, timestamp, type, partnerName, staffId, amount, subtotal || amount, taxAmount || 0, discountAmount || 0, status, JSON.stringify(items), notes, qrCodeData);
    res.json({ status: "success" });
  });

  app.delete("/api/transactions/:id", (req, res) => {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
    res.json({ status: "success" });
  });

  app.get("/api/download-db", (req, res) => {
    const dbPath = join(__dirname, "database.db");
    res.download(dbPath, "database.db", (err) => {
      if (err) {
        console.error("Error downloading database:", err);
        res.status(500).send("Error downloading database");
      }
    });
  });

  app.post("/api/reset", (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM products").run();
      db.prepare("DELETE FROM staff").run();
      db.prepare("DELETE FROM partners").run();
      db.prepare("DELETE FROM transactions").run();
      // We keep settings so the company info remains
    });
    transaction();
    res.json({ status: "success" });
  });

  // Bulk update for sync (optional but useful)
  app.post("/api/sync", (req, res) => {
    const { products, staff, partners, transactions, settings } = req.body;
    
    const transaction = db.transaction(() => {
      if (products) {
        db.prepare("DELETE FROM products").run();
        const stmt = db.prepare("INSERT INTO products (id, barcode, name, category, price, stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?)");
        products.forEach((p: any) => stmt.run(p.id, p.barcode, p.name, p.category, p.price, p.stock, p.unit));
      }
      if (staff) {
        db.prepare("DELETE FROM staff").run();
        const stmt = db.prepare("INSERT INTO staff (id, name, username, password, role, phone, status, permissions, currentInventory, totalCollection, performancePoints) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        staff.forEach((s: any) => stmt.run(s.id, s.name, s.username, s.password, s.role, s.phone, s.status, JSON.stringify(s.permissions), JSON.stringify(s.currentInventory), s.totalCollection, s.performancePoints));
      }
      if (partners) {
        db.prepare("DELETE FROM partners").run();
        const stmt = db.prepare("INSERT INTO partners (id, name, type, phone, address, balance, loyaltyPoints) VALUES (?, ?, ?, ?, ?, ?, ?)");
        partners.forEach((p: any) => stmt.run(p.id, p.name, p.type, p.phone, p.address, p.balance, p.loyaltyPoints));
      }
      if (transactions) {
        db.prepare("DELETE FROM transactions").run();
        const stmt = db.prepare("INSERT INTO transactions (id, date, timestamp, type, partnerName, staffId, amount, subtotal, taxAmount, discountAmount, status, items, notes, qrCodeData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        transactions.forEach((t: any) => stmt.run(t.id, t.date, t.timestamp, t.type, t.partnerName, t.staffId, t.amount, t.subtotal || t.amount, t.taxAmount || 0, t.discountAmount || 0, t.status, JSON.stringify(t.items), t.notes, t.qrCodeData));
      }
      if (settings) {
        db.prepare("DELETE FROM settings").run();
        const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
        Object.entries(settings).forEach(([key, value]) => {
          stmt.run(key, JSON.stringify(value));
        });
      }
    });

    transaction();
    res.json({ status: "success" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
