import { useState, useEffect, useRef } from 'react';
import { SceneState, CharacterState, PoseJointKey, SceneMood, CanvasInstruction, SceneBeatKey, CameraIntent, PoseVariant } from './types/scene';
import { CanvasView } from './components/CanvasView';
import { ControlPanel } from './components/ControlPanel';
import { DebugPanel } from './components/DebugPanel';
import { DirectorNotes } from './components/DirectorNotes';
import { CinematicBar } from './components/CinematicBar';
import { PosePartWidget } from './components/PosePartWidget';
// CRITICAL FIX: Targeted our optimized NLP token script directly
import { applyCanvasInstruction, parseDirectorNotes, planCameraFromIntent, SCENE_BEAT_PRESETS } from './utils/CommandParser';
import { exportSceneState, importSceneState } from './utils/persistence';
import { DEFAULT_SKELETON, POSE_DEFINITIONS, compilePose } from './constants/poses';

const LOCAL_STORAGE_KEY = 'voicecanvas-m5-rig-pose-autosave';
const INSTRUCTION_EXAMPLES: Record<string, string> = {
  'Guard vs Point': JSON.stringify({
    actors: [
      { actor: 'Riku', basePose: 'guard', target: 'Kiki', modifiers: ['defensive', 'leanBackward'] },
      { actor: 'Kiki', basePose: 'point', target: 'Riku', modifiers: ['aggressive', 'lookAtTarget'] }
    ],
    relationships: [{ type: 'faceEachOther' }],
    camera: 'standoff',
    mood: 'suspense'
  }, null, 2),
  'Impact Test': JSON.stringify({
    actors: [
      { actor: 'Riku', basePose: 'recoil', target: 'Kiki', modifiers: ['leanBackward'] },
      { actor: 'Kiki', basePose: 'punch', target: 'Riku', modifiers: ['aggressive', 'extendPunch'] }
    ],
    relationships: [
      { type: 'faceEachOther' },
      { type: 'moveCloser', actorId: 'char-kiki', targetId: 'char-riku' }
    ],
    camera: 'impactFrame',
    composition: 'attackerForeground',
    mood: 'dramatic'
  }, null, 2),
  'Three Actor Standoff': JSON.stringify({
    actors: [
      { actor: 'Riku', role: 'defender', basePose: 'guard', target: 'Kanata', modifiers: ['defensive'] },
      { actor: 'Kiki', role: 'support', basePose: 'ready', target: 'Kanata', modifiers: ['lookAtTarget'] },
      { actor: 'Kanata', role: 'attacker', basePose: 'point', target: 'Riku', modifiers: ['aggressive', 'lookAtTarget'] }
    ],
    relationships: [{ type: 'standoff' }, { type: 'faceEachOther' }],
    focusActors: ['Riku', 'Kiki', 'Kanata'],
    camera: 'groupShot',
    composition: 'observerWide',
    mood: 'suspense'
  }, null, 2)
};

