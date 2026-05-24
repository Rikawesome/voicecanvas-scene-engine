import { SceneMood } from '../types/scene';

interface CinematicBarProps {
  onApplyCameraPreset: (type: string) => void;
  currentMood: SceneMood;
  onChangeMood: (mood: SceneMood) => void;
  onSaveScene: () => void;
  onLoadFileTrigger: () => void;
}

export function CinematicBar({ 
  onApplyCameraPreset, 
  currentMood, 
  onChangeMood, 
  onSaveScene,
  onLoadFileTrigger
}: CinematicBarProps) {
  
  return (
    <div style={{
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      zIndex: 90,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px 12px 4px 12px',
      background: 'linear-gradient(to bottom, rgba(18,18,20,0.8) 0%, rgba(18,18,20,0) 100%)',
      pointerEvents: 'none' // Gaps let touch inputs pass directly to orbit canvas
    }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        pointerEvents: 'auto' // Buttons stay fully clickable
      }}>
        {/* ROW 1: VERTICAL-SAFE CAMERA VIEW PRESETS */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }} className="no-scrollbar">
          <button onClick={() => onApplyCameraPreset('standoff')} style={pillStyle}>Standoff</button>
          <button onClick={() => onApplyCameraPreset('impact')} style={pillStyle}>Impact Shot</button>
          <button onClick={() => onApplyCameraPreset('ots')} style={pillStyle}>Over-Shoulder</button>
          <button onClick={() => onApplyCameraPreset('lowOts')} style={pillStyle}>Low OTS</button>
          <button onClick={() => onApplyCameraPreset('closeup')} style={pillStyle}>Close-Up</button>
          <button onClick={() => onApplyCameraPreset('wide')} style={pillStyle}>Wide Master</button>
        </div>

        {/* ROW 2: CONTRAST SHADING MOODS & PERSISTENCE HOOKS */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }} className="no-scrollbar">
          {(['neutral', 'dramatic', 'suspense', 'warm', 'night'] as SceneMood[]).map((m) => (
            <button
              key={m}
              onClick={() => onChangeMood(m)}
              style={{
                ...pillStyle,
                background: currentMood === m ? '#ff79c6' : 'rgba(40, 42, 54, 0.65)',
                color: currentMood === m ? '#121214' : '#bd93f9',
                border: currentMood === m ? '1px solid #ff79c6' : '1px solid rgba(98, 114, 164, 0.3)'
              }}
            >
              {m.toUpperCase()}
            </button>
          ))}
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button onClick={onSaveScene} style={{ ...pillStyle, background: 'rgba(80, 250, 123, 0.2)', color: '#50fa7b', border: '1px solid #50fa7b' }}>💾 Export</button>
          <button onClick={onLoadFileTrigger} style={{ ...pillStyle, background: 'rgba(139, 233, 253, 0.2)', color: '#8be9fd', border: '1px solid #8be9fd' }}>📂 Load</button>
        </div>
      </div>
    </div>
  );
}

// Low profile styling designed to sit out of your panel viewports
const pillStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'rgba(40, 42, 54, 0.65)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(68, 71, 90, 0.5)',
  borderRadius: '20px',
  color: '#f8f8f2',
  fontSize: '0.72rem',
  fontWeight: '600',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
};
