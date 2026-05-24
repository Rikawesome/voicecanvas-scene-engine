import { Character } from '../../types/scene';

interface MannequinProps {
  character: Character;
}

export function Mannequin({ character }: MannequinProps) {
  const { position } = character;

  return (
    // We group the body parts together so they move as a single entity
    <group position={[position.x, position.y, position.z]}>
      
      {/* Main Torso Block */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        {/* Width: 1 unit, Height: 1.6 units (average human ratio), Depth: 0.5 units */}
        <boxGeometry args={[1, 1.6, 0.5]} />
        {/* A distinct purple material tone so it pops nicely against the dark grid background */}
        <meshStandardMaterial color="#8257e5" roughness={0.4} />
      </mesh>

      {/* Head Sphere - positioned relatively above the center of the torso */}
      <mesh castShadow position={[0, 1.2, 0]}>
        {/* Radius: 0.4 units, with 32 segments for clean smoothing */}
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#9b78e5" roughness={0.4} />
      </mesh>
      
    </group>
  );
}