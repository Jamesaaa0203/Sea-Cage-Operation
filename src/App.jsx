import React, { useState, useEffect } from 'react';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2jrJkyHH0LO0h9aXcsgjPhEp_dgmszAqPG5D5mZjr8jBPGT9ASqIWFrD4VIgqfXDGXQ/exec";

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
  const [selectedCageUnit, setSelectedCageUnit] = useState(null);

  // Forms
  const [tfDate, setTfDate] = useState(new Date().toISOString().split('T')[0]);
  const [tfUnit, setTfUnit] = useState('');
  const [tfPetak, setTfPetak] = useState('1');
  const [tfSize, setTfSize] = useState('0.5 - 0.8');
  const [tfQty, setTfQty] = useState('');
  
  const [mortalityType, setMortalityType] = useState('harian'); 
  const [selectedBatchIdx, setSelectedBatchIdx] = useState('');
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
    setIsLoading(true);
    try {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      setCloudData({ setup: data.setup || [], transfers: data.transfers || [], mortality: data.mortality || [] });
    } catch(e) {
      alert("Gagal memuatkan data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handlePost = async (payload) => {
    setIsLoading(true);
    try {
      await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      alert("Berjaya diproses!");
      await fetchAllData();
    } catch (e) {
      alert("Ralat cloud.");
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
      deadCount += parseInt(t.postDead || 0);
    });

    cloudData.mortality?.filter(m => parseInt(m.unitId) === parseInt(unitId) && String(m.petak) === String(petakNum)).forEach(m => {
      deadCount += parseInt(m.qty || 0);
    });

    const totalEntered = initialBaseline + transferredIn;
    const currentLive = Math.max(0, totalEntered - deadCount);
    const survivalRate = totalEntered > 0 ? ((currentLive / totalEntered) * 100).toFixed(1) : "100.0";

    return { totalEntered, deadCount, currentLive, survivalRate };
  };

  const getGlobalMetrics = () => {
    let totalInput = 0;
    let totalDead = 0;

    cloudData.setup?.forEach(s => totalInput += parseInt(s.initialQty || 0));
    cloudData.transfers?.forEach(t => {
      totalInput += parseInt(t.qty || 0);
      totalDead += parseInt(t.postDead || 0);
    });
    cloudData.mortality?.forEach(m => totalDead += parseInt(m.qty || 0));

    const globalLive = Math.max(0, totalInput - totalDead);
    const globalSurvival = totalInput > 0 ? ((globalLive / totalInput) * 100).toFixed(1) : "100.0";

    return { totalInput, totalDead, globalLive, globalSurvival };
  };

  const renderCageUnit = (uId) => {
    const m1 = calculateMetrics(uId, '1');
    const m2 = calculateMetrics(uId, '2');
    const combinedTotalLive = m1.currentLive + m2.currentLive;

    if (searchQuery && !`Unit ${uId}`.toLowerCase().includes(searchQuery.toLowerCase())) {
      return <div className="h-24 opacity-10 border border-dashed rounded-xl"></div>;
    }

    return (
      <div key={uId} onClick={() => setSelectedCageUnit(uId)} className={`border-2 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 ${theme.gridBg} ${theme.success}`}>
        <div className="text-[10px] font-black opacity-40 absolute top-1">Unit {uId}</div>
        <div className="text-sm font-black text-blue-500 mt-2">{combinedTotalLive}</div>
        <div className="text-[8px] uppercase tracking-wider opacity-50 mt-0.5">Live Spats</div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} pb-10`}>
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center font-black text-xs text-white">
          LOADING REALTIME OPERATION METRICS...
        </div>
      )}

      {/* Step-In Popup Modal breakdown for individual components */}
      {selectedCageUnit && (() => {
        const p1 = calculateMetrics(selectedCageUnit, '1');
        const p2 = calculateMetrics(selectedCageUnit, '2');
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedCageUnit(null)}>
            <div className={`w-full max-w-sm border p-6 rounded-3xl ${theme.card}`} onClick={e => e.stopPropagation()}>
              <h4 className="font-black text-xs uppercase text-blue-500 mb-4 border-b pb-2">Unit {selectedCageUnit} Topology Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-dashed border-gray-500/20">
                  <span className="font-bold text-blue-400 block text-[9px] uppercase tracking-wide">Petak 1</span>
                  <div>Total Inflow: <b>{p1.totalEntered}</b></div>
                  <div>Mortality: <b className="text-red-500">{p1.deadCount}</b></div>
                  <div className="text-emerald-400 font-bold">Live: {p1.currentLive}</div>
                  <div className="text-[10px] opacity-70">Survival: {p1.survivalRate}%</div>
                </div>
                <div className="space-y-1.5 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-dashed border-gray-500/20">
                  <span className="font-bold text-blue-400 block text-[9px] uppercase tracking-wide">Petak 2</span>
                  <div>Total Inflow: <b>{p2.totalEntered}</b></div>
                  <div>Mortality: <b className="text-red-500">{p2.deadCount}</b></div>
                  <div className="text-emerald-400 font-bold">Live: {p2.currentLive}</div>
                  <div className="text-[10px] opacity-70">Survival: {p2.survivalRate}%</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <header className={`h-16 flex justify-between items-center px-6 border-b ${theme.card}`}>
        <div className="text-sm font-black tracking-wider">SEACAGE<span>TOPOLOGY</span></div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[9px] font-bold px-3 py-1.5 rounded-full border">{isDarkMode ? '🌙 Dark' : '☀️ Light'}</button>
      </header>

      <div className="flex max-w-xl mx-auto my-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border">
        <button onClick={() => setActiveTab('layout')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'layout' ? 'bg-blue-600 text-white' : theme.muted}`}>Layout Map</button>
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'transfer' ? 'bg-blue-600 text-white' : theme.muted}`}>Pindah Benih</button>
        <button onClick={() => setActiveTab('mortality')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'mortality' ? 'bg-blue-600 text-white' : theme.muted}`}>Log Kematian</button>
        <button onClick={() => setActiveTab('manager')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${activeTab === 'manager' ? 'bg-blue-600 text-white' : theme.muted}`}>Manager View</button>
      </div>

      <main className="max-w-xl mx-auto px-4">
        
        {activeTab === 'layout' && (
          <div className="space-y-3">
            <input type="text" placeholder="🔍 Tapis No Unit (Contoh: Unit 4)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`h-11 rounded-xl px-4 border w-full text-xs outline-none ${theme.input}`} />
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
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-blue-500">Pindah Benih Baru</h3>
            <label className="text-[10px] font-bold text-gray-400">Pilih Tarikh Pemindahan</label>
            <input type="date" value={tfDate} onChange={e => setTfDate(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 mb-2 text-xs ${theme.input}`} />
            <input type="number" placeholder="Unit Target (1-24)" value={tfUnit} onChange={e => setTfUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 outline-none ${theme.input}`} />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setTfPetak('1')} className={`flex-1 h-11 rounded-xl border text-xs ${tfPetak === '1' ? 'bg-blue-600 text-white' : ''}`}>Petak 1</button>
              <button onClick={() => setTfPetak('2')} className={`flex-1 h-11 rounded-xl border text-xs ${tfPetak === '2' ? 'bg-blue-600 text-white' : ''}`}>Petak 2</button>
            </div>
            <input type="number" placeholder="Kuantiti Benih" value={tfQty} onChange={e => setTfQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-3 outline-none ${theme.input}`} />
            <button onClick={() => handlePost({action:'pemindahan', batchId: 'B-' + Date.now(), date: tfDate, unitId: parseInt(tfUnit), petak: tfPetak, size: tfSize, qty: parseInt(tfQty)})} className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl text-xs mt-4">Hantar Rekod</button>
          </div>
        )}

        {activeTab === 'mortality' && (
          <div className={`border p-5 rounded-2xl ${theme.card}`}>
            <h3 className="text-xs font-black uppercase mb-4 text-red-500">Kemasukan Rekod Kematian</h3>
            <div className="flex gap-2 mb-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border">
              <button onClick={() => setMortalityType('harian')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${mortalityType === 'harian' ? 'bg-red-600 text-white' : ''}`}>Kematian Routine Harian</button>
              <button onClick={() => setMortalityType('pasca')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${mortalityType === 'pasca' ? 'bg-red-600 text-white' : ''}`}>Mortaliti Pasca-Transfer</button>
            </div>

            {mortalityType === 'harian' ? (
              <div className="space-y-3">
                <input type="number" placeholder="Unit" value={mdUnit} onChange={e => setMdUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl outline-none ${theme.input}`} />
                <div className="flex gap-2">
                  <button onClick={() => setMdPetak('1')} className={`flex-1 h-11 rounded-xl border text-xs ${mdPetak === '1' ? 'bg-red-600 text-white' : ''}`}>Petak 1</button>
                  <button onClick={() => setMdPetak('2')} className={`flex-1 h-11 rounded-xl border text-xs ${mdPetak === '2' ? 'bg-red-600 text-white' : ''}`}>Petak 2</button>
                </div>
                <input type="number" placeholder="Kuantiti Mati" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl outline-none ${theme.input}`} />
                <button onClick={() => handlePost({action:'kematian', date: new Date().toISOString().split('T')[0], unitId: parseInt(mdUnit), petak: mdPetak, qty: parseInt(mdQty)})} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs mt-2">Simpan Kematian Harian</button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400">Pilih Batch Asal</label>
                <select value={selectedBatchIdx} onChange={e => setSelectedBatchIdx(e.target.value)} className={`w-full h-11 border px-3 rounded-xl text-xs bg-neutral-900 ${theme.input}`}>
                  <option value="">-- Sila Pilih Batch Sedia Ada --</option>
                  {cloudData.transfers?.map((t, idx) => (
                    <option key={idx} value={idx}>Unit {t.unitId} (P{t.petak}) - {t.qty} spats [{t.date}]</option>
                  ))}
                </select>
                <input type="number" placeholder="Jumlah Mati Pasca-Transfer (1-3 Hari)" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl outline-none ${theme.input}`} />
                <button onClick={() => {
                  const targetBatch = cloudData.transfers[selectedBatchIdx];
                  if(!targetBatch) return alert("Pilih batch dahulu!");
                  handlePost({ action: "update_post_dead", batchId: targetBatch.id, qty: parseInt(mdQty) });
                  setSelectedBatchIdx(''); setMdQty('');
                }} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs">Kemaskini & Kira %</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manager' && (
          <div className="space-y-4">
            {!isManagerUnlocked ? (
              <div className={`border p-8 rounded-2xl text-center flex flex-col items-center ${theme.card}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Manager Access PIN</h3>
                <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className={`h-11 text-center text-xl tracking-widest max-w-[150px] rounded-xl border outline-none ${theme.input}`} placeholder="••••" maxLength={4} />
                <button onClick={() => { if(pinInput === '3653') { setIsManagerUnlocked(true); setPinInput(''); } else alert("PIN Incorrect!"); }} className="w-full max-w-[150px] h-11 bg-blue-600 text-white font-bold rounded-xl mt-4 text-xs">Unlock</button>
              </div>
            ) : (() => {
              const global = getGlobalMetrics();
              return (
                <div className="space-y-4">
                  {/* GLOBAL COLLAPSED MANAGER METRICS CARDS */}
                  <div className={`border p-5 rounded-2xl grid grid-cols-2 gap-4 ${theme.card}`}>
                    <div className="col-span-2 text-center border-b pb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-50 block">Global Farm Survival Rate</span>
                      <span className="text-3xl font-black text-emerald-400">{global.globalSurvival}%</span>
                    </div>
                    <div className="border-r border-neutral-800 pr-2">
                      <span className="text-[9px] uppercase tracking-wide opacity-50 block">Total Inputted Spats</span>
                      <span className="text-lg font-bold">{global.totalInput}</span>
                    </div>
                    <div className="pl-2">
                      <span className="text-[9px] uppercase tracking-wide opacity-50 block">Total Dead Count</span>
                      <span className="text-lg font-bold text-red-500">{global.totalDead}</span>
                    </div>
                  </div>

                  {/* INITIAL SETUP DESIGN PLATFORM */}
                  <div className={`border p-4 rounded-xl ${theme.card}`}>
                    <h4 className="text-xs font-black uppercase text-blue-500 mb-3">🛠️ Initial Inventory Setup</h4>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <input type="number" placeholder="Unit" value={setupUnit} onChange={e => setSetupUnit(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border outline-none ${theme.input}`} />
                      <select value={setupPetak} onChange={e => setSetupPetak(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border text-white bg-neutral-900 outline-none ${theme.input}`}>
                        <option value="1">Petak 1</option>
                        <option value="2">Petak 2</option>
                      </select>
                      <input type="number" placeholder="Qty Baseline" value={setupQty} onChange={e => setSetupQty(e.target.value)} className={`h-10 text-xs px-2 rounded-lg border outline-none ${theme.input}`} />
                    </div>
                    <button onClick={() => {
                      if(!setupUnit || !setupQty) return alert("Sila isi.");
                      handlePost({ action: "setup_initial", unitId: parseInt(setupUnit), petak: setupPetak, qty: parseInt(setupQty) });
                      setSetupUnit(''); setSetupQty('');
                    }} className="w-full h-10 bg-blue-600 text-white font-bold text-xs rounded-lg">Save Configuration</button>
                  </div>

                  {/* REAL-TIME INDIVIDUAL BATCH MORTALITY PERCENTAGE SUMMARY BOXES */}
                  <div className={`border p-4 rounded-xl ${theme.card}`}>
                    <h4 className="text-xs font-black uppercase text-gray-400 mb-3">Post-Transfer Batch Metrics</h4>
                    <div className="divide-y divide-neutral-800 space-y-2">
                      {cloudData.transfers?.map((t, idx) => {
                        const lossPct = t.qty > 0 ? ((t.postDead / t.qty) * 100).toFixed(1) : "0.0";
                        return (
                          <div key={idx} className="flex justify-between items-center pt-2 text-xs">
                            <div>
                              <div className="font-bold">Unit {t.unitId} - Petak {t.petak}</div>
                              <div className="text-[10px] text-gray-500">{t.date} | Batch Input: {t.qty}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400 font-bold">{t.postDead} Dead</div>
                              <div className={`text-[10px] font-black ${parseFloat(lossPct) > 5.0 ? 'text-red-500' : 'text-emerald-400'}`}>{lossPct}% Loss Rate</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </main>
    </div>
  );
}