const INITIAL_SCENE_STATE: SceneState = {
  sceneId: "voicecanvas-milestone-4",
  mood: "neutral",
  camera: { position: { x: 0, y: 3, z: 6 }, target: { x: 0, y: 0.5, z: 0 } },
  characters: [
    {
      id: "char-riku",
      name: "Riku (Lead)",
      role: "lead",
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
      role: "rival",
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
const SCENE_BEAT_KEYS = Object.keys(SCENE_BEAT_PRESETS) as SceneBeatKey[];
const QA_POSE_KEYS = Object.keys(POSE_DEFINITIONS);
const QA_PUNCH_VARIANTS: Array<{ label: string; variant: PoseVariant }> = [
  { label: 'Jab', variant: 'jab' },
  { label: 'Cross', variant: 'cross' },
  { label: 'Hook', variant: 'hook' },
  { label: 'Uppercut', variant: 'uppercut' }
];
const QA_RUN_VARIANTS: Array<{ label: string; variant: PoseVariant }> = [
  { label: 'Run Forward', variant: 'runForward' },
  { label: 'Chase Drive', variant: 'chaseDrive' },
  { label: 'Dash Start', variant: 'dashStart' },
  { label: 'Look Back Run', variant: 'lookBackRun' }
];
const QA_GUARD_VARIANTS: Array<{ label: string; variant: PoseVariant }> = [
  { label: 'Boxing Guard', variant: 'boxingGuard' },
  { label: 'High Guard', variant: 'highGuard' },
  { label: 'Low Guard', variant: 'lowGuard' },
  { label: 'Side Guard', variant: 'sideGuard' },
  { label: 'Cautious Guard', variant: 'cautiousGuard' }
];
const QA_BLOCK_VARIANTS: Array<{ label: string; variant: PoseVariant }> = [
  { label: 'Intercept Block', variant: 'interceptBlock' }
];
const DIRECTOR_CAMERA_PRESETS: Array<{ label: string; intent: CameraIntent }> = [
  { label: 'Two-Shot', intent: 'twoShot' },
  { label: 'Group Shot', intent: 'groupShot' },
  { label: 'Establishing', intent: 'establishing' },
  { label: 'Impact Frame', intent: 'impactFrame' },
  { label: 'Reaction', intent: 'reactionFrame' },
  { label: 'OTS', intent: 'ots' },
  { label: 'Low Power', intent: 'dominanceLowAngle' },
  { label: 'High Vulnerable', intent: 'vulnerabilityHighAngle' }
];

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
  const [instructionDraft, setInstructionDraft] = useState('');
  const [lastInstruction, setLastInstruction] = useState<CanvasInstruction | null>(null);
  const [instructionFeedback, setInstructionFeedback] = useState<string>('Ready for structured canvas instructions.');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sceneState));
  }, [sceneState]);

  const handleApplyCameraPreset = (type: CameraIntent, closeMobileSheet = true) => {
    const activeId = selectedCharacterId || sceneState.characters[0]?.id;
    const opposingId = sceneState.characters.find((c) => c.id !== activeId)?.id;
    const groupFocus = sceneState.characters.map((c) => c.id);
    const pairedFocus = [activeId, opposingId].filter(Boolean) as string[];
    const focusIds = ['groupShot', 'establishing', 'standoff', 'wide'].includes(type)
      ? groupFocus
      : pairedFocus.length > 1 ? pairedFocus : groupFocus;
    const nextCam = planCameraFromIntent(type, sceneState.characters, sceneState.camera, focusIds);

    if (nextCam) setSceneState(prev => ({ ...prev, camera: nextCam }));
    if (isMobile && closeMobileSheet) setActiveWidget('none');
  };

  const handleResetQaStage = () => {
    setSceneState(JSON.parse(JSON.stringify(INITIAL_SCENE_STATE)));
    setSelectedCharacterId('char-riku');
    setSelectedJointKey(null);
    setInstructionFeedback('QA stage reset to two neutral actors.');
  };

  const handleApplyQaPose = (poseKey: string, variant?: PoseVariant) => {
    const activeId = selectedCharacterId || sceneState.characters[0]?.id;
    const definition = POSE_DEFINITIONS[poseKey];
    if (!activeId || !definition) return;

    const compiled = compilePose({ basePose: poseKey, variant });
    const stanceMap: Record<string, string> = {
      punch: 'guard',
      block: 'guard',
      point: 'ready',
      push: 'ready',
      recoil: 'dodge'
    };
    const isActionPose = ['punch', 'block', 'point', 'push', 'recoil'].includes(poseKey);
    const nextStance = isActionPose ? stanceMap[poseKey] : poseKey;
    const nextAction = isActionPose ? poseKey : poseKey === 'ready' || poseKey === 'guard' ? poseKey : 'none';

    setSceneState((prev) => ({
      ...prev,
      characters: prev.characters.map((char) => char.id === activeId
        ? {
            ...char,
            poseName: poseKey,
            currentStance: nextStance,
            currentAction: nextAction,
            skeleton: compiled.skeleton,
            handGestures: compiled.handGestures
          }
        : char)
    }));
    setInstructionFeedback(`QA pose applied to active actor: ${variant ? `${definition.name} / ${variant}` : definition.name}.`);
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

  const handleRemoveCharacter = (id: string) => {
    setSceneState((prev) => {
      if (prev.characters.length <= 1) return prev;
      const nextCharacters = prev.characters.filter((char) => char.id !== id);
      return { ...prev, characters: nextCharacters };
    });

    setSelectedCharacterId((currentId) => {
      if (currentId !== id) return currentId;
      const fallback = sceneState.characters.find((char) => char.id !== id);
      return fallback?.id || null;
    });

    setSelectedJointKey(null);
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

  const applyInstructionResult = (result: ReturnType<typeof applyCanvasInstruction>) => {
    setSceneState(prev => {
      let nextState = { ...prev };
      if (result.updatedCharacters) nextState.characters = result.updatedCharacters;
      if (result.updatedMood) nextState.mood = result.updatedMood;
      if (result.updatedCamera) nextState.camera = result.updatedCamera;
      return nextState;
    });
  };

  const handleApplyCanvasInstruction = (instruction: CanvasInstruction) => {
    const result = applyCanvasInstruction(instruction, sceneState.characters, selectedCharacterId, sceneState.camera, 'Canvas instruction');
    setLastInstruction(instruction);
    setInstructionFeedback(result.message || 'Instruction applied.');
    applyInstructionResult(result);
    if (isMobile) setActiveWidget('none');
  };

  const handleApplySceneBeat = (beat: SceneBeatKey) => {
    handleApplyCanvasInstruction(SCENE_BEAT_PRESETS[beat]);
  };

  const handleApplyInstructionDraft = () => {
    if (!instructionDraft.trim()) {
      setInstructionFeedback('Paste or choose a CanvasInstruction JSON object first.');
      return;
    }

    try {
      const parsed = JSON.parse(instructionDraft) as CanvasInstruction;
      if (!parsed || !Array.isArray(parsed.actors)) {
        setInstructionFeedback('Invalid instruction: expected an object with an actors array.');
        return;
      }
      handleApplyCanvasInstruction(parsed);
    } catch (error) {
      setInstructionFeedback('Invalid JSON: check commas, quotes, and brackets.');
      console.warn('Invalid CanvasInstruction JSON', error);
    }
  };

  const loadInstructionExample = (exampleKey: keyof typeof INSTRUCTION_EXAMPLES) => {
    setInstructionDraft(INSTRUCTION_EXAMPLES[exampleKey]);
    setInstructionFeedback(`${exampleKey} example loaded.`);
  };

  const renderQaPanel = () => (
    <div style={qaPanelStyle}>
      <div style={qaHeaderRow}>
        <label style={widgetSectionLabel}>Milestone 6 Staging QA</label>
        <button onClick={handleResetQaStage} style={qaResetButton}>Reset Stage</button>
      </div>
      <div style={qaHintStyle}>Cycle the active actor, scene beats, and camera frames to spot pose or framing drift.</div>
      <label style={qaSubLabel}>Pose Tests</label>
      <div style={qaButtonGrid}>
        {QA_POSE_KEYS.map((pose) => (
          <button key={pose} onClick={() => handleApplyQaPose(pose)} style={miniActionButton}>
            {pose.toUpperCase()}
          </button>
        ))}
      </div>
      <label style={qaSubLabel}>Punch Variant Tests</label>
      <div style={qaButtonGrid}>
        {QA_PUNCH_VARIANTS.map((punch) => (
          <button key={punch.variant} onClick={() => handleApplyQaPose('punch', punch.variant)} style={miniActionButton}>
            {punch.label}
          </button>
        ))}
      </div>
      <label style={qaSubLabel}>Run / Chase Variant Tests</label>
      <div style={qaButtonGrid}>
        {QA_RUN_VARIANTS.map((run) => (
          <button key={run.variant} onClick={() => handleApplyQaPose('run', run.variant)} style={miniActionButton}>
            {run.label}
          </button>
        ))}
      </div>
      <label style={qaSubLabel}>Guard Variant Tests</label>
      <div style={qaButtonGrid}>
        {QA_GUARD_VARIANTS.map((guard) => (
          <button key={guard.variant} onClick={() => handleApplyQaPose('guard', guard.variant)} style={miniActionButton}>
            {guard.label}
          </button>
        ))}
      </div>
      <label style={qaSubLabel}>Block Variant Tests</label>
      <div style={qaButtonGrid}>
        {QA_BLOCK_VARIANTS.map((block) => (
          <button key={block.variant} onClick={() => handleApplyQaPose('block', block.variant)} style={miniActionButton}>
            {block.label}
          </button>
        ))}
      </div>
      <label style={qaSubLabel}>Scene Beat Tests</label>
      <div style={qaButtonGrid}>
        {SCENE_BEAT_KEYS.map((beat) => (
          <button key={beat} onClick={() => handleApplySceneBeat(beat)} style={miniActionButton}>
            {beat.replace(/([A-Z])/g, ' $1').toUpperCase()}
          </button>
        ))}
      </div>
      <label style={qaSubLabel}>Camera Tests</label>
      <div style={qaButtonGrid}>
        {DIRECTOR_CAMERA_PRESETS.map((preset) => (
          <button key={preset.intent} onClick={() => handleApplyCameraPreset(preset.intent, false)} style={miniActionButton}>
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );

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
                    <div key={c.id} style={mobileActorChip}>
                      <button onClick={() => handleSelectCharacter(c.id)} style={{
                        ...widgetActionButton, flex: 1, padding: '10px 8px',
                        backgroundColor: selectedCharacterId === c.id ? '#ff79c6' : '#282a36',
                        color: selectedCharacterId === c.id ? '#121214' : '#f8f8f2'
                      }}>{c.name.split(' ')[0]}</button>
                      <button
                        onClick={() => handleRemoveCharacter(c.id)}
                        disabled={sceneState.characters.length <= 1}
                        title={`Remove ${c.name}`}
                        style={removeActorButton}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={widgetSectionLabel}>Cinematic Focus Presets</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  {DIRECTOR_CAMERA_PRESETS.map((preset) => (
                    <button key={preset.intent} onClick={() => handleApplyCameraPreset(preset.intent)} style={widgetActionButton}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={widgetSectionLabel}>Scene Beat Presets</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  {SCENE_BEAT_KEYS.map((beat) => (
                    <button key={beat} onClick={() => handleApplySceneBeat(beat)} style={widgetActionButton}>
                      {beat.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={widgetSectionLabel}>Canvas Instruction JSON</label>
                <div style={instructionExampleRow}>
                  {(Object.keys(INSTRUCTION_EXAMPLES) as Array<keyof typeof INSTRUCTION_EXAMPLES>).map((exampleKey) => (
                    <button key={exampleKey} onClick={() => loadInstructionExample(exampleKey)} style={miniActionButton}>
                      {exampleKey}
                    </button>
                  ))}
                </div>
                <textarea
                  value={instructionDraft}
                  onChange={(e) => setInstructionDraft(e.target.value)}
                  placeholder='{"actors":[{"actor":"Riku","basePose":"guard","target":"Kiki"}],"relationships":[{"type":"faceEachOther"}],"camera":"standoff","mood":"suspense"}'
                  style={instructionTextArea}
                />
                <button onClick={handleApplyInstructionDraft} style={{ ...widgetActionButton, width: '100%', marginTop: '8px', background: '#343746' }}>
                  Apply Instruction
                </button>
                <div style={instructionFeedbackStyle}>{instructionFeedback}</div>
              </div>
              {renderQaPanel()}
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
                <div key={c.id} style={mobileActorChip}>
                  <button onClick={() => handleSelectCharacter(c.id)} style={{
                    ...widgetActionButton, flex: 1, padding: '10px 8px',
                    backgroundColor: selectedCharacterId === c.id ? '#ff79c6' : '#282a36',
                    color: selectedCharacterId === c.id ? '#121214' : '#f8f8f2'
                  }}>{c.name.split(' ')[0]}</button>
                  <button
                    onClick={() => handleRemoveCharacter(c.id)}
                    disabled={sceneState.characters.length <= 1}
                    title={`Remove ${c.name}`}
                    style={removeActorButton}
                  >
                    x
                  </button>
                </div>
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
            <div style={desktopSidebarScrollBody}>
              <div style={desktopInstructionPanel}>
                <label style={widgetSectionLabel}>Actors On Canvas</label>
                <div style={desktopActorRoster}>
                  {sceneState.characters.map((c) => (
                    <div key={c.id} style={desktopActorRow}>
                      <button onClick={() => handleSelectCharacter(c.id)} style={{
                        ...miniActionButton,
                        flex: 1,
                        backgroundColor: selectedCharacterId === c.id ? '#ff79c6' : '#282a36',
                        color: selectedCharacterId === c.id ? '#121214' : '#f8f8f2'
                      }}>
                        {c.name.split(' ')[0]}
                      </button>
                      <button
                        onClick={() => handleRemoveCharacter(c.id)}
                        disabled={sceneState.characters.length <= 1}
                        title={`Remove ${c.name}`}
                        style={removeActorButton}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <label style={widgetSectionLabel}>Scene Beat Presets</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  {SCENE_BEAT_KEYS.map((beat) => (
                    <button key={beat} onClick={() => handleApplySceneBeat(beat)} style={widgetActionButton}>
                      {beat.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </button>
                  ))}
                </div>
                {renderQaPanel()}
                <label style={{ ...widgetSectionLabel, display: 'block', marginTop: '14px' }}>Canvas Instruction JSON</label>
                <div style={instructionExampleRow}>
                  {(Object.keys(INSTRUCTION_EXAMPLES) as Array<keyof typeof INSTRUCTION_EXAMPLES>).map((exampleKey) => (
                    <button key={exampleKey} onClick={() => loadInstructionExample(exampleKey)} style={miniActionButton}>
                      {exampleKey}
                    </button>
                  ))}
                </div>
                <textarea
                  value={instructionDraft}
                  onChange={(e) => setInstructionDraft(e.target.value)}
                  placeholder='{"actors":[{"actor":"Riku","basePose":"guard","target":"Kiki"}],"camera":"standoff"}'
                  style={instructionTextArea}
                />
                <button onClick={handleApplyInstructionDraft} style={{ ...widgetActionButton, width: '100%', marginTop: '8px', background: '#343746' }}>
                  Apply Instruction
                </button>
                <div style={instructionFeedbackStyle}>{instructionFeedback}</div>
              </div>
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
            <DebugPanel sceneState={sceneState} lastInstruction={lastInstruction} />
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

const mobileActorChip: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: '4px',
  flex: 1,
  minWidth: 0
};

const removeActorButton: React.CSSProperties = {
  width: '34px',
  minWidth: '34px',
  border: '1px solid rgba(255, 85, 85, 0.28)',
  borderRadius: '8px',
  background: 'rgba(255, 85, 85, 0.12)',
  color: '#ffb3b3',
  fontSize: '0.72rem',
  fontWeight: '900',
  cursor: 'pointer',
  textAlign: 'center'
};

const desktopSidebarScrollBody: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  paddingTop: '76px',
  scrollPaddingTop: '76px'
};

const desktopInstructionPanel: React.CSSProperties = {
  margin: '0 14px 0 14px',
  padding: '14px',
  background: '#1c1d24',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '8px'
};

const desktopActorRoster: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '7px',
  margin: '8px 0 14px 0'
};

const desktopActorRow: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  minWidth: 0
};

const instructionTextArea: React.CSSProperties = {
  width: '100%',
  minHeight: '86px',
  marginTop: '8px',
  padding: '10px',
  boxSizing: 'border-box',
  resize: 'vertical',
  background: '#111217',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: '#f8f8f2',
  fontSize: '0.72rem',
  lineHeight: 1.4,
  fontFamily: 'monospace',
  outline: 'none'
};

const instructionExampleRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '8px'
};

const miniActionButton: React.CSSProperties = {
  padding: '7px 9px',
  background: '#282a36',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '7px',
  color: '#bd93f9',
  fontSize: '0.66rem',
  fontWeight: '700',
  cursor: 'pointer'
};

const instructionFeedbackStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '8px 10px',
  borderRadius: '7px',
  background: 'rgba(17, 18, 23, 0.72)',
  color: '#8be9fd',
  fontSize: '0.68rem',
  lineHeight: 1.35
};

const qaPanelStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid rgba(241, 250, 140, 0.18)',
  background: 'rgba(241, 250, 140, 0.05)'
};

const qaHeaderRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px'
};

const qaResetButton: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: '7px',
  border: '1px solid rgba(255, 85, 85, 0.28)',
  background: 'rgba(255, 85, 85, 0.12)',
  color: '#ffb3b3',
  fontSize: '0.62rem',
  fontWeight: '800',
  cursor: 'pointer'
};

const qaHintStyle: React.CSSProperties = {
  marginTop: '8px',
  color: '#aeb6d8',
  fontSize: '0.66rem',
  lineHeight: 1.35
};

const qaSubLabel: React.CSSProperties = {
  ...widgetSectionLabel,
  display: 'block',
  marginTop: '12px',
  color: '#f1fa8c'
};

const qaButtonGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6px',
  marginTop: '7px'
};
