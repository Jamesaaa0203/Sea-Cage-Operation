import React, { useState, useEffect } from 'react';

// PASTE YOUR BRAND NEW DEPLOYED GOOGLE SCRIPT URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxnQ5G2IJAb98lQQZSsYEYjdoGs1rHabSUXdEmuDYUR6fCw_j9XOh36do9WzY7TVGzqxQ/exec";

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
  
  const [cloudData, setCloudData] = useState({ setup: [], transfers: [], mortality: [] });
  const [zoomedPetak, setZoomedPetak] = useState(null);

  // Forms
  const [tfUnit, setTfUnit] = useState('');
  const [tfPetak, setTfPetak] = useState('1');
  const [tfSize, setTfSize] = useState('0.5 - 0.8');
  const [tfQty, setTfQty] = useState('');
  const [mdUnit, setMdUnit] = useState('');
  const [mdPetak, setMdPetak] = useState('1');
  const [mdQty, setMdQty] = useState('');
  const [setupUnit, setSetupUnit] = useState('');
  const [setupPetak, setSetupPetak] = useState('1');
  const [setupQty, setSetupQty] = useState('');

  const theme = isDarkMode ? THEMES.dark : THEMES.light;

  const leftColumnMatrix =  [9,  10, 11, 12, 13, 14, 15, 16];
  const middleColumnMatrix = [1,  2,  3,  4,  17, 18, 19, 20];
  const rightColumnMatrix =  [5,  6,  7,  8,  21, 22, 23, 24];

  const fetchAllData = async () => {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_GOOGLE_SCRIPT_URL")) return;
    setIsLoading(true);
    try {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      setCloudData({
        setup: data.setup || [],
        transfers: data.transfers || [],
        mortality: data.mortality || []
      });
    } catch(e) {
      alert("Gagal memuatkan data dari Google Sheet.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handlePost = async (payload) => {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_GOOGLE_SCRIPT_URL")) {
      alert("Sila masukkan URL Google Script yang betul terlebih dahulu!");
      return;
    }
    setIsLoading(true);
    try {
      await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      alert("Berjaya disimpan ke Google Sheet!");
      await fetchAllData();
    } catch (e) {
      alert("Ralat menghantar data.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (unitId, petakNum) => {
    const configRow = cloudData.setup?.find(s => parseInt(s.unitId) === parseInt(unitId) && String(s.petak) === String(petakNum));
    let initialBaseline = configRow ? parseInt(configRow.initialQty || 0) : 0; 
    
    let transferredIn = 0;
    let deadCount = 0;

    cloudData.transfers?.filter(t => parseInt(t.unitId) === parseInt(unitId) && String(t.petak) === String(petakNum)).forEach(t => {
      transferredIn += parseInt(t.qty || 0);
    });

    cloudData.mortality?.filter(m => parseInt(m.unitId) === parseInt(unitId) && String(m.petak) === String(petakNum)).forEach(m => {
      deadCount += parseInt(m.qty || 0);
    });

    const totalEntered = initialBaseline + transferredIn;
    const currentLive = Math.max(0, totalEntered - deadCount);
    const survivalRate = totalEntered > 0 ? ((currentLive / totalEntered) * 100).toFixed(1) : "0.0";

    return { totalEntered, deadCount, currentLive, survivalRate };
  };

  const getElapsedDays = () => {
    const startDate = new Date("2026-06-08T00:00:00");
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderCageUnit = (uId) => {
    const m1 = calculateMetrics(uId, '1');
    const m2 = calculateMetrics(uId, '2');

    return (
      <div key={uId} className={`border-2 rounded-xl flex flex-col overflow-hidden h-28 relative ${theme.gridBg} ${theme.success}`}>
        <div className="text-[9px] font-black text-center py-0.5 bg-black/10 border-b border-inherit">Unit {uId}</div>
        
        <div className="flex-1 flex flex-col justify-center items-center cursor-pointer hover:bg-black/5" onClick={() => setZoomedPetak({unitId: uId, petakNum: '1'})}>
          <span className="text-[8px] uppercase opacity-60">P1</span>
          <span className="text-xs font-black">{m1.currentLive}</span>
        </div>

        <div className="border-t border-dashed border-inherit w-full"></div>

        <div className="flex-1 flex flex-col justify-center items-center cursor-pointer hover:bg-black/5" onClick={() => setZoomedPetak({unitId: uId, petakNum: '2'})}>
          <span className="text-[8px] uppercase opacity-60">P2</span>
          <span className="text-xs font-black">{m2.currentLive}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} pb-10`}>
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center font-black text-xs text-white">
          SYNCHRONIZING WITH CLOUD...
        </div>
      )}

      {zoomedPetak && (() => {
        const metrics = calculateMetrics(zoomedPetak.unitId, zoomedPetak.petakNum);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setZoomedPetak(null)}>
            <div className={`w-full max-w-sm border p-6 rounded-3xl ${theme.card}`} onClick={e => e.stopPropagation()}>
              <h4 className="font-black text-xs uppercase text-blue-500 mb-4 border-b pb-2">Unit {zoomedPetak.unitId} — Petak {zoomedPetak.petakNum}</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span>Total Spats Inputted:</span><span className="font-bold">{metrics.totalEntered}</span></div>
                <div className="flex justify-between"><span>Total Mortality:</span><span className="font-bold text-red-500">{metrics.deadCount}</span></div>
                <div className="flex justify-between border-t pt-2"><span>Current Live Stock:</span><span className="font-bold text-emerald-500">{metrics.currentLive}</span></div>
                <div className="flex justify-between border-t pt-2 items-center"><span>Survival Rate:</span><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-black">{metrics.survivalRate}%</span></div>
              </div>
            </div>
          </div>
        );
      })()}

      <header className={`h-16 flex justify-between items-center px-6 border-b ${theme.card}`}>
        <div className="text-sm font-black tracking-wider">SEACAGE<span>TOPOLOGY</span></div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[9px] font-bold px-3 py-1.5 rounded-full border">{isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}</button>
      </header>

      <div className="flex max-w-xl mx-auto my-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border">
        <button onClick={() => setActiveTab('layout')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'layout' ? 'bg-blue-600 text-white' : theme.muted}`}>Layout Map</button>
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'transfer' ? 'bg-blue-600 text-white' : theme.muted}`}>Pindah Benih</button>
        <button onClick={() => setActiveTab('mortality')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'mortality' ? 'bg-blue-600 text-white' : theme.muted}`}>Log Kematian</button>
        <button onClick={() => { setActiveTab('manager'); fetchAllData(); }} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'manager' ? 'bg-blue-600 text-white' : theme.muted}`}>Manager View</button>
      </div>

      <main className="max-w-xl mx-auto px-4">
        
        {activeTab === 'layout' && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-9 grid grid-cols-3 gap-3">
              <div className="space-y-3">{leftColumnMatrix.map(uId => renderCageUnit(uId))}</div>
              <div className="space-y-3">{middleColumnMatrix.map(uId => renderCageUnit(uId))}</div>
              <div className="space-y-3">{rightColumnMatrix.map(uId => renderCageUnit(uId))}</div>
            </div>
            <div className="col-span-3 relative">
              <div className="absolute top-[15px] left-0 right-0 border border-amber-500 bg-amber-500/5 rounded-xl p-2 text-center text-[8px] font-bold text-amber-500 uppercase">🏠 Security House</div>
            </div>
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3>Pindah Benih</h3>
            <input type="number" placeholder="Unit" value={tfUnit} onChange={e => setTfUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-2 outline-none ${theme.input}`} />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setTfPetak('1')} className={`flex-1 h-11 rounded-xl border text-xs ${tfPetak === '1' ? 'bg-blue-600 text-white' : ''}`}>Petak 1</button>
              <button onClick={() => setTfPetak('2')} className={`flex-1 h-11 rounded-xl border text-xs ${tfPetak === '2' ? 'bg-blue-600 text-white' : ''}`}>Petak 2</button>
            </div>
            <input type="number" placeholder="Kuantiti" value={tfQty} onChange={e => setTfQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-2 outline-none ${theme.input}`} />
            <button onClick={() => handlePost({action:'pemindahan', date: new Date().toISOString().split('T')[0], unitId: parseInt(tfUnit), petak: tfPetak, size: tfSize, qty: parseInt(tfQty)})} className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl text-xs mt-4">Hantar</button>
          </div>
        )}

        {activeTab === 'mortality' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3>Log Kematian</h3>
            <input type="number" placeholder="Unit" value={mdUnit} onChange={e => setMdUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-2 outline-none ${theme.input}`} />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setMdPetak('1')} className={`flex-1 h-11 rounded-xl border text-xs ${mdPetak === '1' ? 'bg-red-600 text-white' : ''}`}>Petak 1</button>
              <button onClick={() => setMdPetak('2')} className={`flex-1 h-11 rounded-xl border text-xs ${mdPetak === '2' ? 'bg-red-600 text-white' : ''}`}>Petak 2</button>
            </div>
            <input type="number" placeholder="Kuantiti Mati" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-2 outline-none ${theme.input}`} />
            <button onClick={() => handlePost({action:'kematian', date: new Date().toISOString().split('T')[0], unitId: parseInt(mdUnit), petak: mdPetak, qty: parseInt(mdQty)})} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs mt-4">Simpan</button>
          </div>
        )}

        {activeTab === 'manager' && (
          <div className="space-y-4">
            {!isManagerUnlocked ? (
              <div className={`border p-8 rounded-2xl text-center flex flex-col items-center ${theme.card}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Manager Access PIN</h3>
                <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className={`h-11 text-center text-xl tracking-widest max-w-[150px] rounded-xl border outline-none ${theme.input}`} placeholder="••••" maxLength={4} />
                <button onClick={() => { if(pinInput === '3653') { setIsManagerUnlocked(true); setPinInput(''); fetchAllData(); } else alert("PIN Incorrect!"); }} className="w-full max-w-[150px] h-11 bg-blue-600 text-white font-bold rounded-xl mt-4 text-xs">Unlock</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`border p-4 rounded-xl flex justify-between items-center ${theme.card}`}>
                  <div>
                    <h3 className="text-xs font-black uppercase text-blue-500">Operation Status Log</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Start: June 8, 2026</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-600/10 text-blue-500 rounded-lg text-xs font-black">{getElapsedDays()} Days Elapsed</span>
                </div>

                <div className={`border p-4 rounded-xl ${theme.card}`}>
                  <h4 className="text-xs font-black uppercase text-blue-500 mb-3">🛠️ Initial Inventory Configuration</h4>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <input type="number" placeholder="Unit (1-24)" value={setupUnit} onChange={e => setSetupUnit(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border outline-none ${theme.input}`} />
                    <select value={setupPetak} onChange={e => setSetupPetak(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border text-white bg-neutral-900 outline-none ${theme.input}`}>
                      <option value="1">Petak 1</option>
                      <option value="2">Petak 2</option>
                    </select>
                    <input type="number" placeholder="Baseline Qty" value={setupQty} onChange={e => setSetupQty(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border outline-none ${theme.input}`} />
                  </div>
                  <button onClick={() => {
                    if(!setupUnit || !setupQty) return alert("Sila isi semua kotak.");
                    handlePost({ action: "setup_initial", unitId: parseInt(setupUnit), petak: setupPetak, qty: parseInt(setupQty) });
                    setSetupUnit(''); setSetupQty('');
                  }} className="w-full h-10 bg-blue-600 text-white font-bold text-xs rounded-lg">Save Configuration</button>
                </div>

                {/* THE MISSING ANALYTICS DASHBOARD CARD LIST SECTION */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Active Inventory Records</h3>
                  {Array.from({ length: 24 }, (_, i) => {
                    const uId = i + 1;
                    const p1 = calculateMetrics(uId, '1');
                    const p2 = calculateMetrics(uId, '2');

                    // Only show rows that actually contain data records to keep view clean
                    if (p1.totalEntered === 0 && p2.totalEntered === 0) return null;

                    return (
                      <div key={uId} className={`border p-4 rounded-xl space-y-3 ${theme.card}`}>
                        <div className="text-xs font-extrabold text-blue-400">Unit {uId} Metrics Summary</div>
                        <div className="grid grid-cols-2 gap-4 text-[11px] border-t pt-2 border-neutral-800">
                          <div className="space-y-1">
                            <span className="font-bold opacity-50 block text-[9px] uppercase">Petak 1</span>
                            <div>Total Spats: <b>{p1.totalEntered}</b></div>
                            <div>Total Dead: <b className="text-red-500">{p1.deadCount}</b></div>
                            <div>Live Balance: <b className="text-emerald-400">{p1.currentLive}</b></div>
                            <div>Survival Rate: <b className="text-blue-400">{p1.survivalRate}%</b></div>
                          </div>
                          <div className="space-y-1 border-l pl-4 border-neutral-800">
                            <span className="font-bold opacity-50 block text-[9px] uppercase">Petak 2</span>
                            <div>Total Spats: <b>{p2.totalEntered}</b></div>
                            <div>Total Dead: <b className="text-red-500">{p2.deadCount}</b></div>
                            <div>Live Balance: <b className="text-emerald-400">{p2.currentLive}</b></div>
                            <div>Survival Rate: <b className="text-blue-400">{p2.survivalRate}%</b></div>
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
