import { NextResponse } from 'next/server';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

// 1. เชื่อมต่อฐานข้อมูล SQLite (สร้างไฟล์ stock.db ในโฟลเดอร์โปรเจกต์อัตโนมัติ)
const dbPath = path.join(process.cwd(), 'stock.db');
const db = new DatabaseSync(dbPath);

// 2. สร้างตาราง tblusers อัตโนมัติหากยังไม่มี
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

// 3. ตรวจสอบและสร้างบัญชี Admin / Staff เริ่มต้นให้อัตโนมัติ
const checkUser = db.prepare('SELECT COUNT(*) as count FROM tblusers').get() as { count: number };
if (checkUser.count === 0) {
  const insert = db.prepare('INSERT INTO tblusers (username, password, fullname, role) VALUES (?, ?, ?, ?)');
  insert.run('admin', 'admin123', 'ผู้ดูแลระบบ (Admin)', 'admin');
  insert.run('staff', 'staff123', 'พนักงานคลังสินค้า (Staff)', 'staff');
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 4. ตรวจสอบ Username และ Password จากตาราง tblusers ใน SQLite
    const stmt = db.prepare('SELECT id, username, password, fullname, role FROM tblusers WHERE username = ?');
    const user = stmt.get(username) as { id: number; username: string; password: string; fullname: string; role: string } | undefined;

    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' },
      { status: 500 }
    );
  }
}