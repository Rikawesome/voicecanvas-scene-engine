import React from 'react';
import { CharacterState, JointTransform } from '../types/scene';

interface ControlPanelProps {
  characters: CharacterState[];
  selectedId: string | null;
  onUpdateCharacter: (id: string, updates: Partial<CharacterState>) => void;
}

export function ControlPanel({ characters, selectedId, onUpdateCharacter }: ControlPanelProps) {
  const activeChar = characters.find((c) => c.id === selectedId);

  if (!activeChar) {
    return (
      <div style={{ padding: '24px', color: '#6272a4', textAlign: 'center', fontSize: '0.85rem', lineHeight: '1.5' }}>
        👉 Tap an actor inside the 3D canvas view or selection list to direct their positioning and poses.
      </div>
    );
  }

  // ==========================================================================
  // TRANSFORMATION HANDLERS
  // ==========================================================================
  const updatePos = (axis: 'x' | 'y' | 'z', val: number) => {
    const updatedPosition = { ...activeChar.position, [axis]: val };
    onUpdateCharacter(activeChar.id, { position: updatedPosition });
  };

  const updateRot = (val: number) => {
    onUpdateCharacter(activeChar.id, { rotation: { x: 0, y: val, z: 0 } });
  };

  const handleJointSliderChange = (jointKey: string, axis: 'x' | 'y' | 'z', val: number) => {
    // FIX: Deep-merge existing skeleton state securely to avoid dropping unmapped terminal joints
    const currentSkeleton = activeChar.skeleton || {};
    const currentJoint = (currentSkeleton[jointKey as keyof typeof currentSkeleton] || { x: 0, y: 0, z: 0 }) as JointTransform;

    const updatedSkeleton = {
      ...currentSkeleton,
      [jointKey]: {
        ...currentJoint,
        [axis]: val
      }
    };
    
    onUpdateCharacter(activeChar.id, { skeleton: updatedSkeleton as any });
  };

  // Helper macro to generate individual limb sliders cleanly
  const renderJointControls = (label: string, jointKey: string, axes: ('x' | 'y' | 'z')[] = ['x']) => {
    const currentSkeleton = activeChar.skeleton || {};
    const joint = currentSkeleton[jointKey as keyof typeof currentSkeleton] as JointTransform;
    
    // Fallback safe vector defaults if state initialization hasn't filled them yet
    const safeJoint = joint || { x: 0, y: 0, z: 0 };
    
    return (
      <div key={jointKey} style={{ marginBottom: '10px', background: '#1c1d24', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: '0.68rem', color: '#ff79c6', fontWeight: 'bold', marginBottom: '6px', letterSpacing: '0.5px' }}>{label.toUpperCase()}</div>
        {axes.map((axis) => (
          <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: '#6272a4', width: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>{axis}</span>
            <input
              type="range" min="-180" max="180" step="1"
              value={safeJoint[axis] || 0}
              onChange={(e) => handleJointSliderChange(jointKey, axis, parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#ff79c6', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.65rem', color: '#f8f8f2', width: '32px', textAlign: 'right', fontFamily: 'monospace' }}>{safeJoint[axis]}°</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px', color: '#f8f8f2' }}>
      {/* HEADER SPECS */}
      <h3 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#8be9fd' }}>{activeChar.name}</h3>
      <div style={{ fontSize: '0.68rem', color: '#6272a4', marginBottom: '16px' }}>Pose Status: <span style={{ color: '#50fa7b', fontWeight: 'bold' }}>{activeChar.poseName.toUpperCase()}</span></div>

      {/* SECTION 1: GLOBAL SPATIAL STAGING CONTROLS */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #232326', paddingBottom: '16px' }}>
        <div style={{ fontSize: '0.72rem', color: '#6272a4', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>🌐 Scene Positioning</div>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#ff79c6', marginBottom: '4px' }}>
            <span>Horizontal Location (X)</span>
            <span style={{ fontFamily: 'monospace' }}>{activeChar.position.x}m</span>
          </label>
          <input 
            type="range" min="-10" max="10" step="0.1"
            style={{ width: '100%', accentColor: '#ff79c6', cursor: 'pointer' }}
            value={activeChar.position.x}
            onChange={(e) => updatePos('x', parseFloat(e.target.value))}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#50fa7b', marginBottom: '4px' }}>
            <span>Elevation Height (Y)</span>
            <span style={{ fontFamily: 'monospace' }}>{activeChar.position.y}m</span>
          </label>
          <input 
            type="range" min="0" max="5" step="0.1"
            style={{ width: '100%', accentColor: '#50fa7b', cursor: 'pointer' }}
            value={activeChar.position.y}
            onChange={(e) => updatePos('y', parseFloat(e.target.value))}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#8be9fd', marginBottom: '4px' }}>
            <span>Depth Position (Z)</span>
            <span style={{ fontFamily: 'monospace' }}>{activeChar.position.z}m</span>
          </label>
          <input 
            type="range" min="-10" max="10" step="0.1"
            style={{ width: '100%', accentColor: '#8be9fd', cursor: 'pointer' }}
            value={activeChar.position.z}
            onChange={(e) => updatePos('z', parseFloat(e.target.value))}
          />
        </div>

        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#f1fa8c', marginBottom: '4px' }}>
            <span>Facing Orientation Angle</span>
            <span style={{ fontFamily: 'monospace' }}>{activeChar.rotation.y}°</span>
          </label>
          <input 
            type="range" min="0" max="360" step="1"
            style={{ width: '100%', accentColor: '#f1fa8c', cursor: 'pointer' }}
            value={activeChar.rotation.y}
            onChange={(e) => updateRot(parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* SECTION 2: PROXY SKELETAL RIG CONTROLS */}
      <div>
        <div style={{ fontSize: '0.72rem', color: '#6272a4', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>🦴 Skeletal Rig Fine-Tuning</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {renderJointControls('Spine (Torso Tilt)', 'torso', ['x', 'y', 'z'])}
          {renderJointControls('Head Look Direction', 'head', ['x', 'y', 'z'])}
          {renderJointControls('Left Upper Shoulder', 'leftUpperArm', ['x', 'y', 'z'])}
          {renderJointControls('Right Upper Shoulder', 'rightUpperArm', ['x', 'y', 'z'])}
          {renderJointControls('Left Elbow Extend', 'leftForearm', ['x', 'y', 'z'])}
          {renderJointControls('Right Elbow Extend', 'rightForearm', ['x', 'y', 'z'])}
          {renderJointControls('Left Wrist Rotation', 'leftHandTerminal', ['x', 'y', 'z'])}
          {renderJointControls('Right Wrist Rotation', 'rightHandTerminal', ['x', 'y', 'z'])}
          {renderJointControls('Left Hip Joint', 'leftThigh', ['x', 'y', 'z'])}
          {renderJointControls('Right Hip Joint', 'rightThigh', ['x', 'y', 'z'])}
          {renderJointControls('Left Knee Joint', 'leftShin', ['x', 'y', 'z'])}
          {renderJointControls('Right Knee Joint', 'rightShin', ['x', 'y', 'z'])}
          {renderJointControls('Left Foot Anchor', 'leftFoot', ['x', 'y', 'z'])}
          {renderJointControls('Right Foot Anchor', 'rightFoot', ['x', 'y', 'z'])}
        </div>
      </div>
    </div>
  );
}
