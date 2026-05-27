import React from 'react';
import { CharacterState, JointTransform, PoseJointKey } from '../types/scene';

type ControlAxis = 'x' | 'y' | 'z';

interface PoseControl {
  axis: ControlAxis;
  label: string;
}

interface PosePartDefinition {
  label: string;
  controls: PoseControl[];
}

interface PosePartWidgetProps {
  character: CharacterState;
  jointKey: PoseJointKey;
  placement: 'sidebar' | 'bottom-sheet';
  onUpdateJoint: (jointKey: PoseJointKey, axis: ControlAxis, value: number) => void;
  onResetJoint: (jointKey: PoseJointKey) => void;
  onClose?: () => void;
}

const PART_DEFINITIONS: Record<PoseJointKey, PosePartDefinition> = {
  pelvis: {
    label: 'Hips',
    controls: [
      { axis: 'x', label: 'Lean' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Tilt' }
    ]
  },
  torso: {
    label: 'Torso',
    controls: [
      { axis: 'x', label: 'Lean' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Tilt' }
    ]
  },
  head: {
    label: 'Head',
    controls: [
      { axis: 'x', label: 'Look Up/Down' },
      { axis: 'y', label: 'Look Left/Right' },
      { axis: 'z', label: 'Tilt' }
    ]
  },
  leftUpperArm: {
    label: 'Left Arm',
    controls: [
      { axis: 'x', label: 'Raise' },
      { axis: 'y', label: 'Reach' },
      { axis: 'z', label: 'Open/Close' }
    ]
  },
  rightUpperArm: {
    label: 'Right Arm',
    controls: [
      { axis: 'x', label: 'Raise' },
      { axis: 'y', label: 'Reach' },
      { axis: 'z', label: 'Open/Close' }
    ]
  },
  leftForearm: {
    label: 'Left Elbow',
    controls: [
      { axis: 'x', label: 'Bend' },
      { axis: 'y', label: 'Twist' },
      { axis: 'z', label: 'Side Angle' }
    ]
  },
  rightForearm: {
    label: 'Right Elbow',
    controls: [
      { axis: 'x', label: 'Bend' },
      { axis: 'y', label: 'Twist' },
      { axis: 'z', label: 'Side Angle' }
    ]
  },
  leftHandTerminal: {
    label: 'Left Hand',
    controls: [
      { axis: 'x', label: 'Tilt' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Roll' }
    ]
  },
  rightHandTerminal: {
    label: 'Right Hand',
    controls: [
      { axis: 'x', label: 'Tilt' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Roll' }
    ]
  },
  leftThigh: {
    label: 'Left Leg',
    controls: [
      { axis: 'x', label: 'Step' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Open/Close' }
    ]
  },
  rightThigh: {
    label: 'Right Leg',
    controls: [
      { axis: 'x', label: 'Step' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Open/Close' }
    ]
  },
  leftShin: {
    label: 'Left Knee',
    controls: [
      { axis: 'x', label: 'Bend' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Side Angle' }
    ]
  },
  rightShin: {
    label: 'Right Knee',
    controls: [
      { axis: 'x', label: 'Bend' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Side Angle' }
    ]
  },
  leftFoot: {
    label: 'Left Foot',
    controls: [
      { axis: 'x', label: 'Toe Up/Down' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Roll' }
    ]
  },
  rightFoot: {
    label: 'Right Foot',
    controls: [
      { axis: 'x', label: 'Toe Up/Down' },
      { axis: 'y', label: 'Turn' },
      { axis: 'z', label: 'Roll' }
    ]
  }
};

const ZERO_JOINT: JointTransform = { x: 0, y: 0, z: 0 };
const SLIDER_MIN = -180;
const SLIDER_MAX = 180;

function clampValue(value: number) {
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, Math.round(value)));
}

function valueToPercent(value: number) {
  return ((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
}

function pointerToValue(clientX: number, rect: DOMRect) {
  const progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return clampValue(SLIDER_MIN + progress * (SLIDER_MAX - SLIDER_MIN));
}

function SemanticSlider({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const isDraggingRef = React.useRef(false);

  const applyPointerValue = (clientX: number, element: HTMLDivElement) => {
    onChange(pointerToValue(clientX, element.getBoundingClientRect()));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    isDraggingRef.current = true;
    element.setPointerCapture(event.pointerId);
    applyPointerValue(event.clientX, element);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    applyPointerValue(event.clientX, event.currentTarget);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    isDraggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    applyPointerValue(event.clientX, element);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      applyPointerValue(moveEvent.clientX, element);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange(clampValue(value - 5));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange(clampValue(value + 5));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(SLIDER_MIN);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(SLIDER_MAX);
    }
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-valuemin={SLIDER_MIN}
      aria-valuemax={SLIDER_MAX}
      aria-valuenow={value}
      style={semanticTrack}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div style={{ ...semanticFill, width: `${valueToPercent(value)}%` }} />
      <div style={{ ...semanticThumb, left: `${valueToPercent(value)}%` }} />
    </div>
  );
}

export function PosePartWidget({
  character,
  jointKey,
  placement,
  onUpdateJoint,
  onResetJoint,
  onClose
}: PosePartWidgetProps) {
  const definition = PART_DEFINITIONS[jointKey];
  const currentJoint = (character.skeleton[jointKey] || ZERO_JOINT) as JointTransform;
  const isBottomSheet = placement === 'bottom-sheet';
  const stopWidgetPointer = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };
  const updateControlValue = (axis: ControlAxis, value: number) => {
    onUpdateJoint(jointKey, axis, value);
  };

  return (
    <div
      style={isBottomSheet ? bottomSheetShell : sidebarShell}
      onPointerDown={stopWidgetPointer}
      onPointerMove={stopWidgetPointer}
      onMouseDown={stopWidgetPointer}
      onTouchStart={stopWidgetPointer}
    >
      <div style={headerRow}>
        <div>
          <div style={eyebrow}>{character.name.split(' ')[0]}</div>
          <div style={title}>{definition.label}</div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={iconButton} aria-label="Close selected body part">
            x
          </button>
        )}
      </div>

      <div style={controlStack}>
        {definition.controls.map((control) => (
          <label key={control.axis} style={controlRow}>
            <span style={controlLabel}>{control.label}</span>
            <SemanticSlider
              value={currentJoint[control.axis] || 0}
              onChange={(value) => updateControlValue(control.axis, value)}
            />
            <span style={valueLabel}>{currentJoint[control.axis] || 0}</span>
          </label>
        ))}
      </div>

      <button type="button" onClick={() => onResetJoint(jointKey)} style={resetButton}>
        Reset Part
      </button>
    </div>
  );
}

const sidebarShell: React.CSSProperties = {
  margin: '24px 16px 14px 16px',
  padding: '16px 14px 14px 14px',
  background: '#20212a',
  border: '1px solid rgba(255, 243, 109, 0.28)',
  borderRadius: '8px',
  color: '#f8f8f2',
  boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
  pointerEvents: 'auto',
  position: 'relative',
  zIndex: 20,
  scrollMarginTop: '24px'
};

const bottomSheetShell: React.CSSProperties = {
  position: 'absolute',
  left: '10px',
  right: '10px',
  bottom: 'calc(max(10px, env(safe-area-inset-bottom)) + 6px)',
  zIndex: 30,
  maxHeight: '42svh',
  overflowY: 'auto',
  padding: '14px',
  background: 'rgba(25, 26, 34, 0.96)',
  border: '1px solid rgba(255, 243, 109, 0.34)',
  borderRadius: '8px',
  color: '#f8f8f2',
  boxShadow: '0 -12px 34px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(10px)',
  pointerEvents: 'auto'
};

const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '10px',
  marginBottom: '12px'
};

const eyebrow: React.CSSProperties = {
  fontSize: '0.65rem',
  color: '#8be9fd',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  letterSpacing: '0.5px'
};

const title: React.CSSProperties = {
  fontSize: '1rem',
  color: '#fff36d',
  fontWeight: 800,
  lineHeight: 1.2
};

const iconButton: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#2d2e38',
  color: '#f8f8f2',
  cursor: 'pointer',
  fontWeight: 800
};

const controlStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  paddingTop: '2px'
};

const controlRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px minmax(0, 1fr) 34px',
  alignItems: 'center',
  gap: '10px'
};

const controlLabel: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#f8f8f2',
  fontWeight: 700,
  lineHeight: 1.1
};

const semanticTrack: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '30px',
  background: 'linear-gradient(to bottom, transparent 0 12px, rgba(255,255,255,0.24) 12px 18px, transparent 18px)',
  cursor: 'pointer',
  pointerEvents: 'auto',
  touchAction: 'none',
  userSelect: 'none',
  outline: 'none'
};

const semanticFill: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: '12px',
  height: '6px',
  borderRadius: '999px',
  background: '#fff36d',
  pointerEvents: 'none'
};

const semanticThumb: React.CSSProperties = {
  position: 'absolute',
  top: '5px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: '#fff36d',
  border: '2px solid #fff8b8',
  boxShadow: '0 0 10px rgba(255, 243, 109, 0.35)',
  transform: 'translateX(-50%)',
  pointerEvents: 'none'
};

const valueLabel: React.CSSProperties = {
  fontSize: '0.68rem',
  color: '#bd93f9',
  textAlign: 'right',
  fontFamily: 'monospace'
};

const resetButton: React.CSSProperties = {
  width: '100%',
  marginTop: '14px',
  padding: '10px 12px',
  background: '#2d2e38',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#f8f8f2',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '0.76rem'
};
