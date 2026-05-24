// src/types/scene.ts

export type SceneMood = 'neutral' | 'dramatic' | 'suspense' | 'warm' | 'night';
export type PoseCategory = 'stance' | 'action' | 'reaction' | 'gesture';
export type SemanticModifier =
  | 'leanForward'
  | 'leanBackward'
  | 'twistTorso'
  | 'extendPunch'
  | 'defensive'
  | 'aggressive'
  | 'lookAtTarget';
export type PoseVariant = 'left' | 'right';
export type HandGestureKey = 'fist' | 'openPalm' | 'pointing' | 'grip' | 'blockingPalm' | 'sign';
export type CameraIntent = 'closeup' | 'wide' | 'low' | 'high' | 'ots' | 'lowOts' | 'standoff' | 'impact';
export type RelationshipIntent =
  | 'faceEachOther'
  | 'moveCloser'
  | 'moveApart'
  | 'attackTarget'
  | 'defendAgainstTarget'
  | 'retreatFromTarget'
  | 'behindTarget'
  | 'standoff'
  | 'impactMoment';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface JointTransform {
  x: number; // Rotation around X-axis in degrees
  y: number; // Rotation around Y-axis in degrees
  z: number; // Rotation around Z-axis in degrees
}

export interface SkeletonState {
  head: JointTransform;
  torso: JointTransform; // Maps to Blender's 'Spine'
  pelvis: JointTransform;
  leftUpperArm: JointTransform;
  leftForearm: JointTransform;
  rightUpperArm: JointTransform;
  rightForearm: JointTransform;
  leftThigh: JointTransform;
  leftShin: JointTransform;
  rightThigh: JointTransform;
  rightShin: JointTransform;
  leftFoot: JointTransform;
  rightFoot: JointTransform;

  // ==========================================================================
  // EXTENSION FOR BLENDER TERMINAL BONE SAFETY (Optional flags prevent layout crashes)
  // ==========================================================================
  leftHandTerminal?: JointTransform;  // Catches Bone.013 index constraints smoothly
  rightHandTerminal?: JointTransform; // Catches Bone.014 index constraints smoothly
  accessoryTerminal?: JointTransform; // Catches Bone.015 accessory hooks safely
}

export interface PoseDefinition {
  name: string;
  category: PoseCategory;
  description: string;
  tags: string[];
  skeleton: Partial<SkeletonState>;
  variants?: Partial<Record<PoseVariant, Partial<SkeletonState>>>;
  defaultModifiers?: SemanticModifier[];
  defaultHandGestures?: Partial<Record<'left' | 'right', HandGestureKey>>;
}

export interface PoseCompileInput {
  basePose: string;
  modifiers?: SemanticModifier[];
  intensity?: number;
  variant?: PoseVariant;
}

export interface PoseCompileResult {
  skeleton: SkeletonState;
  handGestures: Partial<Record<'left' | 'right', HandGestureKey>>;
}

export type PoseJointKey = keyof Pick<
  SkeletonState,
  | 'pelvis'
  | 'torso'
  | 'head'
  | 'leftUpperArm'
  | 'leftForearm'
  | 'leftHandTerminal'
  | 'rightUpperArm'
  | 'rightForearm'
  | 'rightHandTerminal'
  | 'leftThigh'
  | 'leftShin'
  | 'leftFoot'
  | 'rightThigh'
  | 'rightShin'
  | 'rightFoot'
>;

export interface CharacterState {
  id: string;
  name: string;
  position: Vector3D;
  rotation: Vector3D; // Base model orientation on the floor grid
  poseName: string;   // Retained for backward compatibility with your UI panel state
  
  // Intent Architecture properties to split stances and actions
  currentStance: string; // Tracks lower body foundation (e.g., 'neutral', 'run', 'kneel')
  currentAction: string; // Tracks upper body overlay performance (e.g., 'none', 'punch', 'guard')
  
  skeleton: SkeletonState;
  handGestures?: Partial<Record<'left' | 'right', HandGestureKey>>;
}

export interface CameraState {
  position: Vector3D;
  target: Vector3D;
}

export interface SceneState {
  sceneId: string;
  mood: SceneMood;
  camera: CameraState;
  characters: CharacterState[];
}

export interface ActorCanvasInstruction {
  actorId: string;
  basePose?: string;
  stance?: string;
  action?: string;
  modifiers?: SemanticModifier[];
  targetId?: string;
  variant?: PoseVariant;
  intensity?: number;
}

export interface RelationshipCanvasInstruction {
  type: RelationshipIntent;
  actorId?: string;
  targetId?: string;
}

export interface CanvasInstruction {
  actors: ActorCanvasInstruction[];
  relationships?: RelationshipCanvasInstruction[];
  camera?: CameraIntent;
  mood?: SceneMood;
}
