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
export type PoseVariant =
  | 'left'
  | 'right'
  | 'jab'
  | 'cross'
  | 'hook'
  | 'uppercut'
  | 'runForward'
  | 'chaseDrive'
  | 'dashStart'
  | 'lookBackRun'
  | 'boxingGuard'
  | 'highGuard'
  | 'lowGuard'
  | 'sideGuard'
  | 'cautiousGuard'
  | 'interceptBlock';
export type HandGestureKey = 'fist' | 'openPalm' | 'pointing' | 'grip' | 'blockingPalm' | 'sign';
export type CameraIntent =
  | 'closeup'
  | 'wide'
  | 'low'
  | 'high'
  | 'ots'
  | 'lowOts'
  | 'standoff'
  | 'impact'
  | 'twoShot'
  | 'groupShot'
  | 'impactFrame'
  | 'reactionFrame'
  | 'establishing'
  | 'dominanceLowAngle'
  | 'vulnerabilityHighAngle';
export type CompositionIntent =
  | 'neutral'
  | 'protectorForeground'
  | 'attackerForeground'
  | 'observerWide'
  | 'surrounded'
  | 'powerImbalance';
export type SceneBeatKey =
  | 'confrontation'
  | 'attackWindup'
  | 'impactReaction'
  | 'dialogueTension'
  | 'chase'
  | 'reveal'
  | 'retreat'
  | 'dominance'
  | 'vulnerability';
export type RelationshipIntent =
  | 'faceEachOther'
  | 'moveCloser'
  | 'moveApart'
  | 'attackTarget'
  | 'defendAgainstTarget'
  | 'retreatFromTarget'
  | 'behindTarget'
  | 'surroundTarget'
  | 'betweenTargets'
  | 'observerLane'
  | 'standoff'
  | 'impactMoment';
export type ActorRole =
  | 'lead'
  | 'rival'
  | 'attacker'
  | 'defender'
  | 'victim'
  | 'observer'
  | 'support'
  | 'background';

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
  role?: ActorRole;
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
  actor?: string;
  actorId?: string;
  role?: ActorRole;
  basePose?: string;
  stance?: string;
  action?: string;
  modifiers?: SemanticModifier[];
  target?: string;
  targetId?: string;
  position?: Vector3D;
  rotation?: Vector3D;
  variant?: PoseVariant;
  intensity?: number;
}

export interface RelationshipCanvasInstruction {
  type: RelationshipIntent;
  actor?: string;
  actorId?: string;
  target?: string;
  targetId?: string;
  secondaryTarget?: string;
  secondaryTargetId?: string;
}

export interface CanvasInstruction {
  actors: ActorCanvasInstruction[];
  relationships?: RelationshipCanvasInstruction[];
  focusActors?: string[];
  secondaryActors?: string[];
  camera?: CameraIntent;
  composition?: CompositionIntent;
  mood?: SceneMood;
}

export interface CanvasInstructionApplyResult {
  updatedCharacters?: CharacterState[];
  updatedMood?: SceneMood;
  updatedCamera?: CameraState;
  message?: string;
}
