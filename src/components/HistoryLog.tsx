import { Clipboard, Check, Trash2, Calendar, Search } from 'lucide-react';
import { useState, MouseEvent } from 'react';
import { HistoryItem } from '../types';

interface HistoryLogProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryLog({ items, onSelect, onDelete, onClearAll }: HistoryLogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopy = (e: MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter(item => 
    item.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.rearrangedText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Local Layout History Cache</h3>
          <p className="text-xs text-slate-500 mt-0.5">Quickly retrieve previous parses stored locally</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[11px] font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center justify-center gap-1 self-start"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="relative mb-3">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search saved rearrangements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
          />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="rounded-lg bg-slate-950/20 py-8 text-center text-xs text-slate-600 border border-slate-900">
          {searchQuery ? 'No search results match' : 'No items found in history database'}
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="group relative flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-950/30 hover:bg-slate-900 hover:border-slate-700 transition-all duration-150 cursor-pointer"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${
                    item.mode === 'english-start' 
                      ? 'bg-sky-500/10 text-sky-400' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {item.mode === 'english-start' ? 'ENGLISH ANCHOR' : 'ARABIC ANCHOR'}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate leading-snug">
                  {item.rearrangedText}
                </p>
                <p className="text-[9px] text-slate-600 truncate mt-0.5">
                  Original: {item.originalText}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => handleCopy(e, item.rearrangedText, item.id)}
                  className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${
                    copiedId === item.id ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                  title="Copy output text"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Clipboard className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
