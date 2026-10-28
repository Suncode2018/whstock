import { NextResponse } from 'next/server';

// ข้อมูลผู้ใช้งานระบบ (Cloud / Serverless User Authentication)
const USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    fullname: 'ผู้ดูแลระบบ (Admin)',
    role: 'admin',
  },
  {
    id: 2,
    username: 'staff',
    password: 'staff123',
    fullname: 'พนักงานคลังสินค้า (Staff)',
    role: 'staff',
  },
];

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const user = USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
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
      { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}