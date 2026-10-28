'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Barcode, 
  Boxes, 
  Database, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Sparkles, 
  LogOut, 
  UserCheck, 
  Smartphone, 
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UserSession {
  id: number;
  username: string;
  fullname: string;
  role: 'admin' | 'staff';
}

interface ProductMaster {
  barcode: string;
  code: string;
  name: string;
  unit: string;
}

interface StockCountItem {
  barcode: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  lastScanned: string;
}

// 📦 ข้อมูลสินค้าเริ่มต้นอัตโนมัติ (ป้องกัน Staff เจอปัญหาสินค้านอก Master Data)
const DEFAULT_PRODUCTS: ProductMaster[] = [
  { barcode: "885012345001", code: "SKU-001", name: "สมุดโน้ตปกแข็ง A5 ตารางกริด", unit: "เล่ม" },
  { barcode: "885012345002", code: "SKU-002", name: "ปากกาหมึกเจล 0.5 มม. สีน้ำเงิน", unit: "ด้าม" },
  { barcode: "885012345003", code: "SKU-003", name: "ปากกาหมึกเจล 0.5 มม. สีแดง", unit: "ด้าม" },
  { barcode: "885012345004", code: "SKU-004", name: "กระดาษถ่ายเอกสาร A4 80 แกรม", unit: "รีม" },
  { barcode: "885012345005", code: "SKU-005", name: "คลิปหนีบกระดาษสีดำ เบอร์ 111", unit: "กล่อง" },
  { barcode: "885012345006", code: "SKU-006", name: "เทปใสปิดกล่อง 2 นิ้ว 100 หลา", unit: "ม้วน" }
];

