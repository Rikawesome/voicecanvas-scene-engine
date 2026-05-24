import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CharacterState, HandGestureKey, JointTransform, PoseJointKey } from '../types/scene';

interface ActorMannequinProps {
  character: CharacterState;
  isSelected: boolean;
  selectedJointKey: PoseJointKey | null;
  onSelect: (id: string) => void;
  onSelectJoint: (characterId: string, jointKey: PoseJointKey) => void;
}

type RigRefs = Partial<Record<PoseJointKey, THREE.Group>>;

const ZERO_ROTATION: JointTransform = { x: 0, y: 0, z: 0 };
const _targetPosition = new THREE.Vector3();
const _targetEuler = new THREE.Euler();
const _targetQuaternion = new THREE.Quaternion();

const skinPalette = {
  riku: {
    primary: '#3ed6ff',
    secondary: '#1f6dff',
    trim: '#f7f7ff',
    joint: '#111827'
  },
  kiki: {
    primary: '#ff7a45',
    secondary: '#ff2e7a',
    trim: '#fff2cc',
    joint: '#171318'
  }
};

function applyJointRotation(group: THREE.Group | undefined, rot: JointTransform | undefined) {
  if (!group) return;
  const safeRot = rot || ZERO_ROTATION;
  group.rotation.set(
    THREE.MathUtils.degToRad(safeRot.x),
    THREE.MathUtils.degToRad(safeRot.y),
    THREE.MathUtils.degToRad(safeRot.z)
  );
}

function partMaterialProps(color: string, selected: boolean) {
  return {
    color: selected ? '#fff36d' : color,
    emissive: selected ? '#ffe45c' : '#000000',
    emissiveIntensity: selected ? 0.55 : 0,
    roughness: selected ? 0.35 : 0.55,
    metalness: selected ? 0.08 : 0.05
  };
}

function LimbSegment({
  length,
  radius,
  color,
  selected = false,
  y = -0.5,
}: {
  length: number;
  radius: number;
  color: string;
  selected?: boolean;
  y?: number;
}) {
  return (
    <mesh position={[0, y * length, 0]} castShadow receiveShadow>
      <capsuleGeometry args={[radius, length, 8, 14]} />
      <meshStandardMaterial {...partMaterialProps(color, selected)} />
    </mesh>
  );
}

function JointBall({ color, radius = 0.075, selected = false }: { color: string; radius?: number; selected?: boolean }) {
  return (
    <mesh castShadow>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial {...partMaterialProps(color, selected)} roughness={0.48} />
    </mesh>
  );
}

function HandSymbol({
  gesture = 'openPalm',
  color,
  selected = false,
}: {
  gesture?: HandGestureKey;
  color: string;
  selected?: boolean;
}) {
  const materialProps = partMaterialProps(color, selected);

  if (gesture === 'fist') {
    return (
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (gesture === 'pointing') {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.06, 14, 14]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, -0.13, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.026, 0.2, 6, 10]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.04, 0.08, 10]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>
    );
  }

  if (gesture === 'grip') {
    return (
      <mesh rotation={[0, 0, Math.PI / 4]} castShadow receiveShadow>
        <torusGeometry args={[0.055, 0.018, 8, 18]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (gesture === 'blockingPalm') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 0.035, 0.14]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, -0.025, 0.075]} castShadow receiveShadow>
          <boxGeometry args={[0.13, 0.025, 0.025]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>
    );
  }

  if (gesture === 'sign') {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[-0.035, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.018, 0.15, 5, 8]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0.035, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.018, 0.15, 5, 8]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[0.16, 0.035, 0.12]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
}

