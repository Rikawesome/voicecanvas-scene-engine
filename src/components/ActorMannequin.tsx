import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
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
  },
  kanata: {
    primary: '#a78bfa',
    secondary: '#7c3aed',
    trim: '#f5f3ff',
    joint: '#181322'
  },
  mina: {
    primary: '#34d399',
    secondary: '#0f766e',
    trim: '#ecfdf5',
    joint: '#10231f'
  }
};

const paletteList = [skinPalette.riku, skinPalette.kiki, skinPalette.kanata, skinPalette.mina];

function getActorPalette(character: CharacterState) {
  const signature = `${character.id} ${character.name}`.toLowerCase();
  if (signature.includes('kiki')) return skinPalette.kiki;
  if (signature.includes('kanata')) return skinPalette.kanata;
  if (signature.includes('mina')) return skinPalette.mina;
  if (signature.includes('riku')) return skinPalette.riku;

  const hash = [...signature].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return paletteList[hash % paletteList.length];
}

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

function BodyBox({
  args,
  color,
  selected = false,
  position = [0, 0, 0],
  radius = 0.045,
}: {
  args: [number, number, number];
  color: string;
  selected?: boolean;
  position?: [number, number, number];
  radius?: number;
}) {
  return (
    <RoundedBox args={args} radius={radius} smoothness={5} position={position} castShadow receiveShadow>
      <meshStandardMaterial {...partMaterialProps(color, selected)} />
    </RoundedBox>
  );
}

function LimbSegment({
  length,
  radius,
  color,
  selected = false,
  y = -0.5,
  radiusTop,
  radiusBottom,
}: {
  length: number;
  radius: number;
  color: string;
  selected?: boolean;
  y?: number;
  radiusTop?: number;
  radiusBottom?: number;
}) {
  const top = radiusTop ?? radius;
  const bottom = radiusBottom ?? radius;

  return (
    <mesh position={[0, y * length, 0]} castShadow receiveShadow>
      {Math.abs(top - bottom) > 0.004
        ? <cylinderGeometry args={[top, bottom, length, 16, 1]} />
        : <capsuleGeometry args={[radius, length, 8, 14]} />}
      <meshStandardMaterial {...partMaterialProps(color, selected)} />
    </mesh>
  );
}

function JointBall({ color, radius = 0.06, selected = false }: { color: string; radius?: number; selected?: boolean }) {
  return (
    <mesh castShadow>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial {...partMaterialProps(color, selected)} roughness={0.48} />
    </mesh>
  );
}

