import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { CharacterState, CameraState, PoseJointKey, SceneMood } from '../types/scene';
import { ActorMannequin } from './ActorMannequin';
import { Environment } from './Scene/Environment'; // Verified relative path matching inside src/components/

interface CanvasViewProps {
  characters: CharacterState[];
  selectedId: string | null;
  cameraState: CameraState;
  mood: SceneMood;
  selectedJointKey: PoseJointKey | null;
  onSelectCharacter: (id: string) => void;
  onSelectJoint: (characterId: string, jointKey: PoseJointKey) => void;
  onCameraChange: (camera: CameraState) => void;
}

// Optimization scratchpads cached outside the loop to keep allocations flat
const _camPosTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();

/**
 * INTERNAL ENGINE HOOK: Handles fluid camera interpolation transitions smoothly
 */
function CameraDirectorController({ targetState, isUserDragging }: { 
  targetState: CameraState;
  isUserDragging: React.MutableRefObject<boolean>;
}) {
  const { camera } = useThree();
  const controls = useThree((state) => state.controls) as any;

  useEffect(() => {
    _camPosTarget.set(targetState.position.x, targetState.position.y, targetState.position.z);
    _camLookTarget.set(targetState.target.x, targetState.target.y, targetState.target.z);
  }, [targetState]);

  useFrame(() => {
    // If there are no controls initialized yet or the user is actively orbiting, bypass interpolation
    if (!controls || isUserDragging.current) return;

    // Smoothly interpolate the camera position and the orbit focus pivot point
    camera.position.lerp(_camPosTarget, 0.08);
    controls.target.lerp(_camLookTarget, 0.08);
  });

  return null;
}

export function CanvasView({ 
  characters, 
  selectedId, 
  cameraState, 
  mood,
  selectedJointKey,
  onSelectCharacter, 
  onSelectJoint,
  onCameraChange 
}: CanvasViewProps) {
  const controlsRef = useRef<any>(null);
  const isUserDragging = useRef(false);

  const handleManualControlsStart = () => {
    isUserDragging.current = true;
  };

  const handleManualControlsEnd = () => {
    isUserDragging.current = false;
    
    if (controlsRef.current) {
      const pos = controlsRef.current.object.position;
      const tar = controlsRef.current.target;
      
      onCameraChange({
        position: { x: parseFloat(pos.x.toFixed(2)), y: parseFloat(pos.y.toFixed(2)), z: parseFloat(pos.z.toFixed(2)) },
        target: { x: parseFloat(tar.x.toFixed(2)), y: parseFloat(tar.y.toFixed(2)), z: parseFloat(tar.z.toFixed(2)) }
      });
    }
  };

  // Memoized lighting values to ensure high frame rates during sudden mood flips
  const lightingRig = useMemo(() => {
    switch (mood) {
      case 'dramatic':
        return (
          <>
            <ambientLight intensity={0.5} color="#bd93f9" />
            <pointLight position={[-4, 5, -2]} intensity={15.0} color="#ff79c6" distance={20} decay={2} castShadow />
            <directionalLight position={[3, 3, 3]} intensity={8.0} color="#ffffff" castShadow />
          </>
        );
      case 'suspense':
        return (
          <>
            <ambientLight intensity={0.2} color="#6272a4" />
            <directionalLight position={[0, 8, 1]} intensity={25.0} color="#ff5555" castShadow />
            <spotLight position={[0, 10, 0]} intensity={30} angle={0.3} color="#ffffff" penumbra={1} castShadow />
          </>
        );
      case 'warm':
        return (
          <>
            <ambientLight intensity={2.0} color="#ffb86c" />
            <pointLight position={[5, 4, 5]} intensity={12.0} color="#f1fa8c" distance={30} decay={1.5} castShadow />
          </>
        );
      case 'night':
        return (
          <>
            <ambientLight intensity={0.3} color="#1a1c24" />
            <directionalLight position={[-6, 6, 6]} intensity={4.0} color="#8be9fd" castShadow />
          </>
        );
      case 'neutral':
      default:
        return (
          <>
            <ambientLight intensity={2.2} color="#ffffff" />
            <directionalLight position={[10, 15, 10]} intensity={3.5} castShadow />
          </>
        );
    }
  }, [mood]);

  return (
    <Canvas 
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: 45, near: 0.1, far: 100 }}
      // FIX: Changed shadowMap attribute to modern 'shadows' property flag
      shadows
    >
      {/* Dynamic Lighting Setup */}
      {lightingRig}
      
      {/* Render character mannequins mapped directly to binary bone transformations */}
      {characters.map((char) => (
        <ActorMannequin 
          key={char.id}
          character={char}
          isSelected={char.id === selectedId}
          selectedJointKey={char.id === selectedId ? selectedJointKey : null}
          onSelect={onSelectCharacter}
          onSelectJoint={onSelectJoint}
        />
      ))}

      {/* Infinite Grid Staging System */}
      <Grid 
        position={[0, -0.01, 0]} 
        infiniteGrid 
        cellSize={1} 
        cellThickness={1} 
        cellColor={mood === 'suspense' ? '#ff5555' : '#29292e'} 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor={mood === 'dramatic' ? '#ff79c6' : '#6272a4'} 
        fadeDistance={30}
      />

      {/* Manual Interactivity Controls */}
      <OrbitControls 
        ref={controlsRef}
        onStart={handleManualControlsStart}
        onEnd={handleManualControlsEnd}
        makeDefault
        maxPolarAngle={Math.PI / 2 - 0.05} 
        minDistance={2}
        maxDistance={40}
      />

      {/* Automated Cinematic Camera Controller */}
      <CameraDirectorController targetState={cameraState} isUserDragging={isUserDragging} />

      {/* High-Fidelity Rendering Configuration Layer */}
      <Environment />
    </Canvas>
  );
}
