import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Talks to Louis's Python server: a WebSocket for live chat and voice events, plus a few REST calls.

export type AIState = 'idle' | 'listening' | 'processing' | 'responding';

export interface Message {
  id: string;
  type: 'user' | 'ai' | 'tool';
  text: string;
  timestamp: Date;
  streaming?: boolean;
  via?: 'voice' | 'text';
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
}

export interface MemoryItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  timestamp: number;
}

export interface SearchResult { title: string; url: string; snippet: string }
export interface TidyPlan {
  desktop: string;
  moves: { file: string; folder: string }[];
  counts?: Record<string, number>;
  kept: number;
  summary: string;
}

export interface Status {
  bot_name: string; user_name: string; model: string; temperature: number; models: string[];
  voice: boolean; voice_error: string | null; speak_typed: boolean; wake_words: string[]; desktop: string;
}

interface AppContextType {
  connected: boolean;
  status: Status | null;
  refreshStatus: () => void;
  aiState: AIState;
  messages: Message[];
  sendChat: (text: string) => void;
  listen: () => void;
  stopSpeaking: () => void;
  clearChat: () => void;
  lastLatency: number | null;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  memories: MemoryItem[];
  reloadMemories: () => void;
  searchResults: { query: string; results: SearchResult[] } | null;
  setSearchResults: (r: { query: string; results: SearchResult[] } | null) => void;
  tidyPlan: TidyPlan | null;
  setTidyPlan: (p: TidyPlan | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  leftPanel: 'monitor' | 'memory';
  setLeftPanel: (v: 'monitor' | 'memory') => void;
  rightPanel: 'console' | 'search';
  setRightPanel: (v: 'console' | 'search') => void;
}

const AppContext = createContext<AppContextType | null>(null);
const uid = () => Math.random().toString(36).slice(2, 10);

export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searching the web',
  read_webpage: 'Reading a page',
  remember: 'Saving to memory',
  system_status: 'Checking your PC',
  scan_desktop: 'Scanning your Desktop',
  tidy_desktop: 'Tidying your Desktop',
  undo_tidy: 'Undoing the tidy',
  open_website: 'Opening a website',
  open_dashboard: 'Opening the dashboard',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [aiState, setAiState] = useState<AIState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<{ query: string; results: SearchResult[] } | null>(null);
  const [tidyPlan, setTidyPlan] = useState<TidyPlan | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<'monitor' | 'memory'>('monitor');
  const [rightPanel, setRightPanel] = useState<'console' | 'search'>('console');
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sentAt = useRef<number>(0);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id'>) => {
    const id = uid();
    setNotifications(prev => [...prev, { ...n, id }]);
    setTimeout(() => removeNotification(id), 6000);
  }, [removeNotification]);

  const reloadMemories = useCallback(() => {
    api<MemoryItem[]>('/api/memories').then(setMemories).catch(() => {});
  }, []);

  const refreshStatus = useCallback(() => {
    api<Status & { history: { role: string; text: string }[] }>('/api/status').then(s => {
      setStatus(s);
      setMessages(prev => prev.length ? prev : s.history.map(h => ({
        id: uid(), type: h.role === 'user' ? 'user' : 'ai', text: h.text, timestamp: new Date(),
      })));
    }).catch(() => {});
  }, []);

  const handleEvent = useCallback((e: any) => {
    switch (e.type) {
      case 'state':
        setAiState(e.state);
        break;
      case 'user':
        sentAt.current = performance.now();
        setMessages(prev => [...prev, { id: uid(), type: 'user', text: e.text, via: e.via, timestamp: new Date() }]);
        break;
      case 'token':
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.type === 'ai' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text: last.text + e.text }];
          }
          setLastLatency(Math.round(performance.now() - sentAt.current));
          return [...prev, { id: uid(), type: 'ai', text: e.text, streaming: true, timestamp: new Date() }];
        });
        break;
      case 'reply_done':
        setMessages(prev => prev.map(m => (m.streaming ? { ...m, streaming: false, text: m.text.trim() } : m)));
        break;
      case 'tool':
        setMessages(prev => [...prev, {
          id: uid(), type: 'tool', timestamp: new Date(),
          text: `${TOOL_LABELS[e.name] ?? e.name}${e.args?.query ? `: “${e.args.query}”` : ''}`,
        }]);
        break;
      case 'search_results':
        setSearchResults({ query: e.query, results: e.results });
        break;
      case 'tidy_plan':
        setTidyPlan(e.plan);
        break;
      case 'tidy_done':
        setTidyPlan(null);
        addNotification({ type: 'success', title: 'DESKTOP', message: e.result.summary });
        break;
      case 'memories_changed':
        reloadMemories();
        addNotification({ type: 'info', title: 'MEMORY', message: 'New memory saved.' });
        break;
      case 'notify':
        addNotification({ type: e.level, title: e.title, message: e.message });
        if (e.title?.startsWith('VOICE')) refreshStatus();
        break;
    }
  }, [addNotification, reloadMemories, refreshStatus]);

  // Connect (and reconnect) to the server.
  useEffect(() => {
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); refreshStatus(); reloadMemories(); };
      ws.onmessage = msg => handleEvent(JSON.parse(msg.data));
      ws.onclose = () => {
        setConnected(false);
        if (!stopped) retry = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => { stopped = true; clearTimeout(retry); wsRef.current?.close(); };
  }, [handleEvent, refreshStatus, reloadMemories]);

  const send = (data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(data));
    else addNotification({ type: 'error', title: 'OFFLINE', message: "Can't reach Louis's server. Is it running?" });
  };

  const value: AppContextType = {
    connected, status, refreshStatus, aiState, messages, lastLatency,
    sendChat: text => send({ type: 'chat', text }),
    listen: () => send({ type: 'listen' }),
    stopSpeaking: () => send({ type: 'stop' }),
    clearChat: () => { api('/api/clear', 'POST'); setMessages([]); },
    notifications, addNotification, removeNotification,
    memories, reloadMemories,
    searchResults, setSearchResults,
    tidyPlan, setTidyPlan,
    settingsOpen, setSettingsOpen,
    leftPanel, setLeftPanel,
    rightPanel, setRightPanel,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
