import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const products = db.prepare('SELECT * FROM tblproducts ORDER BY id DESC').all();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'ดึงข้อมูลสินค้าไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { barcode, code, name, unit = 'ชิ้น' } = await request.json();
    const insert = db.prepare(`
      INSERT INTO tblproducts (barcode, code, name, unit)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(barcode) DO UPDATE SET
        code = excluded.code,
        name = excluded.name,
        unit = excluded.unit
    `);
    insert.run(barcode, code, name, unit);
    return NextResponse.json({ success: true, message: 'บันทึก Master Data สำเร็จ' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'บันทึกไม่สำเร็จ' }, { status: 500 });
  }
}