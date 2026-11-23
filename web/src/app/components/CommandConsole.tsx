import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Send, Trash2, Wrench, Mic } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { orb, mono, raj } from '../theme';

const SUGGESTIONS = ['what can you do?', 'scan my desktop', 'how is my PC doing?', 'latest AI news'];

/** Shows plain text, with ``` code blocks in a monospace box. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/```(?:\w+)?\n?/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="my-1.5 p-2 rounded-lg overflow-x-auto" style={{ ...mono, fontSize: '11px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,245,255,0.12)', color: '#bdf6ff' }}>{p.trimEnd()}</pre>
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.replace(/\*\*(.+?)\*\*/g, '$1')}</span>
        ),
      )}
    </>
  );
}

export function CommandConsole() {
  const { messages, sendChat, aiState, clearChat } = useApp();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = aiState === 'processing' || aiState === 'responding';
  const thinking = aiState === 'processing' && !messages[messages.length - 1]?.streaming;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSubmit = () => {
    if (!input.trim() || busy) return;
    sendChat(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" style={{ color: '#00f5ff' }} />
          <span style={{ ...orb, color: '#00f5ff', fontSize: '11px', letterSpacing: '0.15em' }}>COMMAND CONSOLE</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={clearChat}
          title="New conversation"
          className="p-1.5 rounded-lg cursor-pointer"
          style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.12)' }}
        >
          <Trash2 className="w-3 h-3" style={{ color: 'rgba(0,245,255,0.5)' }} />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {messages.length === 0 && (
          <p style={{ ...raj, color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: 1.5 }}>
            Type below or say “Louis” to start. Louis can research the web, remember things about you, check your PC and tidy your Desktop.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map(msg =>
            msg.type === 'tool' ? (
              <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pl-8">
                <Wrench className="w-3 h-3" style={{ color: '#f59e0b' }} />
                <span style={{ ...mono, color: 'rgba(245,158,11,0.8)', fontSize: '10px' }}>{msg.text}</span>
              </motion.div>
            ) : (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'ai' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', boxShadow: '0 0 8px rgba(0,245,255,0.2)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00f5ff' }} />
                  </div>
                )}
                <div
                  className="max-w-[85%] min-w-0 px-3.5 py-2.5"
                  style={msg.type === 'ai'
                    ? { background: 'rgba(0, 245, 255, 0.05)', border: '1px solid rgba(0,245,255,0.2)', boxShadow: '0 0 12px rgba(0,245,255,0.05)', borderRadius: '4px 16px 16px 16px' }
                    : { background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 0 12px rgba(168,85,247,0.08)', borderRadius: '16px 4px 16px 16px' }}
                >
                  <div style={{ ...raj, color: msg.type === 'ai' ? 'rgba(220,240,255,0.9)' : 'rgba(220,200,255,0.9)', fontSize: '13px', lineHeight: '1.6' }}>
                    <RichText text={msg.text} />
                    {msg.streaming && (
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: '#00f5ff' }}>▋</motion.span>
                    )}
                  </div>
                  <div className="mt-1 flex justify-end items-center gap-1">
                    {msg.via === 'voice' && <Mic className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                    <span style={{ ...mono, color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>{msg.timestamp.toLocaleTimeString('en-GB', { hour12: false })}</span>
                  </div>
                </div>
                {msg.type === 'user' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 0 8px rgba(168,85,247,0.2)' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#a855f7' }} />
                  </div>
                )}
              </motion.div>
            ),
          )}
        </AnimatePresence>

        <AnimatePresence>
          {thinking && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00f5ff' }} />
              </div>
              <div className="px-3 py-2 rounded-2xl flex items-center gap-1.5" style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.15)' }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ y: [-2, 2, -2] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} className="w-1.5 h-1.5 rounded-full" style={{ background: '#00f5ff' }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-1.5 flex-shrink-0">
        {SUGGESTIONS.map(s => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setInput(s); inputRef.current?.focus(); }}
            className="px-2.5 py-1 rounded-lg cursor-pointer"
            style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)' }}
          >
            <span style={{ ...mono, color: 'rgba(0,245,255,0.6)', fontSize: '9px' }}>{s}</span>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-shrink-0" style={{ background: 'rgba(0,8,25,0.7)', border: '1px solid rgba(0,245,255,0.2)', boxShadow: '0 0 10px rgba(0,245,255,0.04)' }}>
        <span style={{ ...mono, color: 'rgba(0,245,255,0.5)', fontSize: '12px' }}>{'>'}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask Louis anything..."
          className="flex-1 min-w-0 outline-none bg-transparent"
          style={{ ...raj, color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSubmit}
          disabled={!input.trim() || busy}
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
          style={{
            background: input.trim() && !busy ? 'rgba(0,245,255,0.2)' : 'rgba(0,245,255,0.04)',
            border: `1px solid ${input.trim() && !busy ? 'rgba(0,245,255,0.5)' : 'rgba(0,245,255,0.1)'}`,
          }}
        >
          <Send className="w-3.5 h-3.5" style={{ color: input.trim() && !busy ? '#00f5ff' : 'rgba(0,245,255,0.3)' }} />
        </motion.button>
      </div>
    </div>
  );
}
