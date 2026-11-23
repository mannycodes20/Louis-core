// Fonts and panel style from the Figma design, shared by every component.
export const orb = { fontFamily: 'Orbitron, sans-serif' };
export const mono = { fontFamily: 'Share Tech Mono, monospace' };
export const raj = { fontFamily: 'Rajdhani, sans-serif' };

export const glassPanel = (accent = '#00f5ff') => ({
  background: 'rgba(0, 10, 28, 0.65)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${accent}20`,
  borderRadius: '16px',
  boxShadow: '0 0 30px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.3)',
});

export const stateColor = {
  idle: '#00f5ff',
  listening: '#22c55e',
  processing: '#f59e0b',
  responding: '#a855f7',
} as const;
