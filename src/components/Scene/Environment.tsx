import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function Environment() {
  const { gl, scene } = useThree();

  // Configure global engine renderer settings for high-fidelity shadow output
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap; // Clean, anti-aliased soft shadows
    
    // Set a deep cinematic background color so the engine canvas isn't basic white/transparent
    scene.background = new THREE.Color('#0e0e10');
  }, [gl, scene]);

  return (
    <>
      {/* 
        This file is now completely stripped of conflicting hardcoded light nodes. 
        It acts as a clean internal engine configuration layer.
        Any scene props like helper stages or static background architecture (e.g., skyboxes or walls) 
        can safely live right here.
      */}
    </>
  );
}