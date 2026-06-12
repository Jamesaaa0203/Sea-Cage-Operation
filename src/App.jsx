import React, { useState, useEffect } from 'react';

// PASTE YOUR DEPLOYED GOOGLE SCRIPT URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFWgPQuf2NtGZinQTNdBL_03v5wtmM9x_iWM4VR6b9jexECt6p7jkWuqraj0xxy-ZJyw/exec";

const THEMES = {
  dark: { bg: 'bg-[#121212]', card: 'bg-[#1E1E1E] border-[#2C2C2C]', text: 'text-white', muted: 'text-gray-400', input: 'bg-[#181818] border-[#2C2C2C] text-white focus:border-[#3A86FF]', accent: '#3A86FF', success: 'border-[#00E676]', danger: 'border-[#FF1744]', gridBg: 'bg-[#181818]' },
  light: { bg: 'bg-[#F8F9FA]', card: 'bg-white border-[#E9ECEF] shadow-sm', text: 'text-[#1A1D20]', muted: 'text-gray-500', input: 'bg-white border-[#E9ECEF] text-[#1A1D20] focus:border-[#0D6EFD]', accent: '#0D6EFD', success: 'border-[#2E7D32]', danger: 'border-[#D32F2F]', gridBg: 'bg-[#F1F3F5]' }
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('layout'); 
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManagerUnlocked, setIsManagerUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  // Cloud Data Engine
  const [cloudData, setCloudData] = useState({ setup: [], transfers: [], mortality: [], checks: [] });
  const [zoomedPetak, setZoomedPetak] = useState(null);

  // Field Form States
  const [tfUnit, setTfUnit] = useState('');
  const [tfPetak, setTfPetak] = useState('1');
  const [tfSize, setTfSize] = useState('0.5 - 0.8');
  const [tfQty, setTfQty] = useState('');
  const [mortalityType, setMortalityType] = useState('harian'); 
  const [mdUnit, setMdUnit] = useState('');
  const [mdPetak, setMdPetak] = useState('1');
  const [mdQty, setMdQty] = useState('');

  // Manager Setup Form Configuration States
  const [setupUnit, setSetupUnit] = useState('');
  const [setupPetak, setSetupPetak] = useState('1');
  const [setupQty, setSetupQty] = useState('');

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
      alert("Success! Synchronized to Google Sheets.");
      fetchAllData();
    } catch (e) {
      alert("Network cloud write error.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (unitId, petakNum) => {
    const configRow = cloudData.setup?.find(s => s.unitId == unitId && s.petak == petakNum);
    let initialBaseline = configRow ? parseInt(configRow.initialQty || 0) : 0; 
    
    let transferredIn = 0;
    let deadCount = 0;

    cloudData.transfers?.filter(t => t.unitId == unitId && t.petak == petakNum).forEach(t => transferredIn += parseInt(t.qty || 0));
    cloudData.mortality?.filter(m => m.unitId == unitId && m.petak == petakNum).forEach(m => deadCount += parseInt(m.qty || 0));

    const totalEntered = initialBaseline + transferredIn;
    const currentLive = Math.max(0, totalEntered - deadCount);
    const survivalRate = totalEntered > 0 ? ((currentLive / totalEntered) * 100).toFixed(1) : "100.0";

    return { totalEntered, deadCount, currentLive, survivalRate };
  };

  const getElapsedDays = () => {
    const startDate = new Date("2026-06-08T00:00:00");
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme.bg} ${theme.text} pb-10`}>
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center font-black text-xs tracking-widest text-white">
          LOADING REALTIME GRID DATA...
        </div>
      )}

      {/* Interactive Zoom Popup Card */}
      {zoomedPetak && (() => {
        const metrics = calculateMetrics(zoomedPetak.unitId, zoomedPetak.petakNum);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setZoomedPetak(null)}>
            <div className={`w-full max-w-sm border p-6 rounded-3xl shadow-2xl ${theme.card}`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h4 className="font-black text-xs uppercase text-blue-500">UNIT {zoomedPetak.unitId} — PETAK {zoomedPetak.petakNum}</h4>
                <button onClick={() => setZoomedPetak(null)} className="text-[10px] bg-gray-500/20 px-2.5 py-1 rounded-md font-bold">Close</button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between"><span>Total Spat Inputted:</span><span className="font-bold">{metrics.totalEntered}</span></div>
                <div className="flex justify-between"><span>Total Mortality Losses:</span><span className="font-bold text-red-500">{metrics.deadCount}</span></div>
                <div className="flex justify-between border-t pt-2"><span>Current Stock Balance:</span><span className="font-bold text-emerald-500 text-sm">{metrics.currentLive}</span></div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span>Survival Efficiency Rate:</span>
                  <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-emerald-500/10 text-emerald-500">{metrics.survivalRate}%</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <header className={`h-16 flex justify-between items-center px-6 border-b sticky top-0 z-40 ${theme.card}`}>
        <div className="text-sm font-black uppercase tracking-wider">SeaCage<span style={{color: theme.accent}}>Topology</span></div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[9px] font-bold px-3 py-1.5 rounded-full border">
          {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </header>

      {/* Modern App Tabs */}
      <div className="flex max-w-xl mx-auto my-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-gray-500/10">
        <button onClick={() => setActiveTab('layout')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'layout' ? 'bg-blue-600 text-white' : theme.muted}`}>Layout Map</button>
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'transfer' ? 'bg-blue-600 text-white' : theme.muted}`}>Pindah Benih</button>
        <button onClick={() => setActiveTab('mortality')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'mortality' ? 'bg-blue-600 text-white' : theme.muted}`}>Log Kematian</button>
        <button onClick={() => setActiveTab('manager')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'manager' ? 'bg-blue-600 text-white' : theme.muted}`}>Manager View</button>
      </div>

      <main className="max-w-xl mx-auto px-4">
        
        {/* TAB 1: 3-COLUMNS WITH SECURITY HOUSE EMBEDDED TO THE RIGHT */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <input type="text" placeholder="🔍 Tapis No Unit (Contoh: Unit 4)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`h-11 rounded-xl px-4 border w-full text-xs outline-none ${theme.input}`} />
            
            {/* Split layout into 4 columns layout: 3 for cages grid + 1 slim column on right for Security House alignment */}
            <div className="grid grid-cols-12 gap-3">
              
              {/* Cage Grid Main System Area (Spans 9 out of 12 columns) */}
              <div className="col-span-9 grid grid-cols-3 gap-3">
                {[1, 2, 3].map(colNum => (
                  <div key={colNum} className="space-y-3">
                    {Array.from({ length: 8 }, (_, rowIndex) => {
                      const uId = (colNum - 1) * 8 + (rowIndex + 1);
                      if (searchQuery && !`Unit ${uId}`.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                      
                      const m1 = calculateMetrics(uId, '1');
                      const m2 = calculateMetrics(uId, '2');

                      return (
                        <div key={uId} className={`border-2 rounded-xl flex flex-col overflow-hidden h-28 relative ${theme.gridBg} ${theme.success}`}>
                          <div className="text-[9px] font-black text-center py-0.5 bg-black/10 border-b border-inherit">Unit {uId}</div>
                          
                          <div className="flex-1 flex flex-col justify-center items-center cursor-pointer hover:bg-black/5" onClick={() => setZoomedPetak({unitId: uId, petakNum: '1'})}>
                            <span className="text-[8px] uppercase tracking-wide opacity-60">Petak 1</span>
                            <span className="text-xs font-black">{m1.currentLive}</span>
                          </div>

                          <div className="border-t border-dashed border-inherit w-full"></div>

                          <div className="flex-1 flex flex-col justify-center items-center cursor-pointer hover:bg-black/5" onClick={() => setZoomedPetak({unitId: uId, petakNum: '2'})}>
                            <span className="text-[8px] uppercase tracking-wide opacity-60">Petak 2</span>
                            <span className="text-xs font-black">{m2.currentLive}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* SECURITY HOUSE LANDMARK SIDEBAR (Spans remaining 3 out of 12 columns) */}
              <div className="col-span-3 flex flex-col justify-start relative">
                {/* Dynamically push the security house down to sit between the 2nd and 3rd row layout lines */}
                <div className="absolute top-[125px] left-0 right-0 border-2 border-amber-500/60 bg-amber-500/5 rounded-xl p-2 h-20 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-[16px] mb-0.5">🏠</span>
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-500">Security House</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: FIELD WORKER PEMINDAHAN BENIH */}
        {activeTab === 'transfer' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3 className="text-xs font-black uppercase tracking-wider mb-4 text-blue-500">Rekod Pemindahan Benih</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold uppercase">Unit No (1-24)</label>
                <input type="number" value={tfUnit} onChange={e => setTfUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} placeholder="Ex: 4" />
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

        {/* TAB 3: FIELD WORKER LOG KEMATIAN */}
        {activeTab === 'mortality' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3 className="text-xs font-black uppercase tracking-wider mb-4 text-red-500">Log Rekod Kematian</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
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
            <button onClick={() => handlePost({action:'kematian', date: new Date().toISOString().split('T')[0], unitId: mdUnit, petak: mdPetak, qty: parseInt(mdQty)})} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs mt-4">Simpan Kematian</button>
          </div>
        )}

        {/* TAB 4: PASSWORD LOCKED MANAGER VIEW */}
        {activeTab === 'manager' && (
          <div className="space-y-4">
            {!isManagerUnlocked ? (
              <div className={`border p-8 rounded-2xl text-center flex flex-col items-center ${theme.card}`}>
                <div className="text-xl mb-2">🔐</div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Manager Authorization Gate</h3>
                <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className={`h-12 text-center text-xl tracking-widest max-w-[180px] rounded-xl border outline-none ${theme.input}`} placeholder="••••" maxLength={4} />
                <button onClick={() => { if(pinInput === '3653') { setIsManagerUnlocked(true); setPinInput(''); } else alert("PIN Incorrect!"); }} className="w-full max-w-[180px] h-11 bg-blue-600 text-white font-bold rounded-xl mt-4 text-xs shadow-sm">Unlock Hub</button>
              </div>
            ) : (
              <div className="space-y-4">
                
                <div className={`border p-4 rounded-xl flex justify-between items-center ${theme.card}`}>
                  <div>
                    <h3 className="text-xs font-black uppercase text-blue-500">Operation Status Log</h3>
                    <p className="text-[11px] text-gray-400 mt-1">Start Date: June 8, 2026</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-lg text-xs font-black">{getElapsedDays()} Days Elapsed</span>
                  </div>
                </div>

                <div className={`border p-4 rounded-xl bg-blue-600/5 ${theme.card}`}>
                  <h4 className="text-xs font-black uppercase text-blue-500 mb-3">🛠️ Initial Layout Inventory Setup</h4>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <input type="number" placeholder="Unit (1-24)" value={setupUnit} onChange={e => setSetupUnit(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border outline-none ${theme.input}`} />
                    <select value={setupPetak} onChange={e => setSetupPetak(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border outline-none ${theme.input}`}>
                      <option value="1">Petak 1</option>
                      <option value="2">Petak 2</option>
                    </select>
                    <input type="number" placeholder="Initial Count" value={setupQty} onChange={e => setSetupQty(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border outline-none ${theme.input}`} />
                  </div>
                  <button onClick={() => {
                    if(!setupUnit || !setupQty) return alert("Please fill fields.");
                    handlePost({ action: "setup_initial", unitId: setupUnit, petak: setupPetak, qty: parseInt(setupQty) });
                    setSetupUnit(''); setSetupQty('');
                  }} className="w-full h-10 bg-blue-600 text-white font-bold text-xs rounded-lg">Save Configuration</button>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: 24 }, (_, i) => {
                    const uId = i + 1;
                    const p1m = calculateMetrics(uId, '1');
                    const p2m = calculateMetrics(uId, '2');

                    if(p1m.totalEntered === 0 && p2m.totalEntered === 0) return null;

                    return (
                      <div key={uId} className={`border p-4 rounded-xl space-y-3 ${theme.card}`}>
                        <div className="text-xs font-black border-b pb-1">Unit {uId} Analytics Profile</div>
                        <div className="grid grid-cols-2 gap-4 text-[11px]">
                          <div className="space-y-1">
                            <span className="font-extrabold text-blue-500 uppercase tracking-wide">Petak 1</span>
                            <div>Total Spat Transferred: <b>{p1m.totalEntered}</b></div>
                            <div>Total Mortality: <b className="text-red-500">{p1m.deadCount}</b></div>
                            <div>Survival Rate: <span className="px-1.5 py-0.5 rounded font-black bg-emerald-500/10 text-emerald-500">{p1m.survivalRate}%</span></div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-extrabold text-blue-500 uppercase tracking-wide">Petak 2</span>
                            <div>Total Spat Transferred: <b>{p2m.totalEntered}</b></div>
                            <div>Total Mortality: <b className="text-red-500">{p2m.deadCount}</b></div>
                            <div>Survival Rate: <span className="px-1.5 py-0.5 rounded font-black bg-emerald-500/10 text-emerald-500">{p2m.survivalRate}%</span></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
