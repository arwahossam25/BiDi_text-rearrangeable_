import { useState, useEffect, useMemo } from 'react';
import { 
  AlignLeft, 
  AlignRight, 
  Clipboard, 
  Check, 
  ArrowRightLeft, 
  Info, 
  FileText, 
  Clock,
  Sparkles
} from 'lucide-react';

// Utilities & Components
import { RearrangeSettings, HistoryItem, ParagraphAnalysis } from './types';
import { processFullText, tokenizeText } from './utils/textRearranger';
import HistoryLog from './components/HistoryLog';

export default function App() {
  // Input raw text state
  const [inputText, setInputText] = useState<string>('');

  // App settings state
  const [settings, setSettings] = useState<RearrangeSettings>({
    mode: 'english-start',
    reverseArabicWords: true,
    reverseArabicCharacters: false,
    reverseEnglishWords: false,
    granularity: 'line',
    cleanDoubleSpaces: true,
    addBidiMarkers: true,
  });

  // Display alignment state of the output preview ('ltr' | 'rtl' | 'auto')
  const [outputAlignment, setOutputAlignment] = useState<'ltr' | 'rtl' | 'auto'>('auto');

  // Copy success indicator
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // History tracking state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Initialize history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bidi_rearrange_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load storage history', err);
    }
  }, []);

  // Compute text statistics of active input with percentage tracking
  const textStats = useMemo(() => {
    const rawVal = inputText || '';
    const tokens = tokenizeText(rawVal);
    const eng = tokens.filter(t => t.type === 'english').length;
    const ara = tokens.filter(t => t.type === 'arabic').length;
    const totalW = eng + ara;
    return {
      englishWords: eng,
      arabicWords: ara,
      totalChars: rawVal.length,
      englishPct: totalW > 0 ? Math.round((eng / totalW) * 100) : 0,
      arabicPct: totalW > 0 ? Math.round((ara / totalW) * 100) : 0
    };
  }, [inputText]);

  // Generate output live using the processing orchestrator
  const processedResult = useMemo(() => {
    if (!inputText.trim()) {
      return {
        originalText: '',
        rearrangedText: '',
        paragraphs: [] as ParagraphAnalysis[]
      };
    }
    return processFullText(inputText, settings);
  }, [inputText, settings]);

  // Auto-detect and set appropriate output alignment when input changes
  useEffect(() => {
    if (!inputText) return;
    if (settings.mode === 'english-start') {
      setOutputAlignment('ltr');
    } else {
      setOutputAlignment('rtl');
    }
  }, [settings.mode, inputText]);

  // Perform copy action and commit history item
  const handleCopyOutput = () => {
    if (!processedResult.rearrangedText) return;
    navigator.clipboard.writeText(processedResult.rearrangedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);

    // Save this successful rearrangement to history automatically
    const newItem: HistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      originalText: inputText,
      rearrangedText: processedResult.rearrangedText,
      mode: settings.mode,
    };

    const updatedHistory = [newItem, ...history.slice(0, 19)]; // limit to last 20
    setHistory(updatedHistory);
    try {
      localStorage.setItem('bidi_rearrange_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setInputText(item.originalText);
    setSettings(prev => ({
      ...prev,
      mode: item.mode
    }));
  };

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('bidi_rearrange_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    if (window.confirm('Do you want to clear your local history cache?')) {
      setHistory([]);
      localStorage.removeItem('bidi_rearrange_history');
    }
  };

  const handleClearAll = () => {
    setInputText('');
  };

  const updateSetting = <K extends keyof RearrangeSettings>(key: K, value: RearrangeSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-6 lg:p-8 flex flex-col gap-5 overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-300">
      
      {/* Visual background ambient gradient meshes */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-250px] left-[5%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute top-[-200px] right-[10%] w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-[150px]" />
      </div>

      {/* Bento-styled Header Section */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/10">
            <span className="font-bold text-xl text-white">אA</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              BiDi Flow Processor <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Bento v2.4</span>
            </h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold font-mono">
              Bidirectional Text Layout Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-full border border-slate-800/80">
          <div className="px-3.5 py-1 bg-slate-900 rounded-full border border-slate-800 text-[10px] font-mono text-blue-400 font-medium">
            v2.4.0-STABLE
          </div>
          <div className="px-3.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM ACTIVE
          </div>
        </div>
      </header>

      {/* Main Bento Grid layout */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-grow">
        
        {/* Bento Cell 1: Input Box (Large Column) */}
        <section id="bento-input-panel" className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col shadow-md transition-all duration-300 hover:border-slate-700/60">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              Source Mixed Buffer
            </span>
            {inputText && (
              <button 
                onClick={handleClearAll}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md transition-colors font-mono font-medium"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="relative flex-grow min-h-[220px]">
            <textarea 
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
              }}
              className="w-full h-full min-h-[220px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 leading-relaxed transition-all"
              placeholder="Paste mixed text here... e.g. Note: the document has been successfully signed as: مكتمل المستند. Please proceed to download."
              dir={settings.mode === 'arabic-start' ? 'rtl' : 'ltr'}
            />
            {!inputText && (
              <div className="absolute inset-4 pointer-events-none text-slate-600 text-xs leading-relaxed hidden sm:block">
                <span className="text-blue-400 font-bold">Directions</span>: Paste your jumbled bidirectional English and Arabic documents, notes, or AI outputs. Select the anchor rule block on the right to align the output correctly.
              </div>
            )}
          </div>

          <div className="mt-3 py-2 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 font-mono">
            <div className="flex items-center gap-3">
              <span>LENGTH: {textStats.totalChars} CHR</span>
              <span>WORDS: {inputText ? inputText.split(/\s+/).filter(Boolean).length : 0}</span>
            </div>
            {inputText && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  EN {textStats.englishPct}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  AR {textStats.arabicPct}%
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Bento Cell 2: Rules, Anchoring Options & Details */}
        <section id="bento-rule-panel" className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Active Rule 1 option */}
          <div 
            onClick={() => updateSetting('mode', 'english-start')}
            className={`flex-1 bg-slate-900 border rounded-2xl p-5 flex flex-col justify-center cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
              settings.mode === 'english-start' 
                ? 'border-blue-600/60 bg-blue-950/10' 
                : 'border-slate-800 opacity-65 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${settings.mode === 'english-start' ? 'text-blue-400' : 'text-slate-500'}`}>
                {settings.mode === 'english-start' ? 'Active Rule 1' : 'Option 1'}
              </span>
              <div className={`w-2 h-2 rounded-full ${settings.mode === 'english-start' ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></div>
            </div>
            
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-4 h-4 text-blue-400" />
              English-Lead Anchor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Scans left-to-right. Preserves English as the container anchor, then re-arranges the Arabic sentences cleanly between successive English phrases.
            </p>
            
            <div className="mt-auto">
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg text-[9px] font-mono border border-slate-800 text-slate-500 flex items-center justify-between">
                <span>Pattern structure:</span>
                <span className="text-blue-400">[ENG] &larr; [AR_TEXT] &rarr; [ENG]</span>
              </div>
            </div>
          </div>

          {/* Active Rule 2 option */}
          <div 
            onClick={() => updateSetting('mode', 'arabic-start')}
            className={`flex-1 bg-slate-900 border rounded-2xl p-5 flex flex-col justify-center cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
              settings.mode === 'arabic-start' 
                ? 'border-orange-500/60 bg-amber-950/10' 
                : 'border-slate-800 opacity-65 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${settings.mode === 'arabic-start' ? 'text-orange-400' : 'text-slate-500'}`}>
                {settings.mode === 'arabic-start' ? 'Active Rule 2' : 'Option 2'}
              </span>
              <div className={`w-2 h-2 rounded-full ${settings.mode === 'arabic-start' ? 'bg-orange-400 animate-pulse' : 'bg-slate-700'}`}></div>
            </div>
            
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
              <AlignRight className="w-4 h-4 text-orange-400" />
              Arabic-Lead Anchor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Scans right-to-left. Embeds English components inside Arabic bounds, respecting primary RTL flow while preventing reversed English words.
            </p>
            
            <div className="mt-auto">
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg text-[9px] font-mono border border-slate-800 text-slate-500 flex items-center justify-between">
                <span>Pattern structure:</span>
                <span className="text-orange-400">[ARA] &rarr; [EN_TEXT] &larr; [ARA]</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Cell 3: Live Corrected Output Area (Bottom Wide) */}
        <section id="bento-output-panel" className="lg:col-span-12 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Rearranged Output Stream
              </span>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-400/20 font-mono font-bold">
                AUTO-FORMATTING ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Output Alignment Control Toggle */}
              <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                <button
                  title="Force visual LTR layout preview"
                  onClick={() => setOutputAlignment('ltr')}
                  className={`p-1.5 rounded text-[10px] font-bold ${
                    outputAlignment === 'ltr' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Force visual RTL layout preview"
                  onClick={() => setOutputAlignment('rtl')}
                  className={`p-1.5 rounded text-[10px] font-bold ${
                    outputAlignment === 'rtl' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Adaptive layout direction preview"
                  onClick={() => setOutputAlignment('auto')}
                  className={`px-2 py-1 rounded text-[9px] uppercase font-mono font-semibold ${
                    outputAlignment === 'auto' ? 'bg-slate-800 text-amber-500' : 'text-slate-650 hover:text-slate-500'
                  }`}
                >
                  Auto
                </button>
              </div>

              {processedResult.rearrangedText && (
                <button 
                  onClick={handleCopyOutput}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-2 shadow-md shadow-blue-600/10 active:scale-[0.98]"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied & Saved!
                    </>
                  ) : (
                    <>
                      Copy Corrected Text
                      <Clipboard className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="w-full flex-grow bg-white rounded-xl p-5 text-slate-900 shadow-inner overflow-hidden min-h-[140px] flex flex-col justify-center border border-slate-200">
            {processedResult.rearrangedText ? (
              <p 
                className="text-base sm:text-lg leading-relaxed select-all break-words" 
                style={{ 
                  direction: outputAlignment === 'auto' 
                    ? (settings.mode === 'arabic-start' ? 'rtl' : 'ltr') 
                    : outputAlignment 
                }}
              >
                {processedResult.rearrangedText}
              </p>
            ) : (
              <p className="text-sm italic text-slate-500 text-center leading-loose">
                No output stream currently parsed. Paste text in the buffer box above to see corrected layout seamlessly.
              </p>
            )}
          </div>
        </section>

        {/* Bento Cell 4: Cache History Logs */}
        <section id="bento-history-panel" className="lg:col-span-12">
          <HistoryLog 
            items={history}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        </section>

      </main>

      {/* Styled Bento Info Footer */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 font-mono px-2 py-4 border-t border-slate-900">
        <span>LATENCY: 12ms</span>
        <span>ALGORITHM: BIDI-RECURSIVE-ANCHORING v2</span>
        <span>UTF-8 COMPLIANT</span>
      </footer>

    </div>
  );
}
