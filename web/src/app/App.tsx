import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Terminal, Search, Activity } from 'lucide-react';

import { AppProvider, api, useApp } from './context/AppContext';
import { Background } from './components/Background';
import { TopBar } from './components/TopBar';
import { AICore } from './components/AICore';
import { SystemMonitor } from './components/SystemMonitor';
import { MemoryPanel } from './components/MemoryPanel';
import { CommandConsole } from './components/CommandConsole';
import { SearchPanel } from './components/SearchPanel';
import { VoiceBar } from './components/VoiceBar';
import { TidyPanel } from './components/TidyPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { NotificationSystem } from './components/NotificationSystem';
import { orb, mono, glassPanel } from './theme';

function PanelTab({ label, icon: Icon, active, color, onClick }: {
  label: string; icon: React.ElementType; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
      style={{
        background: active ? `${color}12` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? `${color}35` : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.2s',
      }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: active ? color : 'rgba(255,255,255,0.3)' }} />
      <span style={{ ...mono, color: active ? color : 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.08em' }}>{label}</span>
    </motion.button>
  );
}

function QuickActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="px-4 py-2 rounded-xl cursor-pointer"
      style={{ background: `${color}0a`, border: `1px solid ${color}30` }}
    >
      <span style={{ ...mono, color, fontSize: '10px', letterSpacing: '0.08em' }}>{label}</span>
    </motion.button>
  );
}

function MainLayout() {
  const { leftPanel, setLeftPanel, rightPanel, setRightPanel, status, memories, lastLatency, sendChat, setTidyPlan, addNotification } = useApp();

  const scanDesktop = async () => {
    const plan = await api('/api/tidy/scan', 'POST').catch(() => null);
    if (plan) setTidyPlan(plan);
    else addNotification({ type: 'error', title: 'DESKTOP', message: "Couldn't scan the Desktop." });
  };

  const strip = [
    { label: 'MODEL', value: status ? status.model.split(':')[0].toUpperCase() : '--', color: '#00f5ff' },
    { label: 'MEMORIES', value: String(memories.length), color: '#a855f7' },
    { label: 'VOICE', value: status?.voice ? 'ON' : 'OFF', color: '#22c55e' },
    { label: 'FIRST WORD', value: lastLatency ? `${(lastLatency / 1000).toFixed(1)}s` : '--', color: '#f59e0b' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
      <Background />
      <TopBar />

      <div className="flex flex-1 gap-4 px-4 overflow-hidden relative" style={{ marginTop: 56, marginBottom: 72, zIndex: 1 }}>
        {/* LEFT: monitor / memory */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-hidden pt-4 pb-2">
          <div className="flex gap-2 flex-shrink-0">
            <PanelTab label="MONITOR" icon={Activity} active={leftPanel === 'monitor'} color="#00f5ff" onClick={() => setLeftPanel('monitor')} />
            <PanelTab label="MEMORY" icon={Brain} active={leftPanel === 'memory'} color="#a855f7" onClick={() => setLeftPanel('memory')} />
          </div>
          <div className="flex-1 p-4 overflow-hidden" style={glassPanel(leftPanel === 'monitor' ? '#00f5ff' : '#a855f7')}>
            <AnimatePresence mode="wait">
              <motion.div key={leftPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                {leftPanel === 'monitor' ? <SystemMonitor /> : <MemoryPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER: the orb */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md flex items-center justify-between px-6 py-2.5 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(0,8,22,0.5)', border: '1px solid rgba(0,245,255,0.1)', backdropFilter: 'blur(12px)' }}
          >
            {strip.map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center">
                <span style={{ ...orb, color, fontSize: '13px', textShadow: `0 0 8px ${color}` }}>{value}</span>
                <span style={{ ...mono, color: 'rgba(255,255,255,0.3)', fontSize: '8px' }}>{label}</span>
              </div>
            ))}
          </motion.div>

          <div className="flex-1 flex items-center justify-center w-full">
            <AICore />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 flex-shrink-0 pb-2">
            <QuickActionButton label="SCAN DESKTOP" color="#00f5ff" onClick={scanDesktop} />
            <QuickActionButton label="RESEARCH" color="#0ea5e9" onClick={() => setRightPanel('search')} />
            <QuickActionButton label="PC STATUS" color="#22c55e" onClick={() => sendChat('How is my PC doing right now?')} />
            <QuickActionButton label="MEMORY" color="#a855f7" onClick={() => setLeftPanel('memory')} />
          </div>
        </div>

        {/* RIGHT: console / search */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-hidden pt-4 pb-2">
          <div className="flex gap-2 flex-shrink-0">
            <PanelTab label="CONSOLE" icon={Terminal} active={rightPanel === 'console'} color="#00f5ff" onClick={() => setRightPanel('console')} />
            <PanelTab label="SEARCH" icon={Search} active={rightPanel === 'search'} color="#0ea5e9" onClick={() => setRightPanel('search')} />
          </div>
          <div className="flex-1 p-4 overflow-hidden" style={glassPanel(rightPanel === 'console' ? '#00f5ff' : '#0ea5e9')}>
            <AnimatePresence mode="wait">
              <motion.div key={rightPanel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                {rightPanel === 'console' ? <CommandConsole /> : <SearchPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <VoiceBar />
      <TidyPanel />
      <SettingsPanel />
      <NotificationSystem />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
