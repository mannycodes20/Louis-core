import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff, Cpu, Settings, Zap, Activity, Mic, MicOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSystem } from '../useSystem';
import { orb, mono, raj, stateColor } from '../theme';

const stateLabel = { idle: 'STANDBY', listening: 'LISTENING', processing: 'PROCESSING', responding: 'RESPONDING' };

export function TopBar() {
  const [time, setTime] = useState(new Date());
  const { setSettingsOpen, aiState, connected, status } = useApp();
  const { stats } = useSystem();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fmtTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour12: false });
  const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const color = stateColor[aiState];
  const name = (status?.bot_name ?? 'Louis').toUpperCase();

  const items = [
    { icon: connected ? Wifi : WifiOff, label: 'CORE', val: connected ? 'ONLINE' : 'OFFLINE', color: connected ? '#22c55e' : '#ef4444' },
    { icon: status?.voice ? Mic : MicOff, label: 'VOICE', val: status?.voice ? 'ON' : 'OFF', color: status?.voice ? '#00f5ff' : 'rgba(255,255,255,0.4)' },
    { icon: Cpu, label: 'CPU', val: stats ? `${Math.round(stats.cpu)}%` : '--', color: '#a855f7' },
    { icon: Zap, label: 'GPU', val: stats?.gpu ? `${Math.round(stats.gpu.util)}%` : '--', color: '#f59e0b' },
    { icon: Activity, label: 'NET', val: stats ? `${stats.net_mbps.toFixed(1)}MB/s` : '--', color: '#0ea5e9' },
  ];

  return (
    <div
      className="fixed top-0 left-0 right-0 h-14 flex items-center px-5 gap-4"
      style={{
        zIndex: 100,
        background: 'rgba(1, 11, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 245, 255, 0.15)',
        boxShadow: '0 0 30px rgba(0, 245, 255, 0.04), 0 1px 0 rgba(0,245,255,0.08)',
      }}
    >
      <div className="flex items-center gap-3 flex-shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full flex items-center justify-center relative"
          style={{ border: '1.5px solid rgba(0,245,255,0.6)', boxShadow: '0 0 12px rgba(0,245,255,0.4), inset 0 0 8px rgba(0,245,255,0.1)' }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#00f5ff', boxShadow: '0 0 8px rgba(0,245,255,0.9)' }} />
          <div className="absolute inset-0 rounded-full" style={{ border: '1px dashed rgba(0,245,255,0.2)' }} />
        </motion.div>
        <div>
          <div style={{ ...orb, color: '#00f5ff', fontSize: '13px', letterSpacing: '0.15em', textShadow: '0 0 10px rgba(0,245,255,0.6)' }}>{name}</div>
          <div style={{ ...mono, color: 'rgba(0,245,255,0.45)', fontSize: '10px' }}>{status ? status.model.toUpperCase() : 'CONNECTING...'}</div>
        </div>
      </div>

      <div className="w-px h-8 flex-shrink-0" style={{ background: 'rgba(0,245,255,0.12)' }} />

      <div className="flex items-center gap-2 flex-shrink-0">
        <motion.div
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: aiState === 'idle' ? 3 : 0.6, repeat: Infinity }}
          className="w-2 h-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <span style={{ ...mono, color, fontSize: '11px', letterSpacing: '0.12em' }}>{stateLabel[aiState]}</span>
      </div>

      <div className="flex-1 flex items-center justify-center gap-6 overflow-hidden">
        {items.map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="flex items-center gap-1.5 flex-shrink-0">
            <Icon className="w-3 h-3" style={{ color }} />
            <span style={{ ...mono, color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{label}</span>
            <span style={{ ...mono, color, fontSize: '10px' }}>{val}</span>
          </div>
        ))}
      </div>

      <div className="text-right flex-shrink-0">
        <div style={{ ...orb, color: '#00f5ff', fontSize: '15px', textShadow: '0 0 10px rgba(0,245,255,0.5)' }}>{fmtTime(time)}</div>
        <div style={{ ...raj, color: 'rgba(0,245,255,0.5)', fontSize: '10px' }}>{fmtDate(time)}</div>
      </div>

      <div className="w-px h-8 flex-shrink-0" style={{ background: 'rgba(0,245,255,0.12)' }} />

      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSettingsOpen(true)}
        title="Settings"
        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
        style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)' }}
      >
        <Settings className="w-4 h-4" style={{ color: '#00f5ff' }} />
      </motion.button>
    </div>
  );
}
