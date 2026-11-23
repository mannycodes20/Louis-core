import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Globe, X, ExternalLink, Sparkles } from 'lucide-react';
import { api, useApp } from '../context/AppContext';
import { orb, mono, raj } from '../theme';

const IDEAS = ['latest AI research', 'RTX 5070 benchmarks', 'Python 3.15 new features', 'best local LLMs'];

export function SearchPanel() {
  const { searchResults, setSearchResults, sendChat, setRightPanel } = useApp();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setError('');
    const r = await api<{ query: string; results: any[]; error?: string }>(`/api/search?q=${encodeURIComponent(q)}`).catch(() => null);
    setLoading(false);
    if (!r || r.error) { setError(r?.error ?? 'Search failed. Is the server running?'); return; }
    setSearchResults({ query: r.query, results: r.results });
  };

  const research = (q: string) => {
    sendChat(`Research this and give me a short summary with sources: ${q}`);
    setRightPanel('console');
  };

  const results = searchResults?.results ?? [];

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: '#0ea5e9' }} />
          <span style={{ ...orb, color: '#0ea5e9', fontSize: '11px', letterSpacing: '0.15em' }}>WEB SEARCH</span>
        </div>
        <span style={{ ...mono, color: 'rgba(34,197,94,0.7)', fontSize: '9px' }}>DUCKDUCKGO</span>
      </div>

      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-shrink-0" style={{ background: 'rgba(0,8,25,0.7)', border: '1px solid rgba(14,165,233,0.25)' }}>
        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(14,165,233,0.6)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query)}
          placeholder="Search the web..."
          className="flex-1 min-w-0 outline-none bg-transparent"
          style={{ ...raj, color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setSearchResults(null); }} className="cursor-pointer">
            <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => search(query)}
          className="px-2.5 py-1.5 rounded-lg cursor-pointer"
          style={{ background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.4)' }}
        >
          <span style={{ ...mono, color: '#0ea5e9', fontSize: '10px' }}>GO</span>
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(0,8,25,0.5)', border: '1px solid rgba(14,165,233,0.1)' }}>
                  <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="h-3 rounded mb-2" style={{ background: 'rgba(14,165,233,0.2)', width: '60%' }} />
                  <motion.div animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }} className="h-2 rounded" style={{ background: 'rgba(14,165,233,0.15)', width: '90%' }} />
                </div>
              ))}
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span style={{ ...mono, color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>{results.length} RESULTS FOR "{searchResults!.query.toUpperCase()}"</span>
                <button onClick={() => research(searchResults!.query)} className="flex items-center gap-1 cursor-pointer">
                  <Sparkles className="w-3 h-3" style={{ color: '#a855f7' }} />
                  <span style={{ ...mono, color: '#a855f7', fontSize: '9px' }}>ASK LOUIS TO SUMMARISE</span>
                </button>
              </div>
              {results.map((r, i) => (
                <motion.a
                  key={r.url + i}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="block rounded-xl p-3 group"
                  style={{ background: 'rgba(0,8,25,0.5)', border: '1px solid rgba(14,165,233,0.1)', textDecoration: 'none' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span style={{ ...raj, color: 'rgba(220,240,255,0.9)', fontSize: '13px' }}>{r.title}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#0ea5e9' }} />
                  </div>
                  <p style={{ ...raj, color: 'rgba(255,255,255,0.45)', fontSize: '11px', lineHeight: '1.5' }}>{r.snippet}</p>
                  <span className="block truncate mt-1.5" style={{ ...mono, color: 'rgba(14,165,233,0.6)', fontSize: '9px' }}>{r.url}</span>
                </motion.a>
              ))}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              {error && <p style={{ ...raj, color: '#ef4444', fontSize: '12px' }}>{error}</p>}
              <span style={{ ...mono, color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>TRY SEARCHING</span>
              <div className="flex flex-wrap gap-2">
                {IDEAS.map(t => (
                  <motion.button
                    key={t}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setQuery(t); search(t); }}
                    className="px-2.5 py-1.5 rounded-lg cursor-pointer"
                    style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}
                  >
                    <span style={{ ...mono, color: 'rgba(14,165,233,0.7)', fontSize: '10px' }}>{t}</span>
                  </motion.button>
                ))}
              </div>
              <p style={{ ...raj, color: 'rgba(255,255,255,0.35)', fontSize: '12px', lineHeight: 1.5 }}>
                When Louis researches something for you, his sources show up here too.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
