import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Type, Volume2, Square } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mono, raj, stateColor } from '../theme';

const BAR_COUNT = 48;

export function VoiceBar() {
  const { aiState, listen, stopSpeaking, sendChat, messages, status } = useApp();
  const [textMode, setTextMode] = useState(false);
  const [input, setInput] = useState('');
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(0.15));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isListening = aiState === 'listening';
  const isBusy = aiState === 'processing' || aiState === 'responding';
  const lastUser = [...messages].reverse().find(m => m.type === 'user');
  const transcript = isBusy && lastUser?.via === 'voice' ? lastUser.text : '';

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isListening) {
      intervalRef.current = setInterval(() => {
        setBars(Array(BAR_COUNT).fill(0).map((_, i) => {
          const dist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
          return 0.2 + Math.random() * 0.7 * (1 - dist * 0.5);
        }));
      }, 80);
    } else if (isBusy) {
      intervalRef.current = setInterval(() => {
        const t = Date.now() / 200;
        setBars(Array(BAR_COUNT).fill(0).map((_, i) => 0.2 + 0.4 * Math.abs(Math.sin(t + i * 0.3))));
      }, 50);
    } else {
      setBars(Array(BAR_COUNT).fill(0.15));
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [aiState]);

  const onMic = () => {
    if (aiState === 'responding') stopSpeaking();
    else if (!isBusy) listen();
  };

  const submit = () => {
    if (!input.trim() || isBusy) return;
    sendChat(input.trim());
    setInput('');
  };

  const color = stateColor[aiState];
  const hint = status?.voice
    ? `Say "${status.bot_name}" or press the mic`
    : status?.voice_error ? 'Voice offline: check the server window' : 'Voice starting...';

  return (
    <div
      className="fixed left-0 right-0 flex items-center px-6 gap-4"
      style={{
        bottom: 0, height: 72, zIndex: 60,
        background: 'rgba(1, 8, 20, 0.85)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0, 245, 255, 0.1)',
      }}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setTextMode(!textMode)}
        title={textMode ? 'Show voice wave' : 'Type instead'}
        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
        style={{
          background: textMode ? 'rgba(168,85,247,0.15)' : 'rgba(0,245,255,0.05)',
          border: `1px solid ${textMode ? 'rgba(168,85,247,0.4)' : 'rgba(0,245,255,0.15)'}`,
        }}
      >
        {textMode ? <Type className="w-4 h-4" style={{ color: '#a855f7' }} /> : <Volume2 className="w-4 h-4" style={{ color: '#00f5ff' }} />}
      </motion.button>

      <AnimatePresence mode="wait">
        {!textMode ? (
          <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0 flex items-center gap-4">
            <div className="flex-1 flex items-center justify-center gap-0.5 h-12 overflow-hidden">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: h }}
                  transition={{ duration: 0.08, ease: 'linear' }}
                  className="rounded-full origin-center flex-shrink-0"
                  style={{
                    width: 2.5, height: '100%',
                    background: isListening ? `rgba(34, 197, 94, ${0.4 + h * 0.6})` : isBusy ? `rgba(245, 158, 11, ${0.3 + h * 0.5})` : `rgba(0, 245, 255, ${0.1 + h * 0.3})`,
                    boxShadow: isListening ? `0 0 3px rgba(34,197,94,${h * 0.6})` : 'none',
                  }}
                />
              ))}
            </div>
            <div className="flex-shrink-0 max-w-64 truncate">
              <span style={{ ...raj, color: transcript ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                {transcript ? `“${transcript}”` : hint}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: 'rgba(0,8,25,0.6)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <span style={{ ...mono, color: 'rgba(168,85,247,0.5)', fontSize: '12px' }}>{'>'}</span>
              <input
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Type a message for Louis..."
                className="flex-1 min-w-0 outline-none bg-transparent"
                style={{ ...raj, color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <span style={{ ...mono, color, fontSize: '8px', letterSpacing: '0.1em' }}>{aiState.toUpperCase()}</span>
        <motion.button
          onClick={onMic}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          title={aiState === 'responding' ? 'Stop talking' : 'Talk to Louis'}
          className="relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: isListening ? 'rgba(34, 197, 94, 0.15)' : isBusy ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 245, 255, 0.08)',
            border: `2px solid ${color}`,
            boxShadow: `0 0 20px ${color}40, 0 0 40px ${color}15`,
          }}
        >
          {isListening && (
            <>
              <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(34,197,94,0.5)' }} />
              <motion.div animate={{ scale: [1, 2.4, 1], opacity: [0.2, 0, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }} className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(34,197,94,0.3)' }} />
            </>
          )}
          {aiState === 'responding' ? (
            <Square className="w-4 h-4" style={{ color: '#a855f7' }} />
          ) : aiState === 'processing' ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <div className="w-4 h-4 rounded-full border-2 border-transparent" style={{ borderTopColor: '#f59e0b', borderRightColor: '#f59e0b40' }} />
            </motion.div>
          ) : (
            <Mic className="w-5 h-5" style={{ color: isListening ? '#22c55e' : '#00f5ff' }} />
          )}
        </motion.button>
      </div>
    </div>
  );
}