export default function StockScannerApp() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'scanner' | 'admin' | 'summary'>('scanner');
  const [isMounted, setIsMounted] = useState(false);

  // Storage
  const [masterList, setMasterList] = useState<ProductMaster[]>([]);
  const [stockCounts, setStockCounts] = useState<Record<string, StockCountItem>>({});

  // Handheld State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedItem, setLastScannedItem] = useState<{
    barcode: string;
    code: string;
    name: string;
    unit: string;
    qty: number;
    isKnown: boolean;
    statusTime: string;
  } | null>(null);

  const [customAddQty, setCustomAddQty] = useState<number>(1);

  // Admin Master State
  const [formBarcode, setFormBarcode] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('ชิ้น');
  const [editingBarcode, setEditingBarcode] = useState<string | null>(null);
  const [searchMaster, setSearchMaster] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load & Auth Check
  useEffect(() => {
    setIsMounted(true);
    const sessionStr = localStorage.getItem('whstock_user_session');
    if (!sessionStr) {
      router.push('/login');
      return;
    }
    const user: UserSession = JSON.parse(sessionStr);
    setCurrentUser(user);

    // โหลด Master Data (ถ้ายังไม่มี ให้ใช้ค่าเริ่มต้นทันที)
    const savedMaster = localStorage.getItem('whstock_master_data_v1');
    if (savedMaster && JSON.parse(savedMaster).length > 0) {
      setMasterList(JSON.parse(savedMaster));
    } else {
      setMasterList(DEFAULT_PRODUCTS);
      localStorage.setItem('whstock_master_data_v1', JSON.stringify(DEFAULT_PRODUCTS));
    }

    // โหลด Stock Counts
    const savedCounts = localStorage.getItem('whstock_counts_v1');
    if (savedCounts) {
      try { setStockCounts(JSON.parse(savedCounts)); } catch {}
    }
  }, [router]);

  // 2. Real-time Sync ข้ามหน้าต่างทันทีด้วย BroadcastChannel
  useEffect(() => {
    let broadcast: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcast = new BroadcastChannel('whstock_live_sync');
      broadcast.onmessage = (event) => {
        if (event.data?.type === 'UPDATE_STOCK') {
          setStockCounts(event.data.counts);
        }
        if (event.data?.type === 'UPDATE_MASTER') {
          setMasterList(event.data.master);
        }
      };
    }

    // Storage Event Listener (สำรอง)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'whstock_counts_v1' && e.newValue) {
        try { setStockCounts(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'whstock_master_data_v1' && e.newValue) {
        try { setMasterList(JSON.parse(e.newValue)); } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (broadcast) broadcast.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // ฟังก์ชันกระจายข้อมูลให้ทุกหน้าจออัปเดตพร้อมกันทันที
  const broadcastStockUpdate = (newCounts: Record<string, StockCountItem>) => {
    setStockCounts(newCounts);
    localStorage.setItem('whstock_counts_v1', JSON.stringify(newCounts));
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('whstock_live_sync');
      bc.postMessage({ type: 'UPDATE_STOCK', counts: newCounts });
      bc.close();
    }
  };

  const broadcastMasterUpdate = (newMaster: ProductMaster[]) => {
    setMasterList(newMaster);
    localStorage.setItem('whstock_master_data_v1', JSON.stringify(newMaster));
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('whstock_live_sync');
      bc.postMessage({ type: 'UPDATE_MASTER', master: newMaster });
      bc.close();
    }
  };

  const ensureInputFocus = () => {
    setTimeout(() => { barcodeInputRef.current?.focus(); }, 50);
  };

  useEffect(() => { ensureInputFocus(); }, [activeTab]);

  // Sound & Vibration Feedback
  const triggerHandheldFeedback = (success: boolean = true) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(success ? 80 : [150, 80, 150]);
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  };

  // Process Scan
  const handleScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    // ค้นหาสินค้าจาก Master Data ปัจจุบัน
    const currentMaster = masterList.length > 0 ? masterList : DEFAULT_PRODUCTS;
    const product = currentMaster.find(p => p.barcode === barcode);
    const timeStr = new Date().toLocaleTimeString('th-TH');
    const updated = { ...stockCounts };
    const addQty = customAddQty > 0 ? customAddQty : 1;

    if (product) {
      triggerHandheldFeedback(true);
      if (!updated[barcode]) {
        updated[barcode] = {
          barcode: product.barcode,
          code: product.code,
          name: product.name,
          unit: product.unit || 'ชิ้น',
          qty: 0,
          lastScanned: timeStr
        };
      }
      updated[barcode].qty += addQty;
      updated[barcode].lastScanned = timeStr;

      setLastScannedItem({
        barcode: product.barcode,
        code: product.code,
        name: product.name,
        unit: product.unit || 'ชิ้น',
        qty: updated[barcode].qty,
        isKnown: true,
        statusTime: timeStr
      });
    } else {
      triggerHandheldFeedback(false);
      if (!updated[barcode]) {
        updated[barcode] = {
          barcode,
          code: 'UNREGISTERED',
          name: '⚠️ สินค้านอก Master Data',
          unit: 'ชิ้น',
          qty: 0,
          lastScanned: timeStr
        };
      }
      updated[barcode].qty += addQty;
      updated[barcode].lastScanned = timeStr;

      setLastScannedItem({
        barcode,
        code: 'UNREGISTERED',
        name: '⚠️ สินค้านอก Master Data',
        unit: 'ชิ้น',
        qty: updated[barcode].qty,
        isKnown: false,
        statusTime: timeStr
      });
    }

    // กระจายยอดนับใหม่ให้หน้าจออื่นทันที
    broadcastStockUpdate(updated);

    setBarcodeInput('');
    setCustomAddQty(1);
    ensureInputFocus();
  };

  const adjustLastItemQty = (delta: number) => {
    if (!lastScannedItem) return;
    const barcode = lastScannedItem.barcode;
    const updated = { ...stockCounts };
    if (updated[barcode]) {
      updated[barcode].qty += delta;
      if (updated[barcode].qty <= 0) {
        delete updated[barcode];
        setLastScannedItem(null);
      } else {
        setLastScannedItem({ ...lastScannedItem, qty: updated[barcode].qty });
      }
      broadcastStockUpdate(updated);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('whstock_user_session');
    router.push('/login');
  };

  // Master Data handlers
  const handleSaveMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBarcode || !formCode || !formName) return;
    let updatedMaster = [...masterList];
    if (editingBarcode) {
      updatedMaster = updatedMaster.map(item => item.barcode === editingBarcode ? { barcode: formBarcode, code: formCode, name: formName, unit: formUnit } : item);
      alert('อัปเดตข้อมูลสำเร็จ!');
    } else {
      if (updatedMaster.some(item => item.barcode === formBarcode)) return alert('บาร์โค้ดนี้มีอยู่ในระบบแล้ว');
      updatedMaster.push({ barcode: formBarcode, code: formCode, name: formName, unit: formUnit });
      alert('เพิ่มสินค้าสำเร็จ!');
    }
    broadcastMasterUpdate(updatedMaster);
    setFormBarcode(''); setFormCode(''); setFormName(''); setEditingBarcode(null);
  };

  const loadDemoData = () => {
    broadcastMasterUpdate(DEFAULT_PRODUCTS);
    alert('โหลดข้อมูลตัวอย่างสำเร็จ!');
  };

  const exportStockReportExcel = () => {
    const list = Object.values(stockCounts);
    if (list.length === 0) return alert('ยังไม่มีข้อมูลการตรวจนับสต๊อก');
    const ws = XLSX.utils.json_to_sheet(list.map((item, idx) => ({
      "ลำดับ": idx + 1,
      "บาร์โค้ด": item.barcode,
      "รหัสสินค้า": item.code,
      "ชื่อสินค้า": item.name,
      "จำนวนสต๊อกที่นับได้": item.qty,
      "หน่วยนับ": item.unit,
      "เวลานับล่าสุด": item.lastScanned
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockCount");
    XLSX.writeFile(wb, `StockCount_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const clearAllCounts = () => {
    if (confirm('ยืนยันล้างข้อมูลสต๊อกทั้งหมด?')) {
      broadcastStockUpdate({});
      setLastScannedItem(null);
    }
  };

  const scannedList = Object.values(stockCounts);
  const totalQtyCounted = scannedList.reduce((sum, item) => sum + item.qty, 0);

  if (!isMounted || !currentUser) return null;

  // =========================================================================
  // VIEW: สำหรับ STAFF บนเครื่อง HANDHELD
  // =========================================================================
  if (currentUser.role === 'staff') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans select-none pb-4">
        
        {/* Header Bar */}
        <header className="bg-slate-800 px-4 py-2.5 border-b border-slate-700 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs font-bold text-slate-200 leading-tight">WH HANDHELD SCANNER</p>
              <p className="text-[11px] text-emerald-400 font-medium">● {currentUser.fullname}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-700 active:bg-rose-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> ออก
          </button>
        </header>

        {/* Input Barcode */}
        <form onSubmit={handleScan} className="px-3 pt-3">
          <div className="relative">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="▶ พร้อมยิงบาร์โค้ดทันที..."
              className="w-full bg-slate-950 border-2 border-indigo-500 rounded-xl px-4 py-3 text-base font-mono font-bold text-amber-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-indigo-600 active:bg-indigo-700 text-white font-bold rounded-lg text-xs"
            >
              ยิง
            </button>
          </div>
        </form>

        {/* Quick Add Presets */}
        <div className="px-3 pt-2 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">บวกด่วน:</span>
          {[1, 5, 10, 12, 24, 50].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => { setCustomAddQty(num); ensureInputFocus(); }}
              className={`flex-1 py-1.5 rounded-lg font-bold border transition text-center ${
                customAddQty === num
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-105'
                  : 'bg-slate-800 text-slate-300 border-slate-700 active:bg-slate-700'
              }`}
            >
              +{num}
            </button>
          ))}
        </div>

        {/* HERO DISPLAY */}
        <div className="p-3 flex-1 flex flex-col justify-center">
          {lastScannedItem ? (
            <div className={`p-4 rounded-2xl border-2 flex flex-col justify-between shadow-2xl transition-all ${
              lastScannedItem.isKnown
                ? 'bg-gradient-to-b from-slate-800 to-slate-850 border-emerald-500'
                : 'bg-gradient-to-b from-slate-800 to-slate-850 border-amber-500'
            }`}>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    lastScannedItem.isKnown ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {lastScannedItem.isKnown ? '✓ พบข้อมูล Master Data' : '⚠️ นอก Master Data'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{lastScannedItem.statusTime}</span>
                </div>

                <h2 className="text-lg font-black text-white leading-tight line-clamp-2 mt-1">
                  {lastScannedItem.name}
                </h2>
                <div className="flex gap-2 text-xs text-slate-400 font-mono mt-1">
                  <span>SKU: <strong className="text-indigo-400">{lastScannedItem.code}</strong></span>
                  <span>|</span>
                  <span>บาร์โค้ด: <strong className="text-slate-200">{lastScannedItem.barcode}</strong></span>
                </div>
              </div>

              {/* JUMBO QUANTITY */}
              <div className="my-4 py-4 bg-slate-950 rounded-2xl border border-slate-700/80 text-center flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ยอดรวมสต๊อกที่นับได้</span>
                <div className="flex items-baseline justify-center gap-2 mt-1">
                  <span className="text-6xl font-black text-amber-400 font-mono tracking-tight drop-shadow-md">
                    {lastScannedItem.qty}
                  </span>
                  <span className="text-base font-bold text-slate-300">
                    {lastScannedItem.unit}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => adjustLastItemQty(-1)}
                  className="bg-slate-700 active:bg-rose-700 py-3 rounded-xl font-black text-2xl text-slate-200 shadow-md border border-slate-600 flex items-center justify-center"
                >
                  - 1
                </button>
                <button
                  type="button"
                  onClick={() => adjustLastItemQty(1)}
                  className="bg-emerald-600 active:bg-emerald-700 py-3 rounded-xl font-black text-2xl text-white shadow-md border border-emerald-500 flex items-center justify-center"
                >
                  + 1
                </button>
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-800/80 border-2 border-dashed border-slate-700 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center mb-3 animate-pulse">
                <Barcode className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-base font-bold text-white">พร้อมยิงสแกนสินค้า</p>
              <p className="text-xs text-slate-400 mt-1">กดไกปืนที่เครื่อง Handheld เพื่อยิงบาร์โค้ดได้ทันที</p>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="px-3 pt-1">
          <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-xl flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400">รายการที่นับ: </span>
              <strong className="text-white font-mono text-sm">{scannedList.length}</strong> SKU
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div>
              <span className="text-slate-400">ชิ้นรวมทั้งหมด: </span>
              <strong className="text-amber-400 font-mono text-sm">{totalQtyCounted}</strong> ชิ้น
            </div>
          </div>
        </div>

      </div>
    );
  }

  // =========================================================================
  // VIEW: สำหรับ ADMIN บนคอมพิวเตอร์ Desktop/Tablet
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      
      {/* Admin Header */}
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <Boxes className="w-8 h-8 text-amber-300" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">WH Stock System (Admin)</h1>
              <p className="text-xs text-indigo-200">จัดการข้อมูล Master Data และดูยอดสต๊อก Real-time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-800/80 px-3 py-1.5 rounded-xl text-xs">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>{currentUser.fullname}</span>
              <span className="bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-bold uppercase text-[10px]">
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-indigo-800 hover:bg-rose-600 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <nav className="flex space-x-1 bg-indigo-800/60 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                activeTab === 'scanner' ? 'bg-white text-indigo-800 shadow' : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Barcode className="w-4 h-4" /> สแกนนับสต๊อก
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                activeTab === 'admin' ? 'bg-white text-indigo-800 shadow' : 'text-indigo-100 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" /> จัดการ Master Data
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition ${
                activeTab === 'summary' ? 'bg-white text-indigo-800 shadow' : 'text-indigo-100 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> สรุปสต๊อก & Export
            </button>
          </nav>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* ================= TAB 1: SCANNER ================= */}
        {activeTab === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Barcode className="w-5 h-5 text-indigo-600" /> สแกนบาร์โค้ดนับสต๊อกสินค้า
              </h2>

              <form onSubmit={handleScan} className="space-y-4">
                <div className="relative">
                  <Barcode className="w-6 h-6 absolute left-4 top-3.5 text-slate-400" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="สแกนหรือพิมพ์บาร์โค้ด แล้วกด Enter..."
                    className="w-full pl-12 pr-24 py-3.5 text-lg font-mono font-bold bg-slate-50 border-2 border-indigo-500 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-2 bottom-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition"
                  >
                    นับสต๊อก
                  </button>
                </div>
              </form>

              {lastScannedItem && (
                <div className={`mt-5 p-4 rounded-xl border flex justify-between items-center ${
                  lastScannedItem.isKnown ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'
                }`}>
                  <div>
                    <p className="font-bold text-base">{lastScannedItem.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">บาร์โค้ด: {lastScannedItem.barcode} | รหัส: {lastScannedItem.code}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">นับได้แล้ว:</span>
                    <p className="text-2xl font-black text-indigo-700">{lastScannedItem.qty} {lastScannedItem.unit}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">สรุปการนับปัจจุบัน (Real-time)</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ● Real-time Live
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 p-4 rounded-xl text-center">
                  <p className="text-xs text-indigo-600 font-semibold">รายการที่สแกน</p>
                  <p className="text-3xl font-extrabold text-indigo-900 mt-1">{scannedList.length}</p>
                  <p className="text-[11px] text-slate-500">SKU</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl text-center">
                  <p className="text-xs text-emerald-600 font-semibold">ยอดรวมชิ้น</p>
                  <p className="text-3xl font-extrabold text-emerald-900 mt-1">{totalQtyCounted}</p>
                  <p className="text-[11px] text-slate-500">ชิ้น</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MASTER DATA ================= */}
        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                {editingBarcode ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้า Master Data'}
              </h2>
              <form onSubmit={handleSaveMaster} className="space-y-4 text-sm">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">บาร์โค้ด (Barcode) *</label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="เช่น 8850123456789"
                    className="w-full px-3.5 py-2 border rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">รหัสสินค้า (Product Code) *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="เช่น SKU-001"
                    className="w-full px-3.5 py-2 border rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">ชื่อสินค้า (Product Name) *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="เช่น ปากกาลูกลื่นสีน้ำเงิน"
                    className="w-full px-3.5 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" /> {editingBarcode ? 'อัปเดตข้อมูล' : 'บันทึก Master Data'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-3">
                <button
                  onClick={loadDemoData}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> โหลดข้อมูลตัวอย่าง (Demo Data)
                </button>
              </div>

              {/* Master Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Master Data ทั้งหมด ({masterList.length} รายการ)</h3>
                  <input
                    type="text"
                    value={searchMaster}
                    onChange={(e) => setSearchMaster(e.target.value)}
                    placeholder="ค้นหา..."
                    className="px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3">บาร์โค้ด</th>
                        <th className="px-4 py-3">รหัสสินค้า</th>
                        <th className="px-4 py-3">ชื่อสินค้า</th>
                        <th className="px-4 py-3 text-center">หน่วย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {masterList
                        .filter(p => p.barcode.includes(searchMaster) || p.name.includes(searchMaster) || p.code.includes(searchMaster))
                        .map(item => (
                          <tr key={item.barcode} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{item.barcode}</td>
                            <td className="px-4 py-3 font-mono text-xs text-indigo-700">{item.code}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-3 text-center text-xs text-slate-500">{item.unit}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: SUMMARY & EXPORT ================= */}
        {activeTab === 'summary' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">รายงานสรุปการตรวจนับสต๊อก (Real-time Live)</h2>
                <p className="text-xs text-slate-500">ข้อมูลอัปเดตตรงกับเครื่อง Handheld ทันที</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportStockReportExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export สรุปสต๊อก (.xlsx)
                </button>
                <button
                  onClick={clearAllCounts}
                  className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" /> ล้างยอดนับรอบนี้
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">บาร์โค้ด</th>
                    <th className="px-4 py-3">รหัสสินค้า</th>
                    <th className="px-4 py-3">ชื่อสินค้า</th>
                    <th className="px-4 py-3 text-center">ยอดนับสต๊อก</th>
                    <th className="px-4 py-3">เวลานับล่าสุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scannedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">ยังไม่มีรายการสต๊อกที่ตรวจนับ</td>
                    </tr>
                  ) : (
                    scannedList.map((item, idx) => (
                      <tr key={item.barcode} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{item.barcode}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.code}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-center font-bold text-base text-indigo-700">{item.qty} {item.unit}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{item.lastScanned}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}