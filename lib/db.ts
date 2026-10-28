import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.join(process.cwd(), 'stock.db');
const db = new DatabaseSync(dbPath);

// 1. ตารางผู้ใช้งาน
db.exec(`
  CREATE TABLE IF NOT EXISTS tblusers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    fullname TEXT,
    role TEXT DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 2. ตาราง Master Data สินค้า
db.exec(`
  CREATE TABLE IF NOT EXISTS tblproducts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    code TEXT,
    name TEXT,
    unit TEXT DEFAULT 'ชิ้น',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 3. ตารางบันทึกยอดตรวจนับสต๊อก
db.exec(`
  CREATE TABLE IF NOT EXISTS tblstock_counts (
    barcode TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    unit TEXT,
    qty INTEGER DEFAULT 0,
    scanned_by TEXT,
    last_scanned DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// สร้างผู้ใช้เริ่มต้นหากยังไม่มี
const checkUser = db.prepare('SELECT COUNT(*) as count FROM tblusers').get() as { count: number };
if (checkUser.count === 0) {
  const insert = db.prepare('INSERT INTO tblusers (username, password, fullname, role) VALUES (?, ?, ?, ?)');
  insert.run('admin', 'admin123', 'ผู้ดูแลระบบ (Admin)', 'admin');
  insert.run('staff', 'staff123', 'พนักงานคลังสินค้า (Staff)', 'staff');
}

// สร้างสินค้าตัวอย่างหากยังไม่มี
const checkProd = db.prepare('SELECT COUNT(*) as count FROM tblproducts').get() as { count: number };
if (checkProd.count === 0) {
  const insertProd = db.prepare('INSERT INTO tblproducts (barcode, code, name, unit) VALUES (?, ?, ?, ?)');
  insertProd.run('885012345001', 'SKU-001', 'สมุดโน้ตปกแข็ง A5 ตารางกริด', 'เล่ม');
  insertProd.run('885012345002', 'SKU-002', 'ปากกาหมึกเจล 0.5 มม. สีน้ำเงิน', 'ด้าม');
  insertProd.run('885012345003', 'SKU-003', 'ปากกาหมึกเจล 0.5 มม. สีแดง', 'ด้าม');
  insertProd.run('885012345004', 'SKU-004', 'กระดาษถ่ายเอกสาร A4 80 แกรม', 'รีม');
  insertProd.run('885012345005', 'SKU-005', 'คลิปหนีบกระดาษสีดำ เบอร์ 111', 'กล่อง');
  insertProd.run('885012345006', 'SKU-006', 'เทปใสปิดกล่อง 2 นิ้ว 100 หลา', 'ม้วน');
}

export default db;