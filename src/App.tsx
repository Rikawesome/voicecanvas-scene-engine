import { useState, useEffect, useRef } from 'react';
import { SceneState, CharacterState, CameraState, PoseJointKey, SceneMood } from './types/scene';
import { CanvasView } from './components/CanvasView';
import { ControlPanel } from './components/ControlPanel';
import { DebugPanel } from './components/DebugPanel';
import { DirectorNotes } from './components/DirectorNotes';
import { CinematicBar } from './components/CinematicBar';
import { PosePartWidget } from './components/PosePartWidget';
// CRITICAL FIX: Targeted our optimized NLP token script directly
import { parseDirectorNotes } from './utils/CommandParser';
import { exportSceneState, importSceneState } from './utils/persistence';
import { DEFAULT_SKELETON } from './constants/poses';

const LOCAL_STORAGE_KEY = 'voicecanvas-m5-rig-pose-autosave';

const INITIAL_SCENE_STATE: SceneState = {
  sceneId: "voicecanvas-milestone-4",
  mood: "neutral",
  camera: { position: { x: 0, y: 3, z: 6 }, target: { x: 0, y: 0.5, z: 0 } },
  characters: [
    {
      id: "char-riku",
      name: "Riku (Lead)",
      position: { x: -1.2, y: 0, z: 0 },
      rotation: { x: 0, y: 90, z: 0 },
      poseName: "neutral",
      currentStance: "neutral",
      currentAction: "none",
      skeleton: { ...DEFAULT_SKELETON }
    },
    {
      id: "char-kiki",
      name: "Kiki (Rival)",
      position: { x: 1.2, y: 0, z: 0 },
      rotation: { x: 0, y: 270, z: 0 },
      poseName: "neutral",
      currentStance: "neutral",
      currentAction: "none",
      skeleton: { ...DEFAULT_SKELETON }
    }
  ]
};

type ActiveMobileWidget = 'none' | 'director' | 'sliders' | 'files' | 'notes';

