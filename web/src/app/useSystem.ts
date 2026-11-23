import { useEffect, useState } from 'react';

// Live PC stats from the server, polled every 2 seconds and shared by every component.
export interface SystemStats {
  cpu: number; ram: number; ram_used_gb: number; ram_total_gb: number; net_mbps: number;
  gpu: { name: string; util: number; mem_used: number; mem_total: number; temp: number } | null;
  uptime_s: number; processes: { name: string; cpu: number; mem: number }[];
}
export interface Sample { t: number; cpu: number; ram: number; gpu: number; vram: number }

let latest: SystemStats | null = null;
let history: Sample[] = [];
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function poll() {
  try {
    latest = await (await fetch('/api/system')).json();
    const g = latest!.gpu;
    history = [...history.slice(-24), {
      t: Date.now(), cpu: latest!.cpu, ram: latest!.ram,
      gpu: g ? g.util : 0, vram: g ? (g.mem_used / g.mem_total) * 100 : 0,
    }];
    listeners.forEach(l => l());
  } catch { /* server offline */ }
}

export function useSystem() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    if (!timer) { poll(); timer = setInterval(poll, 2000); }
    return () => {
      listeners.delete(l);
      if (!listeners.size && timer) { clearInterval(timer); timer = null; }
    };
  }, []);
  return { stats: latest, history };
}
