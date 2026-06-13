import React, { useState, useEffect } from 'react';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyE_bSUMWORC6N4SWe1BeAwTq8VokMRxeB74NQNuhmmHpsjCDHhGNQna4JEZXGzABStdg/exec";

const THEMES = {
  dark: { bg: 'bg-[#0F1115]', card: 'bg-[#161920] border-[#222630]', text: 'text-white', muted: 'text-gray-400', input: 'bg-[#1D212C] border-[#2E3545] text-white focus:border-blue-500', selectText: 'text-white', accent: '#3A86FF', success: 'border-emerald-500 bg-emerald-500/5', gridBg: 'bg-[#161920]' },
  light: { bg: 'bg-[#F4F6F9]', card: 'bg-white border-[#E4E7EB] shadow-sm', text: 'text-[#1F2937]', muted: 'text-gray-500', input: 'bg-white border-[#D1D5DB] text-[#1F2937] focus:border-blue-600', selectText: 'text-neutral-900', accent: '#0D6EFD', success: 'border-emerald-600 bg-emerald-600/5', gridBg: 'bg-white' }
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('layout'); 
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManagerUnlocked, setIsManagerUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const [cloudData, setCloudData] = useState({ setup: [], transfers: [], mortality: [], growth: [] });
  const [selectedCageUnit, setSelectedCageUnit] = useState(null);

  // Forms
  const [tfDate, setTfDate] = useState(new Date().toISOString().split('T')[0]);
  const [tfUnit, setTfUnit] = useState('');
  const [tfPetak, setTfPetak] = useState('1');
  const [tfSize, setTfSize] = useState('0.5 - 0.8');
  const [tfQty, setTfQty] = useState('');
  
  const [mortalityType, setMortalityType] = useState('harian'); 
  const [selectedBatchIdState, setSelectedBatchIdState] = useState('');
  const [mdUnit, setMdUnit] = useState('');
  const [mdPetak, setMdPetak] = useState('1');
  const [mdQty, setMdQty] = useState('');

  const [grUnit, setGrUnit] = useState('');
  const [grPetak, setGrPetak] = useState('1');
  const [currentSingleSampleInput, setCurrentSingleSampleInput] = useState('');
  const [localSampleList, setLocalSampleList] = useState([]);

  const [selectedOpsWeek, setSelectedOpsWeek] = useState(0);

  const theme = isDarkMode ? THEMES.dark : THEMES.light;

  const leftColumnMatrix =  [9,  10, 11, 12, 13, 14, 15, 16];
  const middleColumnMatrix = [1,  2,  3,  4,  17, 18, 19, 20];
  const rightColumnMatrix =  [5,  6,  7,  8,  21, 22, 23, 24];

  const EPOCH_START = new Date("2026-06-08T00:00:00");

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      setCloudData({ setup: data.setup || [], transfers: data.transfers || [], mortality: data.mortality || [], growth: data.growth || [] });
    } catch(e) {
      alert("Gagal memuatkan data dari cloud Google Sheet.");
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
    cloudData.transfers?.forEach(t => { totalInput += parseInt(t.qty || 0); totalDead += parseInt(t.postDead || 0); });
    cloudData.mortality?.forEach(m => totalDead += parseInt(m.qty || 0));
    const globalLive = Math.max(0, totalInput - totalDead);
    const globalSurvival = totalInput > 0 ? ((globalLive / totalInput) * 100).toFixed(1) : "100.0";
    return { totalInput, totalDead, globalLive, globalSurvival };
  };

  const getAverageGrowth = (unitId, petakNum) => {
    const logs = cloudData.growth?.filter(g => parseInt(g.unitId) === parseInt(unitId) && String(g.petak) === String(petakNum));
    if(!logs || logs.length === 0) return "Tiada rekod";
    let sum = 0;
    logs.forEach(l => sum += parseFloat(l.length));
    return (sum / logs.length).toFixed(1) + " cm";
  };

  const getElapsedDays = () => {
    const today = new Date();
    return Math.floor(Math.abs(today.getTime() - EPOCH_START.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getLiveOpsWeekNumber = () => {
    return Math.floor(getElapsedDays() / 7) + 1;
  };

  const getWeekRangeString = (weekNum) => {
    const targetStart = new Date(EPOCH_START.getTime());
    targetStart.setDate(targetStart.getDate() + (weekNum - 1) * 7);
    const targetEnd = new Date(targetStart.getTime());
    targetEnd.setDate(targetEnd.getDate() + 6);
    const options = { day: '2-digit', month: 'short' };
    return `${targetStart.toLocaleDateString('en-US', options)} - ${targetEnd.toLocaleDateString('en-US', options)}`;
  };

  const addSampleToList = (e) => {
    e.preventDefault();
    const val = parseFloat(currentSingleSampleInput);
    if (!val || val <= 0) return;
    setLocalSampleList([...localSampleList, val]);
    setCurrentSingleSampleInput('');
  };

  const getLocalListAverage = () => {
    if (localSampleList.length === 0) return "0.0";
    let sum = 0;
    localSampleList.forEach(v => sum += v);
    return (sum / localSampleList.length).toFixed(2);
  };

  const renderCageUnit = (uId) => {
    const m1 = calculateMetrics(uId, '1');
    const m2 = calculateMetrics(uId, '2');
    const combinedTotalLive = m1.currentLive + m2.currentLive;

    if (searchQuery && !`Unit ${uId}`.toLowerCase().includes(searchQuery.toLowerCase())) {
      return <div className="h-24 opacity-5 border border-dashed rounded-xl"></div>;
    }

    return (
      <div key={uId} onClick={() => setSelectedCageUnit(uId)} className={`border-2 rounded-2xl h-24 flex flex-col items-center justify-center cursor-pointer relative shadow-sm hover:border-blue-500 transition-all ${theme.gridBg} ${theme.success}`}>
        <div className="absolute top-2 left-3 text-[10px] font-extrabold tracking-tight opacity-40">U{uId}</div>
        <div className="text-lg font-black tracking-tight text-blue-500 mt-2">{combinedTotalLive}</div>
        <div className="text-[8px] uppercase tracking-widest font-bold opacity-40 mt-0.5">Live Spats</div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} pb-10 font-sans antialiased`}>
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center font-bold text-xs tracking-widest text-white">
          SYNCHRONIZING SECURE CLOUD STORAGE DATA...
        </div>
      )}

      {selectedCageUnit && (() => {
        const p1 = calculateMetrics(selectedCageUnit, '1');
        const p2 = calculateMetrics(selectedCageUnit, '2');
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedCageUnit(null)}>
            <div className={`w-full max-w-sm border-2 p-6 rounded-3xl shadow-2xl ${theme.card}`} onClick={e => e.stopPropagation()}>
              <h4 className="font-black text-sm uppercase text-blue-500 mb-4 border-b pb-2 tracking-wide">Unit {selectedCageUnit} Profile Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 bg-black/10 dark:bg-white/5 p-3 rounded-2xl border border-gray-500/10">
                  <span className="font-extrabold text-blue-400 block text-[9px] uppercase tracking-wider">Petak 1</span>
                  <div>Inflow Spats: <b className="float-right">{p1.totalEntered}</b></div>
                  <div>Mortality: <b className="float-right text-red-500">{p1.deadCount}</b></div>
                  <div className="text-emerald-400 font-extrabold border-t pt-1 mt-1">Live Balance: <span className="float-right">{p1.currentLive}</span></div>
                  <div className="text-[10px] opacity-60">Avg Length: <b className="float-right text-blue-400">{getAverageGrowth(selectedCageUnit, '1')}</b></div>
                </div>
                <div className="space-y-2 bg-black/10 dark:bg-white/5 p-3 rounded-2xl border border-gray-500/10">
                  <span className="font-extrabold text-blue-400 block text-[9px] uppercase tracking-wider">Petak 2</span>
                  <div>Inflow Spats: <b className="float-right">{p2.totalEntered}</b></div>
                  <div>Mortality: <b className="float-right text-red-500">{p2.deadCount}</b></div>
                  <div className="text-emerald-400 font-extrabold border-t pt-1 mt-1">Live Balance: <span className="float-right">{p2.currentLive}</span></div>
                  <div className="text-[10px] opacity-60">Avg Length: <b className="float-right text-blue-400">{getAverageGrowth(selectedCageUnit, '2')}</b></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <header className={`h-16 flex justify-between items-center px-6 border-b backdrop-blur-md sticky top-0 z-40 ${theme.card}`}>
        <div className="text-xs font-black tracking-widest uppercase">SEACAGE<span className="text-blue-500">OPS MASTER</span></div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-500/20">{isDarkMode ? '☀️ Light' : '🌙 Dark'}</button>
      </header>

      <div className="flex max-w-xl mx-auto my-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-gray-500/10 overflow-x-auto">
        <button onClick={() => setActiveTab('layout')} className={`flex-1 min-w-[85px] py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${activeTab === 'layout' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Layout Map</button>
        <button onClick={() => setActiveTab('transfer')} className={`flex-1 min-w-[85px] py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${activeTab === 'transfer' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Pindah Benih</button>
        <button onClick={() => setActiveTab('mortality')} className={`flex-1 min-w-[85px] py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${activeTab === 'mortality' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Log Kematian</button>
        <button onClick={() => setActiveTab('growth')} className={`flex-1 min-w-[85px] py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${activeTab === 'growth' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Pertumbuhan</button>
        <button onClick={() => { setActiveTab('manager'); if(isManagerUnlocked && selectedOpsWeek === 0) setSelectedOpsWeek(getLiveOpsWeekNumber()); }} className={`flex-1 min-w-[85px] py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${activeTab === 'manager' ? 'bg-blue-600 text-white shadow' : theme.muted}`}>Manager View</button>
      </div>

      <main className="max-w-xl mx-auto px-4">
        
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <input type="text" placeholder="🔍 Tapis No Unit (Contoh: Unit 4)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`h-11 rounded-xl px-4 border w-full text-xs outline-none transition-all ${theme.input}`} />
            
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-9 grid grid-cols-3 gap-3">
                <div className="space-y-3"><div className="text-[9px] font-bold tracking-wider uppercase text-center opacity-30">Left Row</div>{leftColumnMatrix.map(uId => renderCageUnit(uId))}</div>
                <div className="space-y-3"><div className="text-[9px] font-bold tracking-wider uppercase text-center opacity-30">Middle Row</div>{middleColumnMatrix.map(uId => renderCageUnit(uId))}</div>
                <div className="space-y-3"><div className="text-[9px] font-bold tracking-wider uppercase text-center opacity-30">Right Row</div>{rightColumnMatrix.map(uId => renderCageUnit(uId))}</div>
              </div>
              <div className="col-span-3 relative pt-6">
                <div className="border-2 border-amber-500/40 bg-amber-500/5 rounded-2xl p-2.5 text-center text-[8px] font-black text-amber-500 uppercase tracking-widest leading-normal">🏠 Security House</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className={`border p-6 rounded-3xl ${theme.card}`}>
            <h3 className="text-xs font-black uppercase tracking-wider mb-4 text-blue-500">Pindah Benih Baru</h3>
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Tarikh Pemindahan</label>
            <input type="date" value={tfDate} onChange={e => setTfDate(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 mb-3 text-xs ${theme.input}`} />
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Unit Target (1-24)</label>
                <input type="number" inputMode="numeric" placeholder="Ex: 1" value={tfUnit} onChange={e => setTfUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pilih Petak</label>
                <div className="flex gap-2 mt-1">
                  {['1', '2'].map(p => (
                    <button key={p} onClick={() => setTfPetak(p)} className={`flex-1 h-11 rounded-xl font-bold border text-xs transition-all ${tfPetak === p ? 'bg-blue-600 text-white border-transparent' : ''}`}>Petak {p}</button>
                  ))}
                </div>
              </div>
            </div>

            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Julat Saiz Benih</label>
            <div className="flex gap-2 mt-1 mb-3">
              {['0.5 - 0.8', '0.9 ke atas'].map(sz => (
                <button key={sz} onClick={() => setTfSize(sz)} className={`flex-1 h-11 rounded-xl font-bold border text-xs transition-all ${tfSize === sz ? 'bg-blue-600 text-white border-transparent' : ''}`}>{sz}</button>
              ))}
            </div>

            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Kuantiti Benih (Spat Qty)</label>
            <input type="number" inputMode="numeric" placeholder="Contoh: 3000" value={tfQty} onChange={e => setTfQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 outline-none ${theme.input}`} />
            <button onClick={() => handlePost({action:'pemindahan', batchId: 'B-' + Date.now(), date: tfDate, unitId: parseInt(tfUnit), petak: tfPetak, size: tfSize, qty: parseInt(tfQty)})} className="w-full h-12 bg-blue-600 text-white font-extrabold rounded-xl text-xs mt-5 shadow-lg">Hantar Rekod Pemindahan</button>
          </div>
        )}

        {activeTab === 'mortality' && (
          <div className={`border p-6 rounded-3xl ${theme.card}`}>
            <h3 className="text-xs font-black uppercase mb-4 text-red-500 tracking-wider">Kemasukan Rekod Kematian</h3>
            <div className="flex gap-2 mb-4 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-gray-500/10">
              <button onClick={() => setMortalityType('harian')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${mortalityType === 'harian' ? 'bg-red-600 text-white shadow' : ''}`}>Routine Harian</button>
              <button onClick={() => setMortalityType('pasca')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg ${mortalityType === 'pasca' ? 'bg-red-600 text-white shadow' : ''}`}>Mortaliti Pasca-Transfer</button>
            </div>

            {mortalityType === 'harian' ? (
              <div className="space-y-3">
                <input type="number" inputMode="numeric" placeholder="Unit Sangkar (1-24)" value={mdUnit} onChange={e => setMdUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl outline-none ${theme.input}`} />
                <div className="flex gap-2">
                  <button onClick={() => setMdPetak('1')} className={`flex-1 h-11 rounded-xl border text-xs transition-all ${mdPetak === '1' ? 'bg-red-600 text-white border-transparent' : ''}`}>Petak 1</button>
                  <button onClick={() => setMdPetak('2')} className={`flex-1 h-11 rounded-xl border text-xs transition-all ${mdPetak === '2' ? 'bg-red-600 text-white border-transparent' : ''}`}>Petak 2</button>
                </div>
                <input type="number" inputMode="numeric" placeholder="Kuantiti Mati Ditemui" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl outline-none ${theme.input}`} />
                <button onClick={() => handlePost({action:'kematian', date: new Date().toISOString().split('T')[0], unitId: parseInt(mdUnit), petak: mdPetak, qty: parseInt(mdQty)})} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs mt-3 shadow">Simpan Kematian Harian</button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pilih Batch Asal Terkini</label>
                <select value={selectedBatchIdState} onChange={e => setSelectedBatchIdState(e.target.value)} className={`w-full h-11 border px-3 rounded-xl text-xs bg-neutral-900 outline-none ${theme.input} ${theme.selectText}`}>
                  <option value="">-- Sila Pilih Batch Sedia Ada --</option>
                  {cloudData.transfers?.map((t, idx) => (
                    <option key={idx} value={t.id}>Unit {t.unitId} (P{t.petak}) - Qty: {t.qty} [{t.date}]</option>
                  ))}
                </select>
                <input type="number" inputMode="numeric" placeholder="Jumlah Mati Pasca-Transfer (1-3 Hari)" value={mdQty} onChange={e => setMdQty(e.target.value)} className={`w-full h-11 border px-3 rounded-xl outline-none ${theme.input}`} />
                <button onClick={() => {
                  if(!selectedBatchIdState) return alert("Sila pilih batch!");
                  handlePost({ action: "update_post_dead", batchId: selectedBatchIdState, qty: parseInt(mdQty) });
                  setSelectedBatchIdState(''); setMdQty('');
                }} className="w-full h-12 bg-red-600 text-white font-bold rounded-xl text-xs shadow-lg">Kemaskini & Kira %</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'growth' && (
          <div className={`border p-6 rounded-3xl ${theme.card}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-xs font-black uppercase text-emerald-500 tracking-wider">Kadar Pertumbuhan Abalone</h3>
                <p className="text-[11px] opacity-50">Sila ukur saiz sampel dalam unit sentimeter (cm).</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl font-black bg-emerald-500/10 text-emerald-500 text-[11px] whitespace-nowrap">{localSampleList.length} Sampel Terkumpul</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4 border-b border-gray-500/10 pb-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Unit Sangkar</label>
                <input type="number" inputMode="numeric" disabled={localSampleList.length > 0} placeholder="1-24" value={grUnit} onChange={e => setGrUnit(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input} disabled:opacity-40`} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Petak</label>
                <div className="flex gap-2 mt-1">
                  {['1', '2'].map(p => (
                    <button key={p} disabled={localSampleList.length > 0} onClick={() => setGrPetak(p)} className={`flex-1 h-11 rounded-xl font-bold border text-xs transition-all disabled:opacity-40 ${grPetak === p ? 'bg-emerald-600 text-white border-transparent' : ''}`}>Petak {p}</button>
                  ))}
                </div>
              </div>
            </div>

            {localSampleList.length > 0 && (
              <div className="p-3 bg-black/10 dark:bg-white/5 border border-dashed border-gray-500/20 rounded-xl mb-4 flex justify-between items-center text-xs">
                <div>Purata Saiz Batch Semasa: <b className="text-blue-500 text-sm">{getLocalListAverage()} cm</b></div>
                <button onClick={() => setLocalSampleList([])} className="text-[10px] bg-red-600/10 text-red-500 px-2 py-0.5 rounded-md font-bold">Padam Semua</button>
              </div>
            )}

            <form onSubmit={addSampleToList} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Ukur Saiz Sampel Berikutnya (cm)</label>
                <input type="number" step="0.01" inputMode="decimal" placeholder="Contoh: 4.5" value={currentSingleSampleInput} onChange={e => setCurrentSingleSampleInput(e.target.value)} className={`w-full h-11 border px-3 rounded-xl mt-1 text-xs outline-none ${theme.input}`} />
              </div>
              <button type="submit" className="h-11 px-5 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded-xl text-xs whitespace-nowrap">Tambah</button>
            </form>

            {localSampleList.length > 0 && (
              <div className="mt-4 p-2 bg-black/5 dark:bg-black/20 rounded-xl max-h-24 overflow-y-auto flex flex-wrap gap-1.5 border border-gray-500/5">
                {localSampleList.map((s, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded bg-blue-600/10 text-blue-400 font-bold">#{i+1}: {s} cm</span>
                ))}
              </div>
            )}
            
            <button disabled={localSampleList.length < 1 || !grUnit} onClick={() => {
              handlePost({ action: "growth_batch_log", unitId: parseInt(grUnit), petak: grPetak, samples: localSampleList });
              setLocalSampleList([]); setGrUnit('');
            }} className="w-full h-12 bg-emerald-600 disabled:bg-neutral-800 text-white font-extrabold rounded-xl text-xs mt-5 shadow-md disabled:opacity-40">
              🚀 Hantar Semua {localSampleList.length} Sampel ke Cloud
            </button>
          </div>
        )}

        {/* TAB 5: DUAL TRANSLATED HIGH-END ENHANCED MANAGER HUB */}
        {activeTab === 'manager' && (
          <div className="space-y-6">
            {!isManagerUnlocked ? (
              <div className={`border p-8 rounded-3xl text-center flex flex-col items-center ${theme.card}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Manager Access PIN / 관리자 인증</h3>
                <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className={`h-11 text-center text-xl tracking-widest max-w-[150px] rounded-xl border outline-none ${theme.input}`} placeholder="••••" maxLength={4} />
                <button onClick={() => { if(pinInput === '3653') { setIsManagerUnlocked(true); setPinInput(''); setSelectedOpsWeek(getLiveOpsWeekNumber()); } else alert("PIN Incorrect / 비밀번호 오류!"); }} className="w-full max-w-[150px] h-11 bg-blue-600 text-white font-bold rounded-xl mt-4 text-xs">Unlock / 인증</button>
              </div>
            ) : (() => {
              const global = getGlobalMetrics();
              const maxActiveWeeks = getLiveOpsWeekNumber();

              return (
                <div className="space-y-6">
                  
                  {/* CARD 1: GLOBAL KPIs / 글로벌 핵심 지표 */}
                  <div className={`border p-6 rounded-3xl grid grid-cols-3 gap-4 text-center shadow-sm ${theme.card}`}>
                    <div className="border-r border-gray-500/10 py-1">
                      <span className="text-[9px] uppercase font-black tracking-wider opacity-40 block mb-0.5">Total Spats<br/>총 치패량</span>
                      <span className="text-xl font-black tracking-tight">{global.totalInput}</span>
                    </div>
                    <div className="border-r border-gray-500/10 py-1">
                      <span className="text-[9px] uppercase font-black tracking-wider opacity-40 block mb-0.5">Mortality<br/>총 폐사량</span>
                      <span className="text-xl font-black text-rose-500 tracking-tight">{global.totalDead}</span>
                    </div>
                    <div className="py-1">
                      <span className="text-[9px] uppercase font-black tracking-wider opacity-40 block mb-0.5">Survival %<br/>생존율</span>
                      <span className="text-xl font-black text-emerald-400 tracking-tight">{global.globalSurvival}%</span>
                    </div>
                  </div>

                  {/* TIMELINE LOGGER BOX */}
                  <div className={`border p-4 rounded-2xl flex justify-between items-center ${theme.card}`}>
                    <div>
                      <h3 className="text-xs font-black uppercase text-blue-500">Operation Status Log / 운영 상태 로그</h3>
                      <p className="text-[10px] opacity-40 mt-0.5">Start Date / 시작일: June 8, 2026</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-lg text-xs font-black">{getElapsedDays()} Days Elapsed / 일 경과</span>
                  </div>

                  {/* CARD 2: TIMELINE SELECTOR / 주차별 아카이브 선택 */}
                  <div className={`border p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${theme.card}`}>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-500">Historical Archive Timeline / 과거 이력 타임라인</h4>
                      <p className="text-[11px] opacity-40 mt-0.5">Select operational 7-day windows / 7일 단위 운영 주차를 선택하세요.</p>
                    </div>
                    <div className="w-full md:w-auto min-w-[220px]">
                      <select 
                        value={selectedOpsWeek} 
                        onChange={e => setSelectedOpsWeek(parseInt(e.target.value))} 
                        className={`w-full h-11 border px-3 rounded-xl text-xs font-bold outline-none bg-neutral-900 ${theme.input} ${theme.selectText}`}
                      >
                        {Array.from({ length: maxActiveWeeks }, (_, idx) => {
                          const wNum = idx + 1;
                          return (
                            <option key={wNum} value={wNum} className={theme.selectText}>
                              Week {wNum} ({getWeekRangeString(wNum)}) {wNum === maxActiveWeeks ? '— [ Live Week / 현재 주차 ]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* CARD 3: WEEKLY REPORT CARD STACK / 주차별 배치 리포트 */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 pl-1">
                      Batch Logs: Ops Week {selectedOpsWeek} / 배치 로그: 운영 {selectedOpsWeek}주차
                    </h3>
                    
                    {(() => {
                      const selectedWeeklyBatches = cloudData.transfers?.filter(t => {
                        const batchDate = new Date(t.date);
                        const diffTime = batchDate.getTime() - EPOCH_START.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        const calculatedWeek = Math.floor(diffDays / 7) + 1;
                        return calculatedWeek === selectedOpsWeek;
                      });

                      if (!selectedWeeklyBatches || selectedWeeklyBatches.length === 0) {
                        return (
                          <div className={`border p-8 rounded-2xl text-center text-xs opacity-40 font-medium ${theme.card}`}>
                            Tiada rekod / No records registered in this operational week bracket.<br/>해당 운영 주차에 등록된 배치 이력이 없습니다.
                          </div>
                        );
                      }

                      return selectedWeeklyBatches.map((t, idx) => {
                        const lossPct = t.qty > 0 ? ((t.postDead / t.qty) * 100).toFixed(1) : "0.0";
                        const isHighLoss = parseFloat(lossPct) >= 5.0;

                        return (
                          <div key={idx} className={`border p-5 rounded-2xl flex justify-between items-center shadow-sm hover:border-blue-500/30 transition-all ${theme.card}`}>
                            <div className="space-y-1">
                              <div className="text-xs font-black tracking-tight flex items-center gap-2">
                                Unit {t.unitId} — Petak {t.petak}
                                <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 font-bold rounded-md border ${isHighLoss ? theme.danger : theme.success}`}>
                                  {lossPct}% Loss / 손실률
                                </span>
                              </div>
                              <div className="text-[11px] opacity-40">
                                Date / 이송일: <b className="font-semibold">{t.date}</b> | Size / 규격: <b className="font-semibold">{t.size || "1.15 cm"}</b>
                              </div>
                            </div>
                            <div className="text-right space-y-0.5">
                              <div className="text-[10px] uppercase font-bold opacity-30 tracking-wider">Post-Transfer Mortality / 이송 후 폐사</div>
                              <div className="text-sm font-black">{t.postDead} <span className="text-[10px] font-bold opacity-40">dead / 미</span></div>
                              <div className="text-[10px] font-bold opacity-50">from {t.qty} spats / 총 {t.qty} 미 중</div>
                            </div>
                          </div>
                        );
                      });
                    })()}
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
