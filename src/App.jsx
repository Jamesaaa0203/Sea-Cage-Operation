import React, { useState, useEffect } from 'react';

// PASTE YOUR DEPLOYED GOOGLE SCRIPT URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFWgPQuf2NtGZinQTNdBL_03v5wtmM9x_iWM4VR6b9jexECt6p7jkWuqraj0xxy-ZJyw/exec";

const THEMES = {
  dark: {
    bg: 'bg-[#121212]', card: 'bg-[#1E1E1E] border-[#2C2C2C]', text: 'text-white', muted: 'text-gray-400',
    input: 'bg-[#181818] border-[#2C2C2C] text-white focus:border-[#3A86FF]', accent: '#3A86FF',
    success: 'border-[#00E676]', danger: 'border-[#FF1744]', gridBg: 'bg-[#181818]'
  },
  light: {
    bg: 'bg-[#F8F9FA]', card: 'bg-white border-[#E9ECEF] shadow-sm', text: 'text-[#1A1D20]', muted: 'text-gray-500',
    input: 'bg-white border-[#E9ECEF] text-[#1A1D20] focus:border-[#0D6EFD]', accent: '#0D6EFD',
    success: 'border-[#2E7D32]', danger: 'border-[#D32F2F]', gridBg: 'bg-[#F1F3F5]'
  }
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('layout'); 
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cloud Data Matrices
  const [cloudData, setCloudData] = useState({ transfers: [], mortality: [], checks: [] });

  // Premium Interactive Zoom State Engine
  const [zoomedPetak, setZoomedPetak] = useState(null);

  // Form Field States
  const [tfUnit, setTfUnit] = useState('');
  const [tfPetak, setTfPetak] = useState('1');
  const [tfSize, setTfSize] = useState('0.5 - 0.8');
  const [tfQty, setTfQty] = useState('');
  const [mortalityType, setMortalityType] = useState('harian'); 
  const [mdUnit, setMdUnit] = useState('');
  const [mdPetak, setMdPetak] = useState('1');
  const [mdQty, setMdQty] = useState('');

  const theme = isDarkMode ? THEMES.dark : THEMES.light;

  const fetchAllData = async () => {
    if (SCRIPT_URL.includes("YOUR_GOOGLE")) return;
    setIsLoading(true);
    try {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      setCloudData(data);
    } catch(e) {
      alert("Error syncing data from cloud storage sheets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handlePost = async (payload) => {
    setIsLoading(true);
    try {
      await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      alert("Berjaya disimpan ke cloud Google Sheet!");
      fetchAllData();
    } catch (e) {
      alert("Ralat sambungan cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (unitId, petakNum) => {
    let initialBaseline = 0; 
    let transferredIn = 0;
    let deadCount = 0;

    cloudData.transfers?.filter(t => t.unitId == unitId && t.petak == petakNum).forEach(t => transferredIn += parseInt(t.qty || 0));
    cloudData.mortality?.filter(m => m.unitId == unitId && m.petak == petakNum).forEach(m => deadCount += parseInt(m.qty || 0));

    const totalEntered = initialBaseline + transferredIn;
    const currentLive = Math.max(0, totalEntered - deadCount);
    const survivalRate = totalEntered > 0 ? ((currentLive / totalEntered) * 100).toFixed(1) : "100.0";

    return { totalEntered, deadCount, currentLive, survivalRate };
  };

  const isCageBroken = (unitId) => {
    return cloudData.checks?.some(c => c.unitId == unitId && c.status === 'Rosak');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme.bg} ${theme.text} pb-10`}>
      
      {/* Dynamic Cloud Loader */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center font-black text-xs tracking-widest text-white">
          LOADING REALTIME GRID DATA...
        </div>
      )}

      {/* Modern Zoomed-Out Information Hub Modal */}
      {zoomedPetak && (() => {
        const metrics = calculateMetrics(zoomedPetak.unitId, zoomedPetak.petakNum);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setZoomedPetak(null)}>
            <div className={`w-full max-w-sm border p-6 rounded-3xl shadow-2xl transform scale-100 transition-all duration-300 ${theme.card}`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h4 className="font-black text-sm tracking-wide text-blue-500">UNIT {zoomedPetak.unitId} — PETAK {zoomedPetak.petakNum}</h4>
                <button onClick={() => setZoomedPetak(null)} className="text-xs bg-gray-500/20 px-2.5 py-1 rounded-md font-bold">Tutup</button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between"><span>Total Inflow (Transferred):</span><span className="font-bold">{metrics.totalEntered} spats</span></div>
                <div className="flex justify-between"><span>Total Accumulated Dead:</span><span className="font-bold text-red-500">{metrics.deadCount}</span></div>
                <div className="flex justify-between border-t pt-2"><span>Current Live Stock:</span><span className="font-bold text-emerald-500 text-sm">{metrics.currentLive} spats</span></div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span>Survival Rate:</span>
                  <span className="px-2.5 py-1 rounded-lg font-black text-sm bg-emerald-500/10 text-emerald-500">{metrics.survivalRate}%</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <header className={`h-16 flex justify-between items-center px-6 border-b sticky top-0 z-40 ${theme.card}`}>
        <div className="text-base font-black tracking-tight">SeaCage<span style={{color: theme.accent}}>Topology</span></div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[10px] font-bold px-3 py-1.5 rounded-full border">
          {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </header>

      {/* 4 App Tabs */}
      <div className="flex max-w-xl mx-auto my-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-gray-500/10">
        <button onClick={() => setActiveTab('layout')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'layout' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Layout Map</button>
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'transfer' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Pindah Benih</button>
        <button onClick={() => setActiveTab('mortality')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'mortality' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Log Kematian</button>
      </div>

      <main className="max-w-xl mx-auto px-4">
        
        {/* TAB 1: 3-COLUMN x 8-ROW HAND-DRAWN REPLICA TOPOLOGY GRID */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <input type="text" placeholder="🔍 Tapis No Unit (Contoh: Unit 4)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`h-11 rounded-xl px-4 border w-full text-xs outline-none ${theme.input}`} />
            
            {/* Exactly 3 Columns as sketched by user */}
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(colNum => (
                <div key={colNum} className="space-y-4">
                  {Array.from({ length: 8 }, (_, rowIndex) => {
                    // Logic calculating exact grid IDs to map sequential array flow correctly
                    // Column 1: Units 1-8 | Column 2: Units 9-16 | Column 3: Units 17-24
                    const uId = (colNum - 1) * 8 + (rowIndex + 1);
                    
                    if (searchQuery && !`Unit ${uId}`.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                    
                    const m1 = calculateMetrics(uId, '1');
                    const m2 = calculateMetrics(uId, '2');
                    const broken = isCageBroken(uId);

                    return (
                      <div key={uId} className={`border-2 rounded-xl flex flex-col overflow-hidden h-32 transition-transform active:scale-98 relative ${theme.gridBg} ${broken ? theme.danger : theme.success}`}>
                        
                        {/* Unit Block Label */}
                        <div className="text-[10px] font-black text-center py-1 bg-black/10 border-b border-inherit">
                          Unit {uId}
                        </div>

                        {/* Petak 1 (Top Half Rectangle) */}
                        <div className="flex-1 flex flex-col justify-center items-center cursor-pointer hover:bg-black/5" onClick={() => setZoomedPetak({unitId: uId, petakNum: '1'})}>
                          <span className={`text-[8px] uppercase ${theme.muted}`}>Petak 1</span>
                          <span className="text-xs font-black">{m1.currentLive}</span>
                        </div>

                        {/* THE DOTTED HORIZONTAL LINE SEPARATOR (verbatim to drawing sketch) */}
                        <div className="border-t-2 border-dashed border-inherit w-full"></div>

                        {/* Petak 2 (Bottom Half Rectangle) */}
                        <div className="flex-1 flex flex-col justify-center items-center cursor-pointer hover:bg-black/5" onClick={() => setZoomedPetak({unitId: uId, petakNum: '2'})}>
                          <span className={`text-[8px] uppercase ${theme.muted}`}>Petak 2</span>
                          <span className="text-xs font-black">{m2.currentLive}</span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PEMINDAHAN BENIH */}
        {activeTab === 'transfer' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3 className="text-xs font-black uppercase tracking-wider mb-4 text-blue-500">Rekod Pemindahan Benih</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold uppercase">Unit No (1-24)</label>
                <input type="number" value={tfUnit} onChange={e => setTfUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} placeholder="Ex: 1" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase">Petak</label>
                <div className="flex gap-2 mt-1">
                  {['1', '2'].map(p => (
                    <button key={p} onClick={() => setTfPetak(p)} className={`flex-1 h-11 rounded-xl font-bold border text-xs ${tfPetak === p ? 'bg-blue-600 text-white' : ''}`}>P{p}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase">Julat Saiz Benih (cm)</label>
              <div className="flex gap-2 mt-1">
                {['0.5 - 0.8', '0.9 ke atas'].map(sz => (
                  <button key={sz} onClick={() => setTfSize(sz)} className={`flex-1 h-11 rounded-xl font-bold border text-xs ${tfSize === sz ? 'bg-blue-600 text-white' : ''}`}>{sz}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase">Kuantiti Benih</label>
              <input type="number" value={tfQty} onChange={e => setTfQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} placeholder="Contoh: 3000" />
            </div>
            <button onClick={() => handlePost({action:'pemindahan', date: new Date().toISOString().split('T')[0], unitId: tfUnit, petak: tfPetak, size: tfSize, qty: parseInt(tfQty)})} className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl text-xs">Hantar Data Pemindahan</button>
          </div>
        )}

        {/* TAB 3: LOG KEMATIAN ROUTINE & PASCA-TRANSFER UPDATES */}
        {activeTab === 'mortality' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3 className="text-xs font-black uppercase tracking-wider mb-4 text-red-500">Kemasukan Rekod Kematian</h3>
            <div className="flex gap-2 mb-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border">
              <button onClick={() => setMortalityType('harian')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${mortalityType === 'harian' ? 'bg-red-600 text-white' : ''}`}>Kematian Routine</button>
              <button onClick={() => setMortalityType('pasca')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${mortalityType === 'pasca' ? 'bg-red-600 text-white' : ''}`}>Mortaliti Pasca-Transfer</button>
            </div>

            {mortalityType === 'harian' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase">Unit Sangkar</label>
                    <input type="number" value={mdUnit} onChange={e => setMdUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} placeholder="1-24" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase">Petak</label>
                    <div className="flex gap-2 mt-1">
                      {['1', '2'].map(p => (
                        <button key={p} onClick={() => setMdPetak(p)} className={`flex-1 h-11 rounded-xl font-bold border text-xs ${mdPetak === p ? 'bg-red-600 text-white' : ''}`}>P{p}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase">Bilangan Mati Ditemui</label>
                  <input type="number" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} placeholder="Ex: 5" />
                </div>
                <button onClick={() => handlePost({action:'kematian', date: new Date().toISOString().split('T')[0], unitId: mdUnit, petak: mdPetak, qty: parseInt(mdQty)})} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs">Simpan Kematian Harian</button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase">Pilih Batch Pemindahan Benih Terkini</label>
                <select onChange={e => {
                  const rec = cloudData.transfers[e.target.value];
                  if(rec) { setMdUnit(rec.unitId); setMdPetak(rec.petak); }
                }} className={`w-full h-11 border px-3 rounded-xl text-xs outline-none ${theme.input}`}>
                  <option value="">-- Sila Pilih Batch Sedia Ada --</option>
                  {cloudData.transfers?.map((t, idx) => (
                    <option key={idx} value={idx}>Unit {t.unitId} (P{t.petak}) - {t.qty} spats [{t.date}]</option>
                  ))}
                </select>
                <div>
                  <label className="text-[10px] font-bold uppercase">Bilangan Mati (Mortaliti Pasca 1-3 Hari)</label>
                  <input type="number" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} placeholder="Masukkan angka sahaja" />
                </div>
                <button onClick={() => handlePost({action:'kematian', date: new Date().toISOString().split('T')[0], unitId: mdUnit, petak: mdPetak, qty: parseInt(mdQty)})} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs">Simpan Mortaliti Pasca-Transfer</button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
