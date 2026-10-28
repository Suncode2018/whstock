'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('whstock_user_session', JSON.stringify(data.user));
        router.push('/');
      } else {
        setErrorMsg(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-100 rounded-2xl text-indigo-600 mb-1">
            <Boxes className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">เข้าสู่ระบบตรวจนับสต๊อก</h1>
          <p className="text-xs text-slate-500">WH Stock Management System</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">ชื่อผู้ใช้งาน (Username)</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น admin หรือ staff"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 text-xs">รหัสผ่าน (Password)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Account Info */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-1.5 text-slate-600">
          <p className="font-bold text-slate-700">🔑 ข้อมูลผู้ใช้งานเริ่มต้นในฐานข้อมูล:</p>
          <div className="flex justify-between items-center bg-white p-2 rounded-lg border">
            <div>
              <span className="font-bold text-indigo-700">Admin</span>: <code className="bg-slate-100 px-1 rounded">admin</code> / <code className="bg-slate-100 px-1 rounded">admin123</code>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">เข้าได้ทุกเมนู</span>
          </div>
          <div className="flex justify-between items-center bg-white p-2 rounded-lg border">
            <div>
              <span className="font-bold text-emerald-700">Staff</span>: <code className="bg-slate-100 px-1 rounded">staff</code> / <code className="bg-slate-100 px-1 rounded">staff123</code>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">สแกนสต๊อกอย่างเดียว</span>
          </div>
        </div>

      </div>
    </div>
  );
}