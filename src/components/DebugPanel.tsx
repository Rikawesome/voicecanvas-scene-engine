import React, { useState, useMemo } from 'react';
import { SceneState } from '../types/scene';

interface DebugPanelProps {
  sceneState: SceneState;
}

export function DebugPanel({ sceneState }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // High-visibility stream optimization: strips un-rotated bones out of the log preview
  const optimizedLogData = useMemo(() => {
    return {
      sceneId: sceneState.sceneId,
      mood: sceneState.mood,
      camera: sceneState.camera,
      characters: sceneState.characters.map(char => {
        // Collect only the skeletal joints that are actively transformed
        const activeJoints = Object.entries(char.skeleton).reduce((acc, [boneName, rot]) => {
          if (rot.x !== 0 || rot.y !== 0 || rot.z !== 0) {
            acc[boneName] = rot;
          }
          return acc;
        }, {} as Record<string, any>);

        return {
          id: char.id,
          name: char.name,
          position: char.position,
          rotation: char.rotation,
          poseName: char.poseName,
          currentStance: char.currentStance,
          currentAction: char.currentAction,
          activeSkeletalJoints: Object.keys(activeJoints).length > 0 ? activeJoints : "ALL_BONES_AT_REST"
        };
      })
    };
  }, [sceneState]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', backgroundColor: '#18181f' }}>
      {/* Panel Toggle Bar Header */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: '#282a36',
          border: 'none',
          borderTop: '1px solid #29292e',
          color: '#6272a4',
          textAlign: 'left',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>💻 DEVELOPER CONSOLE LOGS</span>
        <span style={{ color: isOpen ? '#ff79c6' : '#50fa7b' }}>
          {isOpen ? '▼ HIDE' : '▲ SHOW LIVE DATA'}
        </span>
      </button>

      {/* Collapsible Section Area */}
      {isOpen && (
        <pre style={{
          margin: 0,
          padding: '16px',
          maxHeight: '220px',
          overflow: 'auto',
          backgroundColor: '#111217',
          color: '#50fa7b',
          fontSize: '0.72rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {JSON.stringify(optimizedLogData, null, 2)}
        </pre>
      )}
    </div>
  );
}