export function ActorMannequin({
  character,
  isSelected,
  selectedJointKey,
  onSelect,
  onSelectJoint,
}: ActorMannequinProps) {
  const rootRef = useRef<THREE.Group>(null);
  const rigRefs = useRef<RigRefs>({});
  const palette = character.id.includes('kiki') ? skinPalette.kiki : skinPalette.riku;

  const isPartSelected = (jointKey: PoseJointKey) => isSelected && selectedJointKey === jointKey;
  const handlePartClick = (event: any, jointKey: PoseJointKey) => {
    event.stopPropagation();
    onSelectJoint(character.id, jointKey);
  };

  useFrame(() => {
    if (!rootRef.current) return;

    _targetPosition.set(character.position.x, character.position.y, character.position.z);
    rootRef.current.position.lerp(_targetPosition, 0.18);

    _targetEuler.set(
      THREE.MathUtils.degToRad(character.rotation.x),
      THREE.MathUtils.degToRad(character.rotation.y),
      THREE.MathUtils.degToRad(character.rotation.z)
    );
    _targetQuaternion.setFromEuler(_targetEuler);
    rootRef.current.quaternion.slerp(_targetQuaternion, 0.18);

    const sk = character.skeleton;
    applyJointRotation(rigRefs.current.pelvis, sk.pelvis);
    applyJointRotation(rigRefs.current.torso, sk.torso);
    applyJointRotation(rigRefs.current.head, sk.head);
    applyJointRotation(rigRefs.current.leftUpperArm, sk.leftUpperArm);
    applyJointRotation(rigRefs.current.leftForearm, sk.leftForearm);
    applyJointRotation(rigRefs.current.leftHandTerminal, sk.leftHandTerminal);
    applyJointRotation(rigRefs.current.rightUpperArm, sk.rightUpperArm);
    applyJointRotation(rigRefs.current.rightForearm, sk.rightForearm);
    applyJointRotation(rigRefs.current.rightHandTerminal, sk.rightHandTerminal);
    applyJointRotation(rigRefs.current.leftThigh, sk.leftThigh);
    applyJointRotation(rigRefs.current.leftShin, sk.leftShin);
    applyJointRotation(rigRefs.current.leftFoot, sk.leftFoot);
    applyJointRotation(rigRefs.current.rightThigh, sk.rightThigh);
    applyJointRotation(rigRefs.current.rightShin, sk.rightShin);
    applyJointRotation(rigRefs.current.rightFoot, sk.rightFoot);
  });

  return (
    <group
      ref={rootRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(character.id);
      }}
    >
      {isSelected && (
        <mesh position={[0, 1.05, 0]} raycast={() => null}>
          <boxGeometry args={[1.15, 2.1, 1.0]} />
          <meshBasicMaterial color="#00f3ff" wireframe transparent opacity={0.42} />
        </mesh>
      )}

      <group
        ref={(node) => { if (node) rigRefs.current.pelvis = node; }}
        position={[0, 0.95, 0]}
        onClick={(e) => handlePartClick(e, 'pelvis')}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.28, 0.3]} />
          <meshStandardMaterial {...partMaterialProps(palette.secondary, isPartSelected('pelvis'))} />
        </mesh>

        <group
          ref={(node) => { if (node) rigRefs.current.torso = node; }}
          position={[0, 0.18, 0]}
          onClick={(e) => handlePartClick(e, 'torso')}
        >
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.64, 0.72, 0.34]} />
            <meshStandardMaterial {...partMaterialProps(palette.primary, isPartSelected('torso'))} />
          </mesh>
          <mesh position={[0, 0.75, 0.01]} castShadow receiveShadow>
            <boxGeometry args={[0.72, 0.12, 0.36]} />
            <meshStandardMaterial {...partMaterialProps(palette.trim, isPartSelected('torso'))} />
          </mesh>

          <group
            ref={(node) => { if (node) rigRefs.current.head = node; }}
            position={[0, 0.92, 0]}
            onClick={(e) => handlePartClick(e, 'head')}
          >
            <JointBall color={palette.joint} radius={0.055} selected={isPartSelected('head')} />
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <sphereGeometry args={[0.19, 24, 24]} />
              <meshStandardMaterial {...partMaterialProps(palette.trim, isPartSelected('head'))} />
            </mesh>
            <mesh position={[0, 0.2, 0.15]} castShadow>
              <boxGeometry args={[0.19, 0.045, 0.025]} />
              <meshStandardMaterial {...partMaterialProps(palette.joint, isPartSelected('head'))} />
            </mesh>
          </group>

          <group
            ref={(node) => { if (node) rigRefs.current.leftUpperArm = node; }}
            position={[-0.43, 0.73, 0]}
            rotation={[0, 0, THREE.MathUtils.degToRad(-12)]}
            onClick={(e) => handlePartClick(e, 'leftUpperArm')}
          >
            <JointBall color={palette.joint} selected={isPartSelected('leftUpperArm')} />
            <LimbSegment length={0.46} radius={0.055} color={palette.primary} selected={isPartSelected('leftUpperArm')} />
            <group
              ref={(node) => { if (node) rigRefs.current.leftForearm = node; }}
              position={[0, -0.46, 0]}
              onClick={(e) => handlePartClick(e, 'leftForearm')}
            >
              <JointBall color={palette.joint} radius={0.06} selected={isPartSelected('leftForearm')} />
              <LimbSegment length={0.42} radius={0.048} color={palette.secondary} selected={isPartSelected('leftForearm')} />
              <group
                ref={(node) => { if (node) rigRefs.current.leftHandTerminal = node; }}
                position={[0, -0.43, 0]}
                onClick={(e) => handlePartClick(e, 'leftHandTerminal')}
              >
                <HandSymbol
                  color={palette.trim}
                  gesture={character.handGestures?.left}
                  selected={isPartSelected('leftHandTerminal')}
                />
              </group>
            </group>
          </group>

          <group
            ref={(node) => { if (node) rigRefs.current.rightUpperArm = node; }}
            position={[0.43, 0.73, 0]}
            rotation={[0, 0, THREE.MathUtils.degToRad(12)]}
            onClick={(e) => handlePartClick(e, 'rightUpperArm')}
          >
            <JointBall color={palette.joint} selected={isPartSelected('rightUpperArm')} />
            <LimbSegment length={0.46} radius={0.055} color={palette.primary} selected={isPartSelected('rightUpperArm')} />
            <group
              ref={(node) => { if (node) rigRefs.current.rightForearm = node; }}
              position={[0, -0.46, 0]}
              onClick={(e) => handlePartClick(e, 'rightForearm')}
            >
              <JointBall color={palette.joint} radius={0.06} selected={isPartSelected('rightForearm')} />
              <LimbSegment length={0.42} radius={0.048} color={palette.secondary} selected={isPartSelected('rightForearm')} />
              <group
                ref={(node) => { if (node) rigRefs.current.rightHandTerminal = node; }}
                position={[0, -0.43, 0]}
                onClick={(e) => handlePartClick(e, 'rightHandTerminal')}
              >
                <HandSymbol
                  color={palette.trim}
                  gesture={character.handGestures?.right}
                  selected={isPartSelected('rightHandTerminal')}
                />
              </group>
            </group>
          </group>
        </group>

        <group
          ref={(node) => { if (node) rigRefs.current.leftThigh = node; }}
          position={[-0.18, -0.14, 0]}
          onClick={(e) => handlePartClick(e, 'leftThigh')}
        >
          <JointBall color={palette.joint} radius={0.07} selected={isPartSelected('leftThigh')} />
          <LimbSegment length={0.56} radius={0.07} color={palette.primary} selected={isPartSelected('leftThigh')} />
          <group
            ref={(node) => { if (node) rigRefs.current.leftShin = node; }}
            position={[0, -0.56, 0]}
            onClick={(e) => handlePartClick(e, 'leftShin')}
          >
            <JointBall color={palette.joint} radius={0.065} selected={isPartSelected('leftShin')} />
            <LimbSegment length={0.55} radius={0.056} color={palette.secondary} selected={isPartSelected('leftShin')} />
            <group
              ref={(node) => { if (node) rigRefs.current.leftFoot = node; }}
              position={[0, -0.56, 0.05]}
              onClick={(e) => handlePartClick(e, 'leftFoot')}
            >
              <mesh position={[0, -0.035, 0.09]} castShadow receiveShadow>
                <boxGeometry args={[0.18, 0.09, 0.34]} />
                <meshStandardMaterial {...partMaterialProps(palette.trim, isPartSelected('leftFoot'))} />
              </mesh>
            </group>
          </group>
        </group>

        <group
          ref={(node) => { if (node) rigRefs.current.rightThigh = node; }}
          position={[0.18, -0.14, 0]}
          onClick={(e) => handlePartClick(e, 'rightThigh')}
        >
          <JointBall color={palette.joint} radius={0.07} selected={isPartSelected('rightThigh')} />
          <LimbSegment length={0.56} radius={0.07} color={palette.primary} selected={isPartSelected('rightThigh')} />
          <group
            ref={(node) => { if (node) rigRefs.current.rightShin = node; }}
            position={[0, -0.56, 0]}
            onClick={(e) => handlePartClick(e, 'rightShin')}
          >
            <JointBall color={palette.joint} radius={0.065} selected={isPartSelected('rightShin')} />
            <LimbSegment length={0.55} radius={0.056} color={palette.secondary} selected={isPartSelected('rightShin')} />
            <group
              ref={(node) => { if (node) rigRefs.current.rightFoot = node; }}
              position={[0, -0.56, 0.05]}
              onClick={(e) => handlePartClick(e, 'rightFoot')}
            >
              <mesh position={[0, -0.035, 0.09]} castShadow receiveShadow>
                <boxGeometry args={[0.18, 0.09, 0.34]} />
                <meshStandardMaterial {...partMaterialProps(palette.trim, isPartSelected('rightFoot'))} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
