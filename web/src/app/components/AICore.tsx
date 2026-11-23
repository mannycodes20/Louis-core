import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useSystem } from '../useSystem';
import { orb, mono, raj } from '../theme';

const stateConfig = {
  idle: { color: '#00f5ff', glow: 'rgba(0, 245, 255, 0.5)', label: 'STANDBY', pulseSpeed: 3, ringColor: 'rgba(0,245,255,0.5)' },
  listening: { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', label: 'LISTENING', pulseSpeed: 0.8, ringColor: 'rgba(34,197,94,0.5)' },
  processing: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', label: 'THINKING', pulseSpeed: 0.4, ringColor: 'rgba(245,158,11,0.5)' },
  responding: { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', label: 'RESPONDING', pulseSpeed: 0.6, ringColor: 'rgba(168,85,247,0.5)' },
};

function Ring({ size, thickness, color, duration, direction = 1, dashed = false, tilt = 0 }: {
  size: number; thickness: number; color: string; duration: number; direction?: number; dashed?: boolean; tilt?: number;
}) {
  return (
    <motion.div
      animate={{ rotate: direction * 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      className="absolute rounded-full"
      style={{
        width: size, height: size, left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2,
        border: `${thickness}px ${dashed ? 'dashed' : 'solid'} ${color}`,
        boxShadow: `0 0 8px ${color.replace('0.', '0.3')}`,
        transform: `rotateX(${tilt}deg)`,
        transformStyle: 'preserve-3d',
      }}
    />
  );
}

export function AICore() {
  const { aiState, listen, stopSpeaking, status } = useApp();
  const { stats } = useSystem();
  const cfg = stateConfig[aiState];
  const name = (status?.bot_name ?? 'Louis').toUpperCase();

  // Real readings around the orb instead of random numbers.
  const readings = [
    { label: 'CPU', val: stats ? `${Math.round(stats.cpu)}%` : '--' },
    { label: 'RAM', val: stats ? `${Math.round(stats.ram)}%` : '--' },
    { label: 'GPU', val: stats?.gpu ? `${Math.round(stats.gpu.util)}%` : '--' },
    { label: 'VRAM', val: stats?.gpu ? `${(stats.gpu.mem_used / 1024).toFixed(1)}G` : '--' },
    { label: 'TEMP', val: stats?.gpu ? `${Math.round(stats.gpu.temp)}°` : '--' },
    { label: 'NET', val: stats ? `${stats.net_mbps.toFixed(1)}M` : '--' },
    { label: 'UP', val: stats ? `${Math.floor(stats.uptime_s / 3600)}h` : '--' },
    { label: 'PROC', val: stats?.processes?.[0]?.name?.slice(0, 8) ?? '--' },
  ];

  const subLabel = {
    idle: status?.voice ? `SAY "${name}" TO WAKE ME` : 'VOICE OFFLINE — TYPE BELOW',
    listening: 'GO AHEAD, I\'M LISTENING',
    processing: 'WORKING ON IT',
    responding: 'SPEAKING',
  }[aiState];

  const handleClick = () => {
    if (aiState === 'responding') stopSpeaking();
    else if (aiState === 'idle') listen();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 select-none" style={{ perspective: '600px' }}>
      <div className="relative" style={{ width: 380, height: 380 }}>
        {readings.map((r, i) => {
          const angle = (i / readings.length) * Math.PI * 2;
          return (
            <motion.div
              key={r.label}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.25 }}
              className="absolute flex items-center gap-1"
              style={{ left: '50%', top: '50%', transform: `translate(${Math.cos(angle) * 160 - 22}px, ${Math.sin(angle) * 160 - 8}px)` }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
              <span style={{ ...mono, color: cfg.color, fontSize: '9px', opacity: 0.75 }}>{r.label} {r.val}</span>
            </motion.div>
          );
        })}

        <Ring size={340} thickness={1} color="rgba(0,245,255,0.1)" duration={40} dashed />
        <Ring size={300} thickness={1} color={cfg.ringColor.replace('0.5', '0.2')} duration={20} direction={1} tilt={20} />
        <Ring size={260} thickness={1.5} color={cfg.ringColor.replace('0.5', '0.3')} duration={14} direction={-1} tilt={-15} />
        <Ring size={210} thickness={1} color={cfg.ringColor} duration={8} direction={1} />

        {[0, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4 + i * 0.2, 1], opacity: [0.3 - i * 0.1, 0, 0.3 - i * 0.1] }}
            transition={{ duration: cfg.pulseSpeed * 2, repeat: Infinity, delay }}
            className="absolute rounded-full"
            style={{ width: 180, height: 180, left: '50%', top: '50%', marginLeft: -90, marginTop: -90, border: `1px solid ${cfg.color}` }}
          />
        ))}

        <motion.div
          onClick={handleClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={aiState === 'responding' ? 'Click to stop talking' : 'Click to talk'}
          className="absolute cursor-pointer rounded-full flex items-center justify-center"
          style={{
            width: 160, height: 160, left: '50%', top: '50%', marginLeft: -80, marginTop: -80,
            background: `radial-gradient(circle at 35% 35%, ${cfg.color}25 0%, rgba(0,5,20,0.9) 60%, rgba(0,2,10,1) 100%)`,
            border: `2px solid ${cfg.color}`,
            boxShadow: `0 0 30px ${cfg.glow}, 0 0 60px ${cfg.glow.replace('0.5', '0.2')}, inset 0 0 30px ${cfg.glow.replace('0.5', '0.15')}`,
            transition: 'box-shadow 0.5s, border-color 0.5s, background 0.5s',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: cfg.pulseSpeed, repeat: Infinity }}
            className="rounded-full flex items-center justify-center flex-col gap-1"
            style={{ width: 120, height: 120, background: `radial-gradient(circle, ${cfg.color}20 0%, transparent 70%)` }}
          >
            <motion.div
              animate={{ rotate: aiState === 'processing' ? 360 : 0 }}
              transition={{ duration: 1.5, repeat: aiState === 'processing' ? Infinity : 0, ease: 'linear' }}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="16" stroke={cfg.color} strokeWidth="1" opacity="0.5" />
                <circle cx="18" cy="18" r="10" stroke={cfg.color} strokeWidth="1.5" opacity="0.8" />
                <circle cx="18" cy="18" r="4" fill={cfg.color} />
                <line x1="18" y1="2" x2="18" y2="8" stroke={cfg.color} strokeWidth="1.5" />
                <line x1="18" y1="28" x2="18" y2="34" stroke={cfg.color} strokeWidth="1.5" />
                <line x1="2" y1="18" x2="8" y2="18" stroke={cfg.color} strokeWidth="1.5" />
                <line x1="28" y1="18" x2="34" y2="18" stroke={cfg.color} strokeWidth="1.5" />
              </svg>
            </motion.div>
            <span style={{ ...orb, color: cfg.color, fontSize: '9px', letterSpacing: '0.15em', opacity: 0.9 }}>{name}</span>
          </motion.div>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={aiState}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <span style={{ ...orb, color: cfg.color, fontSize: '16px', letterSpacing: '0.25em', textShadow: `0 0 15px ${cfg.glow}` }}>{cfg.label}</span>
            <span style={{ ...mono, color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.12em' }}>{subLabel}</span>
          </motion.div>
        </AnimatePresence>
        <motion.p
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ ...raj, color: 'rgba(0,245,255,0.4)', fontSize: '11px', marginTop: 4 }}
        >
          {aiState === 'responding' ? 'CLICK ORB TO STOP' : 'CLICK ORB TO TALK'}
        </motion.p>
      </div>
    </div>
  );
}
