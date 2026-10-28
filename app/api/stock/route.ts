import { NextResponse } from 'next/server';
import db from '@/lib/db';

// ดึงข้อมูลรายการสต๊อกที่นับได้ทั้งหมด
export async function GET() {
  try {
    const counts = db.prepare('SELECT * FROM tblstock_counts ORDER BY last_scanned DESC').all();
    return NextResponse.json({ success: true, data: counts });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// สแกนนับสต๊อกเพิ่ม
export async function POST(request: Request) {
  try {
    const { barcode, qty = 1, scanned_by = 'Staff' } = await request.json();
    if (!barcode) return NextResponse.json({ success: false, message: 'ไม่มีบาร์โค้ด' }, { status: 400 });

    // ค้นหาใน Master Data
    const prod = db.prepare('SELECT * FROM tblproducts WHERE barcode = ?').get(barcode) as { code: string; name: string; unit: string } | undefined;

    const code = prod ? prod.code : 'UNREGISTERED';
    const name = prod ? prod.name : '⚠️ สินค้านอก Master Data';
    const unit = prod ? prod.unit : 'ชิ้น';

    // บันทึกลง tblstock_counts (ถ้ามีอยู่แล้วให้นับบวกเพิ่ม)
    const upsert = db.prepare(`
      INSERT INTO tblstock_counts (barcode, code, name, unit, qty, scanned_by, last_scanned)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(barcode) DO UPDATE SET
        qty = qty + excluded.qty,
        last_scanned = datetime('now', 'localtime'),
        scanned_by = excluded.scanned_by
    `);
    upsert.run(barcode, code, name, unit, qty, scanned_by);

    const updated = db.prepare('SELECT * FROM tblstock_counts WHERE barcode = ?').get(barcode);

    return NextResponse.json({
      success: true,
      item: updated,
      isKnown: !!prod
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ success: false, message: 'บันทึกสต๊อกไม่สำเร็จ' }, { status: 500 });
  }
}

// ล้างยอดนับสต๊อกทั้งหมด
export async function DELETE() {
  try {
    db.prepare('DELETE FROM tblstock_counts').run();
    return NextResponse.json({ success: true, message: 'ล้างข้อมูลสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}