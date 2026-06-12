import React, { useState, useEffect } from 'react';

const THEMES = {
  dark: {
    bg: 'bg-[#121212]',
    card: 'bg-[#1E1E1E] border-[#2C2C2C]',
    text: 'text-white',
    muted: 'text-gray-400',
    input: 'bg-[#181818] border-[#2C2C2C] text-white focus:border-[#3A86FF]',
    accent: '#3A86FF',
    success: 'border-[#00E676] text-[#00E676]',
    danger: 'border-[#FF1744] text-[#FF1744]'
  },
  light: {
    bg: 'bg-[#F8F9FA]',
    card: 'bg-white border-[#E9ECEF] shadow-sm',
    text: 'text-[#1A1D20]',
    muted: 'text-gray-500',
    input: 'bg-white border-[#E9ECEF] text-[#1A1D20] focus:border-[#0D6EFD]',
    accent: '#0D6EFD',
    success: 'border-[#2E7D32] text-[#2E7D32]',
    danger: 'border-[#D32F2F] text-[#D32F2F]'
  }
};

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFWgPQuf2NtGZinQTNdBL_03v5wtmM9x_iWM4VR6b9jexECt6p7jkWuqraj0xxy-ZJyw/exec";

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('worker');
  const [isManagerUnlocked, setIsManagerUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [tfUnit, setTfUnit] = useState('');
  const [tfPetak, setTfPetak] = useState('1');
  const [tfSize, setTfSize] = useState('0.5 - 0.8');
  const [tfQty, setTfQty] = useState('');
  const [mdUnit, setMdUnit] = useState('');
  const [mdPetak, setMdPetak] = useState('1');
  const [mdQty, setMdQty] = useState('');
  const [chUnit, setChUnit] = useState('');
  const [chPetak, setChPetak] = useState('1');
  const [chStatus, setChStatus] = useState('Normal');
  const [chType, setChType] = useState('Net Rosak');
  const [chCustom, setChCustom] = useState('');

  const [cloudData, setCloudData] = useState({ transfers: [], mortality: [], checks: [] });
  const theme = isDarkMode ? THEMES.dark : THEMES.light;

  const handlePost = async (payload) => {
    setIsLoading(true);
    try {
      await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      alert("Berjaya disimpan ke cloud!");
    } catch (e) {
      alert("Ralat rangkaian cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (pinInput === '3653') {
      setIsLoading(true);
      try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        setCloudData(data);
        setIsManagerUnlocked(true);
      } catch (e) {
        alert("Gagal memuatkan data.");
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("PIN Salah!");
    }
  };

  // Dynamic calculations for the cage topology matrix
  const getCageData = (unitId) => {
    let p1 = 500, p2 = 500;
    cloudData.transfers.filter(t => t.unitId == unitId).forEach(t => { if(t.petak == 1) p1 += t.qty; else p2 += t.qty; });
    cloudData.mortality.filter(m => m.unitId == unitId).forEach(m => { if(m.petak == 1) p1 -= m.qty; else p2 -= m.qty; });
    const issue = cloudData.checks.find(c => c.unitId == unitId && c.status === 'Rosak');
    return { p1, p2, issue: issue ? issue.issue : null };
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme.bg} ${theme.text} pb-10`}>
      {/* Premium Blur Loading Spinner */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center font-bold tracking-wider text-white">
          <div className="animate-pulse">PROCESSING CLOUD DATA...</div>
        </div>
      )}

      {/* Header Accent */}
      <header className={`h-16 flex justify-between items-center px-6 border-b backdrop-blur-md sticky top-0 z-40 ${theme.card}`}>
        <div className="text-xl font-black tracking-tight">SeaCage<span style={{color: theme.accent}}>Ops</span></div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-xs font-bold px-4 py-2 rounded-full border transition-transform active:scale-95">
          {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </header>

      {/* Modern Navigation Tabs */}
      <div className="flex max-w-md mx-auto my-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-gray-500/10">
        <button onClick={() => setActiveTab('worker')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'worker' ? 'bg-blue-600 text-white shadow-lg' : theme.muted}`}>
          Pekerja Field (BM)
        </button>
        <button onClick={() => setActiveTab('manager')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'manager' ? 'bg-blue-600 text-white shadow-lg' : theme.muted}`}>
          Manager View (ENG)
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-xl mx-auto px-4">
        {activeTab === 'worker' ? (
          <div className="space-y-4 class-fade-in">
            {/* Form 1: Pemindahan Benih */}
            <div className={`border p-5 rounded-2xl ${theme.card}`}>
              <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4 text-blue-500">1. Pemindahan Benih</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase ${theme.muted}`}>Unit No (1-24)</label>
                  <input type="number" value={tfUnit} onChange={e => setTfUnit(e.target.value)} className={`w-100 h-11 border px-3 rounded-xl outline-none mt-1 ${theme.input}`} placeholder="Ex: 5" />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase ${theme.muted}`}>Petak</label>
                  <div className="flex gap-2 mt-1">
                    {['1', '2'].map(p => (
                      <button key={p} onClick={() => setTfPetak(p)} className={`flex-1 h-11 rounded-xl font-bold border transition-all text-xs ${tfPetak === p ? 'bg-blue-600 text-white border-transparent' : ''}`}>P{p}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className={`text-[10px] font-bold uppercase ${theme.muted}`}>Julat Saiz (cm)</label>
                <div className="flex gap-2 mt-1">
                  {['0.5 - 0.8', '0.9 ke atas'].map(sz => (
                    <button key={sz} onClick={() => setTfSize(sz)} className={`flex-1 h-11 rounded-xl font-bold border text-xs transition-all ${tfSize === sz ? 'bg-blue-600 text-white border-transparent' : ''}`}>{sz}</button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className={`text-[10px] font-bold uppercase ${theme.muted}`}>Bilangan Benih (Qty)</label>
                <input type="number" value={tfQty} onChange={e => setTfQty(e.target.value)} className={`w-100 h-11 border px-3 rounded-xl outline-none mt-1 ${theme.input}`} placeholder="Ex: 1500" />
              </div>
              <button onClick={() => handlePost({action:'pemindahan', date: new Date().toISOString().split('T')[0], unitId: tfUnit, petak: tfPetak, size: tfSize, qty: parseInt(tfQty)})} className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl transition-transform active:scale-98 shadow-md">Simpan Rekod Pemindahan</button>
            </div>

            {/* Form 2: Log Kematian */}
            <div className={`border p-5 rounded-2xl ${theme.card}`}>
              <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4 text-red-500">2. Log Kematian</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase ${theme.muted}`}>Unit Sangkar</label>
                  <input type="number" value={mdUnit} onChange={e => setMdUnit(e.target.value)} className={`w-100 h-11 border px-3 rounded-xl outline-none mt-1 ${theme.input}`} placeholder="1-24" />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase ${theme.muted}`}>Petak</label>
                  <div className="flex gap-2 mt-1">
                    {['1', '2'].map(p => (
                      <button key={p} onClick={() => setMdPetak(p)} className={`flex-1 h-11 rounded-xl font-bold border text-xs transition-all ${mdPetak === p ? 'bg-red-600 text-white border-transparent' : ''}`}>P{p}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className={`text-[10px] font-bold uppercase ${theme.muted}`}>Jumlah Kematian</label>
                <input type="number" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-100 h-11 border px-3 rounded-xl outline-none mt-1 ${theme.input}`} placeholder="Ex: 12" />
              </div>
              <button onClick={() => handlePost({action:'kematian', date: new Date().toISOString().split('T')[0], unitId: mdUnit, petak: mdPetak, qty: parseInt(mdQty)})} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl transition-transform active:scale-98 shadow-md">Kemaskini Log Kematian</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gate Screen */}
            {!isManagerUnlocked ? (
              <div id="lock-screen" className={`border p-8 rounded-2xl text-center flex flex-col items-center ${theme.card}`}>
                <div className="text-3xl mb-2">🔐</div>
                <h3 className="text-base font-bold">Security Access Required</h3>
                <p className={`text-xs mb-6 ${theme.muted}`}>Enter administrative pin payload sequence.</p>
                <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className={`h-14 text-center text-2xl tracking-widest max-w-[200px] rounded-xl border ${theme.input}`} placeholder="••••" maxLength={4} />
                <button onClick={handleUnlock} className="w-full max-w-[200px] h-11 bg-blue-600 text-white font-bold rounded-xl mt-4 shadow-md transition-transform active:scale-95">Unlock</button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dashboard Header/Filters */}
                <div className="flex gap-2">
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Filter Layout (e.g. Unit 3)..." className={`h-11 rounded-xl px-4 border ${theme.input} flex-1`} />
                  <button onClick={() => setIsManagerUnlocked(false)} className="px-4 bg-red-600 text-white font-bold rounded-xl text-xs">Lock</button>
                </div>

                {/* The Topology Map Matrix */}
                <div className={`border p-4 rounded-2xl ${theme.card}`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 ${theme.muted}">Structural Topology Map</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 24 }, (_, i) => {
                      const uId = i + 1;
                      if (searchQuery && !`Unit ${uId}`.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                      const cData = getCageData(uId);
                      return (
                        <div key={uId} className={`aspect-square border-2 rounded-xl flex flex-col items-center justify-center p-1 transition-all ${cData.issue ? 'border-red-500 bg-red-500/5' : 'border-emerald-500 bg-emerald-500/5'}`}>
                          <div className="text-xs font-black">U{uId}</div>
                          <div className="text-[9px] font-medium opacity-80">P1: {cData.p1}</div>
                          <div className="text-[9px] font-medium opacity-80">P2: {cData.p2}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Analytical Batches Data Panel */}
                <div className={`border p-4 rounded-2xl ${theme.card}`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Post-Transfer Analytics</h3>
                  <div className="divide-y divide-gray-500/10">
                    {cloudData.transfers.map((rec, idx) => {
                      const lossPct = rec.qty > 0 ? ((rec.dead3Days / rec.qty) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={idx} className="flex justify-between items-center py-3">
                          <div>
                            <div className="text-xs font-bold">Unit {rec.unitId} — Petak {rec.petak}</div>
                            <div className={`text-[10px] ${theme.muted}`}>Batch size: {rec.qty} ({rec.size} cm)</div>
                          </div>
                          <div className={`text-sm font-black ${parseFloat(lossPct) > 5.0 ? 'text-red-500' : 'text-emerald-500'}`}>{lossPct}% Loss</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
