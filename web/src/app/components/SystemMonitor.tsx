import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, Database, Zap, Thermometer, HardDrive } from 'lucide-react';
import { useSystem } from '../useSystem';
import { orb, mono, raj } from '../theme';

function MetricCard({ label, value, unit, color, icon, data, dataKey }: {
  label: string; value: number; unit: string; color: string; icon: React.ReactNode; data: any[]; dataKey: string;
}) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'rgba(0, 8, 20, 0.5)', border: `1px solid ${color}25` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div style={{ color }}>{icon}</div>
          <span style={{ ...mono, color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{label}</span>
        </div>
        <span style={{ ...orb, color, fontSize: '14px', textShadow: `0 0 8px ${color}` }}>
          {Math.round(value)}<span style={{ fontSize: '9px', opacity: 0.7 }}>{unit}</span>
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <div style={{ height: 36 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#grad-${label})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SystemMonitor() {
  const { stats, history } = useSystem();
  const fmtUptime = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  const gpu = stats?.gpu;

  const metrics = [
    { label: 'CPU', value: stats?.cpu ?? 0, unit: '%', color: '#00f5ff', icon: <Cpu className="w-3 h-3" />, dataKey: 'cpu' },
    { label: 'MEMORY', value: stats?.ram ?? 0, unit: '%', color: '#a855f7', icon: <Database className="w-3 h-3" />, dataKey: 'ram' },
    { label: 'GPU', value: gpu?.util ?? 0, unit: '%', color: '#f59e0b', icon: <Zap className="w-3 h-3" />, dataKey: 'gpu' },
    { label: 'VRAM', value: gpu ? (gpu.mem_used / gpu.mem_total) * 100 : 0, unit: '%', color: '#0ea5e9', icon: <HardDrive className="w-3 h-3" />, dataKey: 'vram' },
  ];
  const load = Math.round(Math.max(stats?.cpu ?? 0, stats?.ram ?? 0, gpu?.util ?? 0));
  const healthColor = load < 60 ? '#22c55e' : load < 85 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: '#00f5ff' }} />
          <span style={{ ...orb, color: '#00f5ff', fontSize: '11px', letterSpacing: '0.15em' }}>SYSTEM MONITOR</span>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full" style={{ background: stats ? '#22c55e' : '#ef4444' }} />
          <span style={{ ...mono, color: stats ? '#22c55e' : '#ef4444', fontSize: '9px' }}>{stats ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>

      <div className="rounded-xl p-3 flex items-center gap-4 flex-shrink-0" style={{ background: 'rgba(0,8,20,0.5)', border: `1px solid ${healthColor}25` }}>
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <motion.circle
              cx="24" cy="24" r="20" fill="none" stroke={healthColor} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 20}`}
              animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - load / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 4px ${healthColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ ...orb, color: healthColor, fontSize: '10px' }}>{load}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span style={{ ...raj, color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{gpu?.name ?? 'System Health'}</span>
          <span style={{ ...mono, color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>UPTIME: {stats ? fmtUptime(stats.uptime_s) : '--'}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Thermometer className="w-3 h-3" style={{ color: '#f59e0b' }} />
            <span style={{ ...mono, color: '#f59e0b', fontSize: '10px' }}>{gpu ? `${Math.round(gpu.temp)}°C GPU` : 'NO GPU DATA'}</span>
          </div>
        </div>
        <div className="ml-auto">
          <span style={{ ...raj, color: healthColor, fontSize: '12px' }}>{load < 60 ? 'OPTIMAL' : load < 85 ? 'MODERATE' : 'HIGH LOAD'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto content-start">
        {metrics.map(m => <MetricCard key={m.label} {...m} data={history} />)}
      </div>

      <div className="rounded-xl p-3 flex-shrink-0" style={{ background: 'rgba(0,8,20,0.5)', border: '1px solid rgba(0,245,255,0.08)' }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ ...mono, color: 'rgba(0,245,255,0.6)', fontSize: '10px' }}>TOP PROCESSES</span>
          <span style={{ ...mono, color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>{stats ? `${stats.ram_used_gb}/${stats.ram_total_gb} GB` : ''}</span>
        </div>
        {(stats?.processes ?? []).map(p => (
          <div key={p.name} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="truncate" style={{ ...mono, color: 'rgba(255,255,255,0.5)', fontSize: '9px', maxWidth: 140 }}>{p.name}</span>
            <div className="flex gap-3">
              <span style={{ ...mono, color: '#00f5ff', fontSize: '9px' }}>{p.cpu}%</span>
              <span style={{ ...mono, color: '#a855f7', fontSize: '9px' }}>{p.mem}MB</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