export default function App() {
  const [sceneState, setSceneState] = useState<SceneState>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.characters && parsed.characters[0]?.skeleton) return parsed;
      } catch (e) {}
    }
    // CRITICAL FIX: Structured cloning cuts pointer references preventing memory state bleeding
    return JSON.parse(JSON.stringify(INITIAL_SCENE_STATE));
  });

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>("char-riku");
  const [selectedJointKey, setSelectedJointKey] = useState<PoseJointKey | null>(null);
  const [activeWidget, setActiveWidget] = useState<ActiveMobileWidget>('none');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sceneState));
  }, [sceneState]);

  const handleApplyCameraPreset = (type: string) => {
    const activeId = selectedCharacterId || 'char-riku';
    const activeChar = sceneState.characters.find(c => c.id === activeId) || sceneState.characters[0];
    const opposingChar = sceneState.characters.find(c => c.id !== activeId) || sceneState.characters[1];
    let nextCam = { ...sceneState.camera };
    const { x, y, z } = activeChar.position;
    const rounded = (value: number) => parseFloat(value.toFixed(2));
    const opponent = opposingChar || activeChar;
    const midpoint = {
      x: rounded((activeChar.position.x + opponent.position.x) / 2),
      y: rounded((activeChar.position.y + opponent.position.y) / 2),
      z: rounded((activeChar.position.z + opponent.position.z) / 2)
    };
    const dx = opponent.position.x - activeChar.position.x;
    const dz = opponent.position.z - activeChar.position.z;
    const distance = Math.max(Math.sqrt(dx * dx + dz * dz), 0.001);
    const forward = { x: dx / distance, z: dz / distance };
    const side = { x: forward.z, z: -forward.x };

    switch (type) {
      case 'closeup':
        nextCam = { position: { x: rounded(x - forward.x * 2.8 + side.x * 0.35), y: rounded(y + 1.6), z: rounded(z - forward.z * 2.8 + side.z * 0.35) }, target: { x: rounded(x), y: rounded(y + 1.0), z: rounded(z) } };
        break;
      case 'wide':
        nextCam = { position: { x: rounded(midpoint.x - 0.25), y: rounded(midpoint.y + 3.6), z: rounded(midpoint.z + 7.6) }, target: { x: rounded(midpoint.x - 0.2), y: rounded(midpoint.y + 0.85), z: midpoint.z } };
        break;
      case 'low':
        nextCam = { position: { x: rounded(midpoint.x - 0.25), y: rounded(midpoint.y + 0.85), z: rounded(midpoint.z + 5.4) }, target: { x: rounded(midpoint.x - 0.2), y: rounded(midpoint.y + 1.15), z: midpoint.z } };
        break;
      case 'high':
        nextCam = { position: { x: rounded(midpoint.x + side.x * 1.6), y: rounded(midpoint.y + 4.8), z: rounded(midpoint.z + side.z * 1.6 + 2.2) }, target: { x: midpoint.x, y: rounded(midpoint.y + 0.45), z: midpoint.z } };
        break;
      case 'ots':
        nextCam = { position: { x: rounded(x - forward.x * 2.7 + side.x * 0.65), y: rounded(y + 1.45), z: rounded(z - forward.z * 2.7 + side.z * 0.65) }, target: { x: rounded(opponent.position.x), y: rounded(opponent.position.y + 1.0), z: rounded(opponent.position.z) } };
        break;
      case 'lowOts':
        nextCam = { position: { x: rounded(x - forward.x * 3.2 + side.x * 0.65), y: rounded(y + 0.9), z: rounded(z - forward.z * 3.2 + side.z * 0.65) }, target: { x: rounded(opponent.position.x), y: rounded(opponent.position.y + 1.1), z: rounded(opponent.position.z) } };
        break;
      case 'standoff':
        nextCam = { position: { x: rounded(midpoint.x - 0.25), y: rounded(midpoint.y + 2.2), z: rounded(midpoint.z + 5.8) }, target: { x: rounded(midpoint.x - 0.2), y: rounded(midpoint.y + 0.9), z: midpoint.z } };
        break;
      case 'impact':
        nextCam = { position: { x: rounded(midpoint.x - 0.25), y: rounded(midpoint.y + 1.55), z: rounded(midpoint.z + 4.4) }, target: { x: rounded(midpoint.x - 0.2), y: rounded(midpoint.y + 1.0), z: midpoint.z } };
        break;
    }
    setSceneState(prev => ({ ...prev, camera: nextCam }));
    if (isMobile) setActiveWidget('none');
  };

  const handleUpdateCharacter = (id: string, updates: Partial<CharacterState>) => {
    setSceneState((prev) => ({
      ...prev,
      characters: prev.characters.map((char) => char.id === id ? { ...char, ...updates } : char)
    }));
  };

  const handleUpdateJoint = (jointKey: PoseJointKey, axis: 'x' | 'y' | 'z', value: number) => {
    const activeId = selectedCharacterId;
    if (!activeId) return;

    setSceneState((prev) => ({
      ...prev,
      characters: prev.characters.map((char) => {
        if (char.id !== activeId) return char;
        const currentJoint = char.skeleton[jointKey] || { x: 0, y: 0, z: 0 };
        return {
          ...char,
          skeleton: {
            ...char.skeleton,
            [jointKey]: {
              ...currentJoint,
              [axis]: value
            }
          }
        };
      })
    }));
  };

  const handleResetJoint = (jointKey: PoseJointKey) => {
    const activeId = selectedCharacterId;
    if (!activeId) return;

    setSceneState((prev) => ({
      ...prev,
      characters: prev.characters.map((char) => {
        if (char.id !== activeId) return char;
        return {
          ...char,
          skeleton: {
            ...char.skeleton,
            [jointKey]: { x: 0, y: 0, z: 0 }
          }
        };
      })
    }));
  };

  const handleSelectCharacter = (id: string) => {
    setSelectedCharacterId(id);
  };

  const handleSelectJoint = (characterId: string, jointKey: PoseJointKey) => {
    setSelectedCharacterId(characterId);
    setSelectedJointKey(jointKey);
  };

  const handleExecuteCommand = (noteString: string) => {
    const result = parseDirectorNotes(noteString, sceneState.characters, selectedCharacterId, sceneState.camera);
    setSceneState(prev => {
      let nextState = { ...prev };
      if (result.updatedCharacters) nextState.characters = result.updatedCharacters;
      if (result.updatedMood) nextState.mood = result.updatedMood;
      if (result.updatedCamera) nextState.camera = result.updatedCamera;
      return nextState;
    });
    if (isMobile) setActiveWidget('none');
  };

  const selectedCharacter = selectedCharacterId
    ? sceneState.characters.find((char) => char.id === selectedCharacterId)
    : undefined;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100svh', overflow: 'hidden', backgroundColor: '#0e0e10' }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) { setSceneState(await importSceneState(file)); setActiveWidget('none'); }
      }} />

      {/* 100% SCREEN VIEWPORT THREE.JS CANVAS */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <CanvasView 
          characters={sceneState.characters} selectedId={selectedCharacterId}
          selectedJointKey={selectedJointKey}
          cameraState={sceneState.camera} mood={sceneState.mood}
          onSelectCharacter={handleSelectCharacter}
          onSelectJoint={handleSelectJoint}
          onCameraChange={(cam) => setSceneState(prev => ({ ...prev, camera: cam }))}
        />
      </div>

      {/* CHAT FAB ICON TRIGGER */}
      {isMobile && activeWidget === 'none' && (
        <button onClick={() => setActiveWidget('notes')} style={floatingChatIcon}>💬</button>
      )}

      {isMobile && activeWidget === 'none' && selectedCharacter && selectedJointKey && (
        <PosePartWidget
          character={selectedCharacter}
          jointKey={selectedJointKey}
          placement="bottom-sheet"
          onUpdateJoint={handleUpdateJoint}
          onResetJoint={handleResetJoint}
          onClose={() => setSelectedJointKey(null)}
        />
      )}

      {/* BOTTOM MOBILE SYSTEM INTERFACE DOCK */}
      {isMobile && activeWidget === 'none' && !selectedJointKey && (
        <div style={navigationDeckWrapper}>
          <button onClick={() => setActiveWidget('director')} style={mobileFabStyle}>🎭 Director</button>
          <button onClick={() => setActiveWidget('sliders')} style={mobileFabStyle}>⚙️ Coordinates</button>
          <button onClick={() => setActiveWidget('files')} style={{ ...mobileFabStyle, background: 'rgba(98,114,164,0.4)', color: '#bd93f9' }}>💾 Files</button>
        </div>
      )}

      {/* OPAQUE MODAL OVERLAY 1: THE DIRECTOR CONTROL BOARD */}
      {isMobile && activeWidget === 'director' && (
        <div style={mobileBottomSheetShell}>
          <div style={mobileSheetHandle} />
          <button onClick={() => setActiveWidget('none')} style={mobileSheetCloseButton}>Close Director</button>
          <div style={mobileSheetScrollBody}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <label style={widgetSectionLabel}>Active Actor Target</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {sceneState.characters.map((c) => (
                    <button key={c.id} onClick={() => handleSelectCharacter(c.id)} style={{
                      ...widgetActionButton, flex: 1,
                      backgroundColor: selectedCharacterId === c.id ? '#ff79c6' : '#282a36',
                      color: selectedCharacterId === c.id ? '#121214' : '#f8f8f2'
                    }}>{c.name.split(' ')[0]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={widgetSectionLabel}>Cinematic Focus Presets</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <button onClick={() => handleApplyCameraPreset('standoff')} style={widgetActionButton}>Standoff</button>
                  <button onClick={() => handleApplyCameraPreset('impact')} style={widgetActionButton}>Impact Shot</button>
                  <button onClick={() => handleApplyCameraPreset('ots')} style={widgetActionButton}>Over-Shoulder</button>
                  <button onClick={() => handleApplyCameraPreset('lowOts')} style={widgetActionButton}>Low OTS</button>
                  <button onClick={() => handleApplyCameraPreset('closeup')} style={widgetActionButton}>Close-Up</button>
                  <button onClick={() => handleApplyCameraPreset('wide')} style={widgetActionButton}>Wide Master</button>
                </div>
              </div>
              <div>
                <label style={widgetSectionLabel}>Atmospheric Lighting Filters</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {(['neutral', 'dramatic', 'suspense', 'warm', 'night'] as SceneMood[]).map((m) => (
                    <button key={m} onClick={() => setSceneState(prev => ({ ...prev, mood: m }))} style={{
                      ...widgetActionButton, padding: '8px 12px', fontSize: '0.65rem',
                      backgroundColor: sceneState.mood === m ? '#bd93f9' : '#282a36',
                      color: sceneState.mood === m ? '#121214' : '#f8f8f2'
                    }}>={m.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPAQUE MODAL OVERLAY 2: MANUAL SKELETAL SLIDER PANEL */}
      {isMobile && activeWidget === 'sliders' && (
        <div style={{ ...mobileBottomSheetShell, maxHeight: '62svh' }}>
          <div style={mobileSheetHandle} />
          <button onClick={() => setActiveWidget('none')} style={mobileSheetCloseButton}>Close Coordinates</button>
          <div style={mobileSheetScrollBody}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {sceneState.characters.map((c) => (
                <button key={c.id} onClick={() => handleSelectCharacter(c.id)} style={{
                  ...widgetActionButton, flex: 1,
                  backgroundColor: selectedCharacterId === c.id ? '#ff79c6' : '#282a36',
                  color: selectedCharacterId === c.id ? '#121214' : '#f8f8f2'
                }}>{c.name.split(' ')[0]} Frame</button>
              ))}
            </div>
            <ControlPanel characters={sceneState.characters} selectedId={selectedCharacterId} onUpdateCharacter={handleUpdateCharacter} />
            <div style={{ marginTop: '24px', borderTop: '1px solid #232326', paddingTop: '12px' }}>
              <DebugPanel sceneState={sceneState} />
            </div>
          </div>
        </div>
      )}

      {/* OPAQUE MODAL OVERLAY 3: SYSTEM FILE UTILITY */}
      {isMobile && activeWidget === 'files' && (
        <div style={mobileWidgetFullscreenShell}>
          <button onClick={() => setActiveWidget('none')} style={mobileClosePanelBar}>✕ Close File Manager</button>
          <div style={{ ...widgetScrollBodyContainer, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={() => exportSceneState(sceneState)} style={{ ...widgetActionButton, width: '100%', maxWidth: '290px', padding: '16px', background: '#50fa7b', color: '#121214', fontSize: '0.8rem', fontWeight: 'bold' }}>
              💾 Export Board Asset (.JSON)
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{ ...widgetActionButton, width: '100%', maxWidth: '290px', padding: '16px', background: '#8be9fd', color: '#121214', fontSize: '0.8rem', fontWeight: 'bold' }}>
              📂 Upload Scene Blueprint
            </button>
          </div>
        </div>
      )}

      {/* OPAQUE MODAL OVERLAY 4: FULL RE-ORIENTATION TEXT INPUT BOARD */}
      {isMobile && activeWidget === 'notes' && (
        <div style={{ ...mobileBottomSheetShell, maxHeight: '42svh' }}>
          <div style={mobileSheetHandle} />
          <button onClick={() => setActiveWidget('none')} style={mobileSheetCloseButton}>Dismiss Command</button>
          <div style={mobileSheetScrollBody}>
            <label style={{ ...widgetSectionLabel, display: 'block', marginBottom: '12px', textAlign: 'center' }}>
              Natural Language Director Voice Input
            </label>
            <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
              <DirectorNotes selectedId={selectedCharacterId} onExecuteCommand={handleExecuteCommand} />
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR GRID LAYOUT */}
      {!isMobile && (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', zIndex: 5, position: 'relative', pointerEvents: 'none' }}>
          <div style={{ flex: 1 }} />
          <div style={{ width: '340px', height: '100vh', backgroundColor: '#18181c', borderLeft: '1px solid #29292e', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
            <CinematicBar 
              onApplyCameraPreset={handleApplyCameraPreset} currentMood={sceneState.mood}
              onChangeMood={(m) => setSceneState(prev => ({ ...prev, mood: m }))}
              onSaveScene={() => exportSceneState(sceneState)} onLoadFileTrigger={() => fileInputRef.current?.click()}
            />
            {/* CLEAN OVERFLOW BLOCK: Height-constrained scroll pool balances dynamic sidebar rendering */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedCharacter && selectedJointKey && (
                <PosePartWidget
                  character={selectedCharacter}
                  jointKey={selectedJointKey}
                  placement="sidebar"
                  onUpdateJoint={handleUpdateJoint}
                  onResetJoint={handleResetJoint}
                  onClose={() => setSelectedJointKey(null)}
                />
              )}
              <ControlPanel characters={sceneState.characters} selectedId={selectedCharacterId} onUpdateCharacter={handleUpdateCharacter} />
              <div style={{ padding: '14px', marginTop: 'auto' }}>
                <DirectorNotes selectedId={selectedCharacterId} onExecuteCommand={handleExecuteCommand} />
              </div>
            </div>
            <DebugPanel sceneState={sceneState} />
          </div>
        </div>
      )}
    </div>
  );
}

// STYLING SPEC HOOK TRANSLATIONS
const floatingChatIcon: React.CSSProperties = {
  position: 'absolute', top: '16px', left: '16px', zIndex: 15,
  width: '44px', height: '44px', borderRadius: '50%', background: '#ff79c6',
  border: 'none', color: '#121214', fontSize: '1.2rem', fontWeight: 'bold',
  cursor: 'pointer', boxShadow: '0 4px 16px rgba(255, 121, 198, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const navigationDeckWrapper: React.CSSProperties = {
  position: 'absolute', bottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 12px)',
  left: '50%', transform: 'translateX(-50%)', zIndex: 10,
  display: 'flex', gap: '8px', width: '92%', maxWidth: '380px',
  background: 'rgba(30, 30, 36, 0.95)', padding: '8px', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
  pointerEvents: 'auto'
};

const mobileFabStyle: React.CSSProperties = {
  flex: 1, padding: '10px 4px', background: 'transparent', border: 'none',
  borderRadius: '12px', color: '#f8f8f2', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center'
};

const mobileWidgetFullscreenShell: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, width: '100vw', height: '100svh',
  backgroundColor: '#141416', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden'
};

const mobileBottomSheetShell: React.CSSProperties = {
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: '0',
  zIndex: 100,
  width: '100vw',
  maxHeight: '56svh',
  minHeight: '220px',
  background: 'rgba(20, 20, 24, 0.96)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '18px 18px 0 0',
  boxShadow: '0 -18px 42px rgba(0, 0, 0, 0.58)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  pointerEvents: 'auto'
};

const mobileSheetHandle: React.CSSProperties = {
  width: '44px',
  height: '4px',
  borderRadius: '999px',
  background: 'rgba(248, 248, 242, 0.28)',
  margin: '10px auto 6px auto',
  flexShrink: 0
};

const mobileSheetCloseButton: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px 10px 12px',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  color: '#ff79c6',
  fontSize: '0.72rem',
  fontWeight: 'bold',
  textAlign: 'center',
  cursor: 'pointer',
  flexShrink: 0
};

const mobileSheetScrollBody: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '14px 16px calc(max(22px, env(safe-area-inset-bottom)) + 8px) 16px',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  boxSizing: 'border-box'
};

const mobileClosePanelBar: React.CSSProperties = {
  width: '100%', padding: '14px', background: '#1c1d24', border: 'none',
  borderBottom: '1px solid #23232a', color: '#ff5555', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer'
};

const widgetScrollBodyContainer: React.CSSProperties = {
  flex: 1, width: '100%', padding: '16px 16px 40px 16px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box'
};

const widgetSectionLabel: React.CSSProperties = {
  fontSize: '0.65rem', color: '#6272a4', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px'
};

const widgetActionButton: React.CSSProperties = {
  padding: '12px 10px', background: '#21222c', border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: '8px', color: '#f8f8f2', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
};