function NeckColumn({ color, selected = false }: { color: string; selected?: boolean }) {
  return (
    <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
      <capsuleGeometry args={[0.075, 0.28, 10, 14]} />
      <meshStandardMaterial {...partMaterialProps(color, selected)} />
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
        <sphereGeometry args={[0.105, 16, 16]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (gesture === 'pointing') {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, -0.13, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.028, 0.23, 6, 10]} />
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
          <boxGeometry args={[0.2, 0.04, 0.15]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, -0.025, 0.075]} castShadow receiveShadow>
          <boxGeometry args={[0.14, 0.026, 0.026]} />
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
    <RoundedBox args={[0.18, 0.045, 0.13]} radius={0.018} smoothness={4} castShadow receiveShadow>
      <meshStandardMaterial {...materialProps} />
    </RoundedBox>
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
  const palette = getActorPalette(character);

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
        <mesh position={[0, 1.08, 0]} raycast={() => null}>
          <boxGeometry args={[1.14, 2.22, 0.88]} />
          <meshBasicMaterial color="#00f3ff" wireframe transparent opacity={0.42} />
        </mesh>
      )}

      <group
        ref={(node) => { if (node) rigRefs.current.pelvis = node; }}
        position={[0, 1.02, 0]}
        onClick={(e) => handlePartClick(e, 'pelvis')}
      >
        <BodyBox args={[0.48, 0.18, 0.3]} color={palette.secondary} selected={isPartSelected('pelvis')} position={[0, 0.03, 0]} radius={0.07} />
        <BodyBox args={[0.66, 0.16, 0.34]} color={palette.secondary} selected={isPartSelected('pelvis')} position={[0, -0.08, 0]} radius={0.075} />
        <mesh position={[-0.25, -0.13, 0]} raycast={() => null}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial {...partMaterialProps(palette.joint, isPartSelected('pelvis'))} />
        </mesh>
        <mesh position={[0.25, -0.13, 0]} raycast={() => null}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial {...partMaterialProps(palette.joint, isPartSelected('pelvis'))} />
        </mesh>

        <group
          ref={(node) => { if (node) rigRefs.current.torso = node; }}
          position={[0, 0.19, 0]}
          onClick={(e) => handlePartClick(e, 'torso')}
        >
          <BodyBox args={[0.38, 0.16, 0.26]} color={palette.secondary} selected={isPartSelected('torso')} position={[0, -0.02, 0]} radius={0.055} />
          <BodyBox args={[0.46, 0.34, 0.31]} color={palette.primary} selected={isPartSelected('torso')} position={[0, 0.2, 0]} radius={0.065} />
          <BodyBox args={[0.6, 0.21, 0.34]} color={palette.primary} selected={isPartSelected('torso')} position={[0, 0.44, 0]} radius={0.07} />
          <BodyBox args={[0.76, 0.12, 0.36]} color={palette.trim} selected={isPartSelected('torso')} position={[0, 0.61, 0.01]} radius={0.055} />
          <BodyBox args={[0.16, 0.12, 0.055]} color={palette.joint} selected={isPartSelected('torso')} position={[0, 0.4, 0.19]} />
          <mesh position={[-0.39, 0.62, 0]} raycast={() => null}>
            <sphereGeometry args={[0.065, 14, 14]} />
            <meshStandardMaterial {...partMaterialProps(palette.joint, isPartSelected('torso'))} />
          </mesh>
          <mesh position={[0.39, 0.62, 0]} raycast={() => null}>
            <sphereGeometry args={[0.065, 14, 14]} />
            <meshStandardMaterial {...partMaterialProps(palette.joint, isPartSelected('torso'))} />
          </mesh>

          <group
            ref={(node) => { if (node) rigRefs.current.head = node; }}
            position={[0, 0.75, 0]}
            onClick={(e) => handlePartClick(e, 'head')}
          >
            <JointBall color={palette.joint} radius={0.045} selected={isPartSelected('head')} />
            <NeckColumn color={palette.trim} selected={isPartSelected('head')} />
            <BodyBox args={[0.18, 0.08, 0.16]} color={palette.trim} selected={isPartSelected('head')} position={[0, -0.06, 0]} radius={0.035} />
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
              <sphereGeometry args={[0.19, 24, 24]} />
              <meshStandardMaterial {...partMaterialProps(palette.trim, isPartSelected('head'))} />
            </mesh>
            <mesh position={[0, 0.25, 0.155]} castShadow>
              <boxGeometry args={[0.15, 0.04, 0.026]} />
              <meshStandardMaterial {...partMaterialProps(palette.joint, isPartSelected('head'))} />
            </mesh>
            <mesh position={[0, 0.18, 0.17]} castShadow>
              <boxGeometry args={[0.06, 0.035, 0.026]} />
              <meshStandardMaterial {...partMaterialProps(palette.joint, isPartSelected('head'))} />
            </mesh>
          </group>

          <group
            ref={(node) => { if (node) rigRefs.current.leftUpperArm = node; }}
            position={[-0.39, 0.61, 0]}
            rotation={[0, 0, THREE.MathUtils.degToRad(-12)]}
            onClick={(e) => handlePartClick(e, 'leftUpperArm')}
          >
            <JointBall color={palette.joint} selected={isPartSelected('leftUpperArm')} />
            <LimbSegment length={0.5} radius={0.048} radiusTop={0.055} radiusBottom={0.043} color={palette.primary} selected={isPartSelected('leftUpperArm')} />
            <group
              ref={(node) => { if (node) rigRefs.current.leftForearm = node; }}
              position={[0, -0.5, 0]}
              onClick={(e) => handlePartClick(e, 'leftForearm')}
            >
              <JointBall color={palette.joint} radius={0.052} selected={isPartSelected('leftForearm')} />
              <LimbSegment length={0.45} radius={0.042} radiusTop={0.043} radiusBottom={0.035} color={palette.secondary} selected={isPartSelected('leftForearm')} />
              <group
                ref={(node) => { if (node) rigRefs.current.leftHandTerminal = node; }}
                position={[0, -0.47, 0]}
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
            position={[0.39, 0.61, 0]}
            rotation={[0, 0, THREE.MathUtils.degToRad(12)]}
            onClick={(e) => handlePartClick(e, 'rightUpperArm')}
          >
            <JointBall color={palette.joint} selected={isPartSelected('rightUpperArm')} />
            <LimbSegment length={0.5} radius={0.048} radiusTop={0.055} radiusBottom={0.043} color={palette.primary} selected={isPartSelected('rightUpperArm')} />
            <group
              ref={(node) => { if (node) rigRefs.current.rightForearm = node; }}
              position={[0, -0.5, 0]}
              onClick={(e) => handlePartClick(e, 'rightForearm')}
            >
              <JointBall color={palette.joint} radius={0.052} selected={isPartSelected('rightForearm')} />
              <LimbSegment length={0.45} radius={0.042} radiusTop={0.043} radiusBottom={0.035} color={palette.secondary} selected={isPartSelected('rightForearm')} />
              <group
                ref={(node) => { if (node) rigRefs.current.rightHandTerminal = node; }}
                position={[0, -0.47, 0]}
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
          position={[-0.25, -0.13, 0]}
          onClick={(e) => handlePartClick(e, 'leftThigh')}
        >
          <JointBall color={palette.joint} radius={0.064} selected={isPartSelected('leftThigh')} />
          <LimbSegment length={0.61} radius={0.058} radiusTop={0.075} radiusBottom={0.052} color={palette.primary} selected={isPartSelected('leftThigh')} />
          <group
            ref={(node) => { if (node) rigRefs.current.leftShin = node; }}
            position={[0, -0.61, 0]}
            onClick={(e) => handlePartClick(e, 'leftShin')}
          >
            <JointBall color={palette.joint} radius={0.052} selected={isPartSelected('leftShin')} />
            <LimbSegment length={0.57} radius={0.047} radiusTop={0.049} radiusBottom={0.038} color={palette.secondary} selected={isPartSelected('leftShin')} />
            <group
              ref={(node) => { if (node) rigRefs.current.leftFoot = node; }}
              position={[0, -0.58, 0.07]}
              onClick={(e) => handlePartClick(e, 'leftFoot')}
            >
              <RoundedBox args={[0.2, 0.075, 0.4]} radius={0.025} smoothness={4} position={[0, -0.035, 0.12]} castShadow receiveShadow>
                <meshStandardMaterial {...partMaterialProps(palette.trim, isPartSelected('leftFoot'))} />
              </RoundedBox>
            </group>
          </group>
        </group>

        <group
          ref={(node) => { if (node) rigRefs.current.rightThigh = node; }}
          position={[0.25, -0.13, 0]}
          onClick={(e) => handlePartClick(e, 'rightThigh')}
        >
          <JointBall color={palette.joint} radius={0.064} selected={isPartSelected('rightThigh')} />
          <LimbSegment length={0.61} radius={0.058} radiusTop={0.075} radiusBottom={0.052} color={palette.primary} selected={isPartSelected('rightThigh')} />
          <group
            ref={(node) => { if (node) rigRefs.current.rightShin = node; }}
            position={[0, -0.61, 0]}
            onClick={(e) => handlePartClick(e, 'rightShin')}
          >
            <JointBall color={palette.joint} radius={0.052} selected={isPartSelected('rightShin')} />
            <LimbSegment length={0.57} radius={0.047} radiusTop={0.049} radiusBottom={0.038} color={palette.secondary} selected={isPartSelected('rightShin')} />
            <group
              ref={(node) => { if (node) rigRefs.current.rightFoot = node; }}
              position={[0, -0.58, 0.07]}
              onClick={(e) => handlePartClick(e, 'rightFoot')}
            >
              <RoundedBox args={[0.2, 0.075, 0.4]} radius={0.025} smoothness={4} position={[0, -0.035, 0.12]} castShadow receiveShadow>
                <meshStandardMaterial {...partMaterialProps(palette.trim, isPartSelected('rightFoot'))} />
              </RoundedBox>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
