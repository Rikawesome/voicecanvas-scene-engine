// src/constants/poses.ts
// Fully modularized cinematic presets preserving verified high-mass mannequin vectors

import {
  HandGestureKey,
  JointTransform,
  PoseCompileInput,
  PoseCompileResult,
  PoseDefinition,
  SemanticModifier,
  SkeletonState
} from '../types/scene';

const ZERO_ROTATION: JointTransform = { x: 0, y: 0, z: 0 };

export const DEFAULT_SKELETON: SkeletonState = {
  head: { x: 0, y: 0, z: 0 },
  torso: { x: 0, y: 0, z: 0 },
  pelvis: { x: 0, y: 0, z: 0 },
  leftUpperArm: { x: 0, y: 0, z: 0 },
  leftForearm: { x: 0, y: 0, z: 0 },
  rightUpperArm: { x: 0, y: 0, z: 0 },
  rightForearm: { x: 0, y: 0, z: 0 },
  leftThigh: { x: 0, y: 0, z: 0 },
  leftShin: { x: 0, y: 0, z: 0 },
  rightThigh: { x: 0, y: 0, z: 0 },
  rightShin: { x: 0, y: 0, z: 0 },
  leftFoot: { x: 0, y: 0, z: 0 },
  rightFoot: { x: 0, y: 0, z: 0 },
  leftHandTerminal: { x: 0, y: 0, z: 0 },
  rightHandTerminal: { x: 0, y: 0, z: 0 },
  accessoryTerminal: { x: 0, y: 0, z: 0 }
};

// ============================================================================
// MATRIX 1: LOWER-BODY STANCES (Manages pelvis and lower-limb grounding anchors)
// ============================================================================
export const STANCE_PRESETS: Record<string, Partial<SkeletonState>> = {
  neutral: {
    pelvis: ZERO_ROTATION,
    leftThigh: ZERO_ROTATION,
    leftShin: ZERO_ROTATION,
    rightThigh: ZERO_ROTATION,
    rightShin: ZERO_ROTATION,
    leftFoot: ZERO_ROTATION,
    rightFoot: ZERO_ROTATION
  },
  ready: {
    pelvis: { x: -3, y: 0, z: 0 },
    leftThigh: { x: -12, y: 0, z: -5 },
    leftShin: { x: 16, y: 0, z: 0 },
    rightThigh: { x: 10, y: 0, z: 5 },
    rightShin: { x: 14, y: 0, z: 0 },
    leftFoot: { x: -8, y: 0, z: 1 },
    rightFoot: { x: -10, y: 0, z: -1 }
  },
  guard: {
    pelvis: { x: -6, y: -12, z: -2 },
    leftThigh: { x: -20, y: 0, z: -8 },
    leftShin: { x: 26, y: 0, z: 0 },
    rightThigh: { x: 14, y: 0, z: 8 },
    rightShin: { x: 20, y: 0, z: 0 },
    leftFoot: { x: -10, y: -6, z: 2 },
    rightFoot: { x: -16, y: 6, z: -2 }
  },
  walk: {
    pelvis: { x: -3, y: 0, z: -3 },
    leftThigh: { x: -26, y: 0, z: -2 },
    leftShin: { x: 20, y: 0, z: 0 },
    rightThigh: { x: 24, y: 0, z: 2 },
    rightShin: { x: 18, y: 0, z: 0 },
    leftFoot: { x: -10, y: 0, z: 0 },
    rightFoot: { x: -4, y: 0, z: 0 }
  },
  run: {
    pelvis: { x: -12, y: 0, z: -5 },
    leftThigh: { x: 38, y: 0, z: 2 },
    leftShin: { x: 46, y: 0, z: 0 },
    rightThigh: { x: -42, y: 0, z: -2 },
    rightShin: { x: 38, y: 0, z: 0 },
    leftFoot: { x: -28, y: 0, z: 0 },
    rightFoot: { x: -8, y: 0, z: 0 }
  },
  kneel: {
    pelvis: { x: -18, y: 0, z: 0 },
    leftThigh: { x: 58, y: 0, z: -6 },
    leftShin: { x: 84, y: 0, z: 0 },
    rightThigh: { x: -54, y: 0, z: 6 },
    rightShin: { x: 76, y: 0, z: 0 },
    leftFoot: { x: 10, y: 0, z: 0 },
    rightFoot: { x: -14, y: 0, z: 0 }
  },
  dodge: {
    pelvis: { x: -10, y: 18, z: -12 },
    leftThigh: { x: 14, y: 0, z: -12 },
    leftShin: { x: 26, y: 0, z: 0 },
    rightThigh: { x: -26, y: 0, z: 12 },
    rightShin: { x: 24, y: 0, z: 0 },
    leftFoot: { x: -18, y: -10, z: 3 },
    rightFoot: { x: -6, y: 10, z: -3 }
  }
};

// ============================================================================
// MATRIX 2: UPPER-BODY ACTIONS (Manages head, chest torque, and arm extensions)
// ============================================================================
export const ACTION_PRESETS: Record<string, Partial<SkeletonState>> = {
  none: {
    head: ZERO_ROTATION,
    torso: ZERO_ROTATION,
    leftUpperArm: ZERO_ROTATION,
    leftForearm: ZERO_ROTATION,
    rightUpperArm: ZERO_ROTATION,
    rightForearm: ZERO_ROTATION,
    leftHandTerminal: ZERO_ROTATION,
    rightHandTerminal: ZERO_ROTATION
  },
  ready: {
    torso: { x: -4, y: 0, z: 0 },
    head: { x: 2, y: 0, z: 0 },
    leftUpperArm: { x: -26, y: 0, z: -24 },
    leftForearm: { x: -42, y: 0, z: -8 },
    rightUpperArm: { x: -26, y: 0, z: 24 },
    rightForearm: { x: -42, y: 0, z: 8 },
    leftHandTerminal: { x: 0, y: 0, z: -8 },
    rightHandTerminal: { x: 0, y: 0, z: 8 }
  },
  guard: {
    torso: { x: -7, y: 10, z: -2 },
    head: { x: 4, y: 8, z: 0 },
    leftUpperArm: { x: -42, y: -4, z: -34 },
    leftForearm: { x: -62, y: 0, z: -12 },
    rightUpperArm: { x: -48, y: 4, z: 32 },
    rightForearm: { x: -58, y: 0, z: 12 },
    leftHandTerminal: { x: 0, y: 0, z: -12 },
    rightHandTerminal: { x: 0, y: 0, z: 12 }
  },
  punch: {
    torso: { x: 22, y: 14, z: 0 },
    head: { x: 6, y: 8, z: 0 },
    leftUpperArm: { x: -88, y: -2, z: -8 },
    leftForearm: { x: -2, y: 0, z: -1 },
    rightUpperArm: { x: -44, y: 2, z: 20 },
    rightForearm: { x: -60, y: 0, z: 8 },
    leftHandTerminal: { x: 0, y: 0, z: -2 },
    rightHandTerminal: { x: 0, y: 0, z: 6 }
  },
  block: {
    torso: { x: -10, y: 5, z: 0 },
    head: { x: 6, y: 4, z: 0 },
    leftUpperArm: { x: -62, y: -6, z: -38 },
    leftForearm: { x: -58, y: 0, z: -18 },
    rightUpperArm: { x: -62, y: 6, z: 38 },
    rightForearm: { x: -58, y: 0, z: 18 },
    leftHandTerminal: { x: 0, y: 0, z: -16 },
    rightHandTerminal: { x: 0, y: 0, z: 16 }
  },
  point: {
    torso: { x: -2, y: 18, z: -2 },
    head: { x: 0, y: 18, z: 0 },
    leftUpperArm: { x: -88, y: -2, z: -12 },
    leftForearm: { x: 0, y: 0, z: 0 },
    rightUpperArm: { x: -14, y: 0, z: 30 },
    rightForearm: { x: -36, y: 0, z: 8 },
    leftHandTerminal: { x: 0, y: 0, z: 0 },
    rightHandTerminal: { x: 0, y: 0, z: 8 }
  },
  push: {
    torso: { x: -8, y: 4, z: 0 },
    head: { x: -2, y: 4, z: 0 },
    leftUpperArm: { x: -82, y: -6, z: -24 },
    leftForearm: { x: -2, y: 0, z: -8 },
    rightUpperArm: { x: -82, y: 6, z: 24 },
    rightForearm: { x: -2, y: 0, z: 8 },
    leftHandTerminal: { x: 0, y: 0, z: -10 },
    rightHandTerminal: { x: 0, y: 0, z: 10 }
  },
  recoil: {
    torso: { x: 16, y: -12, z: 10 },
    head: { x: 14, y: -16, z: -4 },
    leftUpperArm: { x: -20, y: 0, z: -48 },
    leftForearm: { x: -52, y: 0, z: -18 },
    rightUpperArm: { x: -24, y: 0, z: 48 },
    rightForearm: { x: -56, y: 0, z: 18 },
    leftHandTerminal: { x: 0, y: 0, z: -16 },
    rightHandTerminal: { x: 0, y: 0, z: 16 }
  }
};

const cloneJoint = (joint: JointTransform | undefined): JointTransform => ({
  x: joint?.x || 0,
  y: joint?.y || 0,
  z: joint?.z || 0
});

const mergeSkeleton = (...partials: Partial<SkeletonState>[]): SkeletonState => {
  const merged: SkeletonState = JSON.parse(JSON.stringify(DEFAULT_SKELETON));

  partials.forEach((partial) => {
    Object.entries(partial).forEach(([key, value]) => {
      if (!value) return;
      merged[key as keyof SkeletonState] = cloneJoint(value as JointTransform) as never;
    });
  });

  return merged;
};

const mirrorSkeletonZ = (skeleton: Partial<SkeletonState>): Partial<SkeletonState> => {
  const mirrored: Partial<SkeletonState> = {};

  Object.entries(skeleton).forEach(([key, value]) => {
    if (!value) return;
    const nextKey = key.startsWith('left')
      ? key.replace('left', 'right')
      : key.startsWith('right')
        ? key.replace('right', 'left')
        : key;

    mirrored[nextKey as keyof SkeletonState] = {
      x: value.x,
      y: value.y,
      z: -value.z
    } as JointTransform;
  });

  return mirrored;
};

const PUNCH_VARIANTS: Record<'jab' | 'cross' | 'hook' | 'uppercut', Partial<SkeletonState>> = {
  jab: mergeSkeleton(STANCE_PRESETS.guard, ACTION_PRESETS.punch),
  cross: mergeSkeleton(STANCE_PRESETS.guard, {
    torso: { x: 34, y: -22, z: 0 },
    head: { x: 8, y: -8, z: 0 },
    leftUpperArm: { x: -42, y: -2, z: -20 },
    leftForearm: { x: -62, y: 0, z: -8 },
    rightUpperArm: { x: -96, y: 2, z: 8 },
    rightForearm: { x: -3, y: 0, z: 1 },
    leftHandTerminal: { x: 0, y: 0, z: -6 },
    rightHandTerminal: { x: 0, y: 0, z: 2 }
  }),
  hook: mergeSkeleton(STANCE_PRESETS.guard, {
    torso: { x: 28, y: 26, z: 0 },
    head: { x: 7, y: 12, z: 0 },
    leftUpperArm: { x: -64, y: -14, z: -36 },
    leftForearm: { x: -46, y: 0, z: -28 },
    rightUpperArm: { x: -42, y: 2, z: 20 },
    rightForearm: { x: -60, y: 0, z: 8 },
    leftHandTerminal: { x: 0, y: 0, z: -18 },
    rightHandTerminal: { x: 0, y: 0, z: 6 }
  }),
  uppercut: mergeSkeleton(STANCE_PRESETS.guard, {
    pelvis: { x: 10, y: -8, z: -2 },
    torso: { x: 38, y: 12, z: 0 },
    head: { x: 10, y: 8, z: 0 },
    leftUpperArm: { x: -48, y: -6, z: -24 },
    leftForearm: { x: -78, y: 0, z: -10 },
    rightUpperArm: { x: -34, y: 4, z: 24 },
    rightForearm: { x: -66, y: 0, z: 10 },
    leftThigh: { x: -24, y: 0, z: -8 },
    leftShin: { x: 34, y: 0, z: 0 },
    rightThigh: { x: 18, y: 0, z: 8 },
    rightShin: { x: 28, y: 0, z: 0 },
    leftHandTerminal: { x: 0, y: 0, z: -6 },
    rightHandTerminal: { x: 0, y: 0, z: 8 }
  })
};

const RUN_VARIANTS: Record<'runForward' | 'chaseDrive' | 'dashStart' | 'lookBackRun', Partial<SkeletonState>> = {
  runForward: mergeSkeleton(STANCE_PRESETS.run, {
    pelvis: { x: 4, y: 0, z: 0 },
    torso: { x: 34, y: 0, z: 0 },
    head: { x: 8, y: 0, z: 0 },
    leftThigh: { x: 40, y: 0, z: 2 },
    leftShin: { x: 48, y: 0, z: 0 },
    rightThigh: { x: -44, y: 0, z: -2 },
    rightShin: { x: 38, y: 0, z: 0 },
    leftFoot: { x: -30, y: 0, z: 0 },
    rightFoot: { x: -13, y: 0, z: 0 },
    leftUpperArm: { x: 66, y: 0, z: -8 },
    leftForearm: { x: -62, y: 0, z: -4 },
    rightUpperArm: { x: -76, y: 0, z: 10 },
    rightForearm: { x: -92, y: 0, z: 4 },
    leftHandTerminal: { x: 0, y: 0, z: -2 },
    rightHandTerminal: { x: 0, y: 0, z: 2 }
  }),
  chaseDrive: mergeSkeleton(STANCE_PRESETS.run, {
    pelvis: { x: 7, y: 0, z: 0 },
    torso: { x: 48, y: 0, z: 0 },
    head: { x: 12, y: 0, z: 0 },
    leftThigh: { x: 46, y: 0, z: 2 },
    leftShin: { x: 54, y: 0, z: 0 },
    rightThigh: { x: -50, y: 0, z: -2 },
    rightShin: { x: 44, y: 0, z: 0 },
    leftFoot: { x: -35.54, y: 0, z: 0 },
    rightFoot: { x: -14.94, y: 0, z: 0 },
    leftUpperArm: { x: 81, y: 0, z: -8 },
    leftForearm: { x: -59, y: 0, z: -4 },
    rightUpperArm: { x: -86, y: 0, z: 10 },
    rightForearm: { x: -105, y: 0, z: 4 }
  }),
  dashStart: mergeSkeleton(STANCE_PRESETS.guard, {
    pelvis: { x: 10, y: 4, z: 0 },
    torso: { x: 52, y: 4, z: 0 },
    head: { x: 14, y: 4, z: 0 },
    leftThigh: { x: 58, y: 0, z: -2 },
    leftShin: { x: 62, y: 0, z: 0 },
    rightThigh: { x: -46, y: 0, z: 5 },
    rightShin: { x: 52, y: 0, z: 0 },
    leftFoot: { x: -38, y: -4, z: 0 },
    rightFoot: { x: -18, y: 5, z: 0 },
    leftUpperArm: { x: 88, y: 0, z: -8 },
    leftForearm: { x: -64, y: 0, z: -4 },
    rightUpperArm: { x: -92, y: 0, z: 10 },
    rightForearm: { x: -108, y: 0, z: 4 }
  }),
  lookBackRun: mergeSkeleton(STANCE_PRESETS.run, {
    pelvis: { x: 3, y: -10, z: 0 },
    torso: { x: 32, y: -22, z: 0 },
    head: { x: 8, y: -34, z: 0 },
    leftThigh: { x: 38, y: 0, z: -2 },
    leftShin: { x: 46, y: 0, z: 0 },
    rightThigh: { x: -42, y: 0, z: 4 },
    rightShin: { x: 38, y: 0, z: 0 },
    leftFoot: { x: -30, y: 0, z: 0 },
    rightFoot: { x: -12, y: 0, z: 0 },
    leftUpperArm: { x: 62, y: 0, z: -8 },
    leftForearm: { x: -64, y: 0, z: -4 },
    rightUpperArm: { x: -76, y: 0, z: 10 },
    rightForearm: { x: -92, y: 0, z: 4 }
  })
};

const GUARD_VARIANTS: Record<'boxingGuard' | 'highGuard' | 'lowGuard' | 'sideGuard' | 'cautiousGuard', Partial<SkeletonState>> = {
  boxingGuard: mergeSkeleton(STANCE_PRESETS.guard, {
    head: { x: 44, y: 30, z: -32 },
    torso: { x: 8, y: 32, z: 0 },
    pelvis: { x: 0, y: 26, z: 0 },
    leftUpperArm: { x: -75, y: 0, z: -26 },
    leftForearm: { x: -124, y: 0, z: 48 },
    rightUpperArm: { x: -61, y: 0, z: -26 },
    rightForearm: { x: -116, y: 0, z: -9 },
    leftThigh: { x: 12, y: 0, z: -15 },
    leftShin: { x: 23, y: 0, z: 7 },
    rightThigh: { x: -45, y: 0, z: 21 },
    rightShin: { x: 45, y: 0, z: 0 },
    leftFoot: { x: -10.08, y: 10, z: 0 },
    rightFoot: { x: -2.67, y: 0, z: 0 },
    leftHandTerminal: { x: 42, y: 15, z: 58 },
    rightHandTerminal: { x: 42, y: 15, z: 58 }
  }),
  highGuard: mergeSkeleton(STANCE_PRESETS.guard, {
    head: { x: 40, y: 24, z: -24 },
    torso: { x: 6, y: 26, z: 0 },
    pelvis: { x: 0, y: 20, z: 0 },
    leftUpperArm: { x: -82, y: 0, z: -30 },
    leftForearm: { x: -132, y: 0, z: 42 },
    rightUpperArm: { x: -78, y: 0, z: -18 },
    rightForearm: { x: -128, y: 0, z: -2 },
    leftThigh: { x: 8, y: 0, z: -14 },
    leftShin: { x: 24, y: 0, z: 6 },
    rightThigh: { x: -38, y: 0, z: 18 },
    rightShin: { x: 42, y: 0, z: 0 },
    leftFoot: { x: -8, y: 8, z: 0 },
    rightFoot: { x: -4, y: 0, z: 0 },
    leftHandTerminal: { x: 48, y: 12, z: 62 },
    rightHandTerminal: { x: 48, y: 12, z: 62 }
  }),
  lowGuard: mergeSkeleton(STANCE_PRESETS.guard, {
    head: { x: 28, y: 24, z: -16 },
    torso: { x: 10, y: 28, z: 0 },
    pelvis: { x: 0, y: 22, z: 0 },
    leftUpperArm: { x: -56, y: 0, z: -28 },
    leftForearm: { x: -88, y: 0, z: 32 },
    rightUpperArm: { x: -52, y: 0, z: -18 },
    rightForearm: { x: -82, y: 0, z: -4 },
    leftThigh: { x: 14, y: 0, z: -16 },
    leftShin: { x: 28, y: 0, z: 7 },
    rightThigh: { x: -42, y: 0, z: 20 },
    rightShin: { x: 44, y: 0, z: 0 },
    leftFoot: { x: -10, y: 10, z: 0 },
    rightFoot: { x: -3, y: 0, z: 0 },
    leftHandTerminal: { x: 28, y: 12, z: 40 },
    rightHandTerminal: { x: 28, y: 12, z: 40 }
  }),
  sideGuard: mergeSkeleton(STANCE_PRESETS.guard, {
    head: { x: 38, y: 38, z: -22 },
    torso: { x: 6, y: 38, z: -2 },
    pelvis: { x: 0, y: 34, z: 0 },
    leftUpperArm: { x: -68, y: 0, z: -34 },
    leftForearm: { x: -118, y: 0, z: 46 },
    rightUpperArm: { x: -48, y: 0, z: -12 },
    rightForearm: { x: -102, y: 0, z: -16 },
    leftThigh: { x: 8, y: 0, z: -22 },
    leftShin: { x: 28, y: 0, z: 8 },
    rightThigh: { x: -48, y: 0, z: 26 },
    rightShin: { x: 48, y: 0, z: 0 },
    leftFoot: { x: -12, y: 14, z: 0 },
    rightFoot: { x: -2, y: -4, z: 0 },
    leftHandTerminal: { x: 38, y: 14, z: 56 },
    rightHandTerminal: { x: 36, y: 12, z: 44 }
  }),
  cautiousGuard: mergeSkeleton(STANCE_PRESETS.guard, {
    head: { x: 24, y: 18, z: -10 },
    torso: { x: 4, y: 18, z: 0 },
    pelvis: { x: 0, y: 14, z: 0 },
    leftUpperArm: { x: -52, y: 0, z: -24 },
    leftForearm: { x: -78, y: 0, z: 26 },
    rightUpperArm: { x: -50, y: 0, z: -10 },
    rightForearm: { x: -76, y: 0, z: -4 },
    leftThigh: { x: 6, y: 0, z: -12 },
    leftShin: { x: 20, y: 0, z: 5 },
    rightThigh: { x: -24, y: 0, z: 14 },
    rightShin: { x: 30, y: 0, z: 0 },
    leftFoot: { x: -6, y: 6, z: 0 },
    rightFoot: { x: -4, y: 0, z: 0 },
    leftHandTerminal: { x: 22, y: 10, z: 32 },
    rightHandTerminal: { x: 22, y: 10, z: 32 }
  })
};

const BLOCK_VARIANTS: Record<'interceptBlock', Partial<SkeletonState>> = {
  interceptBlock: mergeSkeleton(STANCE_PRESETS.guard, {
    head: { x: 16, y: -24, z: -12 },
    torso: { x: 10, y: -29, z: -18 },
    pelvis: { x: 0, y: 12, z: 0 },
    leftUpperArm: { x: 15, y: 42, z: -48 },
    leftForearm: { x: -113, y: 72, z: 48 },
    rightUpperArm: { x: -56, y: 0, z: 0 },
    rightForearm: { x: -94, y: 0, z: 0 },
    leftThigh: { x: -40, y: 0, z: -37 },
    leftShin: { x: 37, y: 0, z: 0 },
    rightThigh: { x: 23, y: 0, z: 34 },
    rightShin: { x: 18, y: 0, z: 0 },
    leftFoot: { x: -18, y: 6, z: 0 },
    rightFoot: { x: -8, y: -4, z: 0 },
    leftHandTerminal: { x: -65, y: -70, z: -4 },
    rightHandTerminal: { x: 18, y: 0, z: 12 }
  })
};

export const POSE_DEFINITIONS: Record<string, PoseDefinition> = {
  neutral: {
    name: 'neutral',
    category: 'stance',
    description: 'Upright neutral staging pose for resetting the actor.',
    tags: ['standing', 'reset', 'calm'],
    skeleton: mergeSkeleton(STANCE_PRESETS.neutral, ACTION_PRESETS.none),
    defaultHandGestures: { left: 'openPalm', right: 'openPalm' }
  },
  ready: {
    name: 'ready',
    category: 'stance',
    description: 'Alert anime-ready stance with hands raised but not attacking.',
    tags: ['standing', 'alert', 'prepared'],
    skeleton: mergeSkeleton(STANCE_PRESETS.ready, ACTION_PRESETS.ready),
    defaultModifiers: ['defensive'],
    defaultHandGestures: { left: 'fist', right: 'fist' }
  },
  guard: {
    name: 'guard',
    category: 'stance',
    description: 'Defensive fighting guard with protected torso and planted legs.',
    tags: ['defense', 'fight', 'protected'],
    skeleton: mergeSkeleton(STANCE_PRESETS.guard, ACTION_PRESETS.guard),
    variants: {
      boxingGuard: GUARD_VARIANTS.boxingGuard,
      highGuard: GUARD_VARIANTS.highGuard,
      lowGuard: GUARD_VARIANTS.lowGuard,
      sideGuard: GUARD_VARIANTS.sideGuard,
      cautiousGuard: GUARD_VARIANTS.cautiousGuard
    },
    defaultModifiers: ['defensive'],
    defaultHandGestures: { left: 'fist', right: 'fist' }
  },
  walk: {
    name: 'walk',
    category: 'stance',
    description: 'Readable walking silhouette for directional staging.',
    tags: ['movement', 'travel', 'step'],
    skeleton: mergeSkeleton(STANCE_PRESETS.walk, ACTION_PRESETS.none),
    defaultHandGestures: { left: 'openPalm', right: 'openPalm' }
  },
  run: {
    name: 'run',
    category: 'stance',
    description: 'Reference-built run family for movement, chase, burst, and fleeing panels.',
    tags: ['movement', 'chase', 'speed', 'dash', 'flee'],
    skeleton: RUN_VARIANTS.runForward,
    variants: {
      runForward: RUN_VARIANTS.runForward,
      chaseDrive: RUN_VARIANTS.chaseDrive,
      dashStart: RUN_VARIANTS.dashStart,
      lookBackRun: RUN_VARIANTS.lookBackRun
    },
    defaultHandGestures: { left: 'fist', right: 'fist' }
  },
  kneel: {
    name: 'kneel',
    category: 'stance',
    description: 'Low kneeling pose for injury, submission, or dramatic beats.',
    tags: ['low', 'kneeling', 'vulnerable'],
    skeleton: mergeSkeleton(STANCE_PRESETS.kneel, ACTION_PRESETS.none),
    defaultHandGestures: { left: 'openPalm', right: 'openPalm' }
  },
  dodge: {
    name: 'dodge',
    category: 'reaction',
    description: 'Side-leaning evasion silhouette for avoiding an attack.',
    tags: ['reaction', 'avoid', 'motion'],
    skeleton: mergeSkeleton(STANCE_PRESETS.dodge, ACTION_PRESETS.ready),
    defaultModifiers: ['leanBackward'],
    defaultHandGestures: { left: 'fist', right: 'fist' }
  },
  punch: {
    name: 'punch',
    category: 'action',
    description: 'Reference-built punch family with guard hand discipline and body rotation.',
    tags: ['attack', 'strike', 'impact', 'jab', 'cross', 'hook', 'uppercut'],
    skeleton: PUNCH_VARIANTS.jab || mergeSkeleton(STANCE_PRESETS.guard, ACTION_PRESETS.punch),
    variants: {
      left: PUNCH_VARIANTS.jab,
      right: PUNCH_VARIANTS.cross,
      jab: PUNCH_VARIANTS.jab,
      cross: PUNCH_VARIANTS.cross,
      hook: PUNCH_VARIANTS.hook,
      uppercut: PUNCH_VARIANTS.uppercut
    },
    defaultModifiers: ['aggressive'],
    defaultHandGestures: { left: 'fist', right: 'fist' }
  },
  block: {
    name: 'block',
    category: 'action',
    description: 'Raised defensive block for absorbing an incoming strike.',
    tags: ['defense', 'block', 'protect'],
    skeleton: mergeSkeleton(STANCE_PRESETS.guard, ACTION_PRESETS.block),
    variants: {
      interceptBlock: BLOCK_VARIANTS.interceptBlock
    },
    defaultModifiers: ['defensive'],
    defaultHandGestures: { left: 'blockingPalm', right: 'blockingPalm' }
  },
  point: {
    name: 'point',
    category: 'gesture',
    description: 'Directional pointing gesture toward a target.',
    tags: ['gesture', 'direct', 'accuse'],
    skeleton: mergeSkeleton(STANCE_PRESETS.ready, ACTION_PRESETS.point),
    defaultModifiers: ['lookAtTarget'],
    defaultHandGestures: { left: 'pointing', right: 'openPalm' }
  },
  push: {
    name: 'push',
    category: 'action',
    description: 'Two-handed shove or forceful distance-making pose.',
    tags: ['contact', 'force', 'space'],
    skeleton: mergeSkeleton(STANCE_PRESETS.ready, ACTION_PRESETS.push),
    defaultModifiers: ['leanForward'],
    defaultHandGestures: { left: 'openPalm', right: 'openPalm' }
  },
  recoil: {
    name: 'recoil',
    category: 'reaction',
    description: 'Backward flinch after being struck or startled.',
    tags: ['reaction', 'hit', 'retreat'],
    skeleton: mergeSkeleton(STANCE_PRESETS.dodge, ACTION_PRESETS.recoil),
    defaultModifiers: ['leanBackward'],
    defaultHandGestures: { left: 'openPalm', right: 'openPalm' }
  }
};

const modifierOverlays: Record<SemanticModifier, Partial<SkeletonState>> = {
  leanForward: { torso: { x: 12, y: 0, z: 0 }, pelvis: { x: 5, y: 0, z: 0 } },
  leanBackward: { torso: { x: -12, y: 0, z: 0 }, pelvis: { x: -7, y: 0, z: 0 } },
  twistTorso: { torso: { x: 0, y: 14, z: -3 }, head: { x: 0, y: 10, z: 0 } },
  extendPunch: {
    leftUpperArm: { x: -8, y: 0, z: 0 },
    leftForearm: { x: -4, y: 0, z: 0 },
    rightUpperArm: { x: -8, y: 0, z: 0 },
    rightForearm: { x: -4, y: 0, z: 0 }
  },
  defensive: { torso: { x: 4, y: 0, z: 0 }, head: { x: 2, y: 0, z: 0 } },
  aggressive: { torso: { x: 8, y: 8, z: 0 }, head: { x: 4, y: 6, z: 0 } },
  lookAtTarget: { head: { x: 0, y: 10, z: 0 } }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function addOverlay(base: SkeletonState, overlay: Partial<SkeletonState>, intensity = 1): SkeletonState {
  const next: SkeletonState = JSON.parse(JSON.stringify(base));

  Object.entries(overlay).forEach(([key, value]) => {
    if (!value) return;
    const current = next[key as keyof SkeletonState] || ZERO_ROTATION;
    next[key as keyof SkeletonState] = {
      x: current.x + value.x * intensity,
      y: current.y + value.y * intensity,
      z: current.z + value.z * intensity
    } as never;
  });

  return next;
}

function clampJoint(joint: JointTransform, limits: { x: [number, number]; y: [number, number]; z: [number, number] }): JointTransform {
  return {
    x: clamp(joint.x, limits.x[0], limits.x[1]),
    y: clamp(joint.y, limits.y[0], limits.y[1]),
    z: clamp(joint.z, limits.z[0], limits.z[1])
  };
}

function balanceFoot(thigh: JointTransform, shin: JointTransform, foot: JointTransform): JointTransform {
  const counterX = clamp((-0.58 * shin.x) + (-0.18 * thigh.x), -52, 28);

  return {
    x: clamp((foot.x * 0.35) + (counterX * 0.65), -58, 32),
    y: clamp(foot.y, -16, 16),
    z: clamp(foot.z, -12, 12)
  };
}

function cleanArmExtension(skeleton: SkeletonState, side: 'left' | 'right', poseName: string): SkeletonState {
  const next: SkeletonState = JSON.parse(JSON.stringify(skeleton));
  const upperKey = `${side}UpperArm` as 'leftUpperArm' | 'rightUpperArm';
  const forearmKey = `${side}Forearm` as 'leftForearm' | 'rightForearm';
  const upper = next[upperKey];
  const forearm = next[forearmKey];

  const isReachArm = upper.x <= -70;
  if (poseName === 'push' || ((poseName === 'punch' || poseName === 'point') && isReachArm)) {
    const reach = poseName === 'push' ? -78 : -92;
    next[upperKey] = {
      x: clamp(upper.x, reach, -18),
      y: clamp(upper.y, -18, 18),
      z: clamp(upper.z, side === 'left' ? -34 : -8, side === 'left' ? 8 : 34)
    };
    next[forearmKey] = {
      x: clamp(forearm.x, -12, 10),
      y: clamp(forearm.y, -10, 10),
      z: clamp(forearm.z, -16, 16)
    };
  }

  if (poseName === 'block' || poseName === 'guard') {
    next[upperKey] = {
      x: clamp(upper.x, -72, 28),
      y: clamp(upper.y, -60, 60),
      z: clamp(upper.z, -52, 52)
    };
    next[forearmKey] = {
      x: clamp(forearm.x, -140, -34),
      y: clamp(forearm.y, -90, 90),
      z: clamp(forearm.z, -52, 52)
    };
  }

  return next;
}

function applyPoseCleanup(skeleton: SkeletonState, poseName: string): SkeletonState {
  let next: SkeletonState = JSON.parse(JSON.stringify(skeleton));

  const isRunPose = poseName === 'run';
  const isPunchPose = poseName === 'punch';
  const isGuardPose = poseName === 'guard' || poseName === 'block';
  next.torso = clampJoint(next.torso, { x: isRunPose ? [-32, 58] : isPunchPose ? [-32, 52] : [-32, 28], y: [-38, 38], z: [-24, 24] });
  next.head = clampJoint(next.head, { x: isGuardPose ? [-45, 45] : [-24, 24], y: isGuardPose ? [-45, 45] : [-34, 34], z: isGuardPose ? [-50, 50] : [-20, 20] });
  next.pelvis = clampJoint(next.pelvis, { x: isRunPose ? [-28, 28] : isPunchPose ? [-28, 32] : [-28, 20], y: [-28, 28], z: [-24, 24] });

  next.leftThigh = clampJoint(next.leftThigh, { x: [-72, 72], y: [-24, 24], z: [-24, 24] });
  next.rightThigh = clampJoint(next.rightThigh, { x: [-72, 72], y: [-24, 24], z: [-24, 24] });
  next.leftShin = clampJoint(next.leftShin, { x: [-8, 92], y: [-12, 12], z: [-12, 12] });
  next.rightShin = clampJoint(next.rightShin, { x: [-8, 92], y: [-12, 12], z: [-12, 12] });

  next.leftFoot = balanceFoot(next.leftThigh, next.leftShin, next.leftFoot);
  next.rightFoot = balanceFoot(next.rightThigh, next.rightShin, next.rightFoot);

  next.leftUpperArm = clampJoint(next.leftUpperArm, { x: isRunPose ? [-110, 92] : isGuardPose ? [-105, 42] : [-105, 42], y: isGuardPose ? [-60, 60] : [-34, 34], z: [-62, 52] });
  next.rightUpperArm = clampJoint(next.rightUpperArm, { x: isRunPose ? [-110, 92] : isGuardPose ? [-105, 42] : [-105, 42], y: isGuardPose ? [-60, 60] : [-34, 34], z: [-52, 62] });
  next.leftForearm = clampJoint(next.leftForearm, { x: isRunPose ? [-112, 28] : isGuardPose ? [-140, 24] : [-84, 24], y: isGuardPose ? [-90, 90] : [-24, 24], z: isGuardPose ? [-52, 52] : [-34, 24] });
  next.rightForearm = clampJoint(next.rightForearm, { x: isRunPose ? [-112, 28] : isGuardPose ? [-140, 24] : [-84, 24], y: isGuardPose ? [-90, 90] : [-24, 24], z: isGuardPose ? [-52, 52] : [-24, 34] });

  next = cleanArmExtension(next, 'left', poseName);
  next = cleanArmExtension(next, 'right', poseName);

  return next;
}

export function compilePose(input: PoseCompileInput): PoseCompileResult {
  const definition = POSE_DEFINITIONS[input.basePose] || POSE_DEFINITIONS.neutral;
  const variantSkeleton = input.variant && definition.variants?.[input.variant];
  const baseSkeleton = mergeSkeleton(variantSkeleton || definition.skeleton);
  const modifiers = [...(definition.defaultModifiers || []), ...(input.modifiers || [])];
  const intensity = Math.max(0, Math.min(input.intensity ?? 1, 1.5));

  const skeleton = modifiers.reduce(
    (current, modifier) => addOverlay(current, modifierOverlays[modifier], intensity),
    baseSkeleton
  );

  return {
    skeleton: applyPoseCleanup(skeleton, definition.name),
    handGestures: { ...definition.defaultHandGestures }
  };
}

export function getDefaultHandGestures(stanceName: string, actionName: string): Partial<Record<'left' | 'right', HandGestureKey>> {
  if (actionName !== 'none' && POSE_DEFINITIONS[actionName]) {
    return { ...POSE_DEFINITIONS[actionName].defaultHandGestures };
  }

  return { ...(POSE_DEFINITIONS[stanceName] || POSE_DEFINITIONS.neutral).defaultHandGestures };
}

// ============================================================================
// COMPILATION ENGINE: Safe runtime structural compiler
// ============================================================================
export function getCombinedSkeleton(stanceName: string, actionName: string): SkeletonState {
  if (actionName !== 'none' && POSE_DEFINITIONS[actionName]) {
    return compilePose({ basePose: actionName }).skeleton;
  }

  if (POSE_DEFINITIONS[stanceName]) {
    return compilePose({ basePose: stanceName }).skeleton;
  }

  const stance = STANCE_PRESETS[stanceName] || STANCE_PRESETS.neutral;
  const action = ACTION_PRESETS[actionName] || ACTION_PRESETS.none;
  const base = DEFAULT_SKELETON;

  return {
    // Upper Body
    head: action.head !== undefined ? (action.head as JointTransform) : base.head,
    torso: action.torso !== undefined ? (action.torso as JointTransform) : base.torso,
    leftUpperArm: action.leftUpperArm !== undefined ? (action.leftUpperArm as JointTransform) : base.leftUpperArm,
    leftForearm: action.leftForearm !== undefined ? (action.leftForearm as JointTransform) : base.leftForearm,
    rightUpperArm: action.rightUpperArm !== undefined ? (action.rightUpperArm as JointTransform) : base.rightUpperArm,
    rightForearm: action.rightForearm !== undefined ? (action.rightForearm as JointTransform) : base.rightForearm,
    
    // Lower Body
    pelvis: stance.pelvis !== undefined ? (stance.pelvis as JointTransform) : base.pelvis,
    leftThigh: stance.leftThigh !== undefined ? (stance.leftThigh as JointTransform) : base.leftThigh,
    leftShin: stance.leftShin !== undefined ? (stance.leftShin as JointTransform) : base.leftShin,
    rightThigh: stance.rightThigh !== undefined ? (stance.rightThigh as JointTransform) : base.rightThigh,
    rightShin: stance.rightShin !== undefined ? (stance.rightShin as JointTransform) : base.rightShin,
    leftFoot: stance.leftFoot !== undefined ? (stance.leftFoot as JointTransform) : base.leftFoot,
    rightFoot: stance.rightFoot !== undefined ? (stance.rightFoot as JointTransform) : base.rightFoot,
    
    // Terminal controls remain available for manual slider fine-tuning.
    leftHandTerminal: action.leftHandTerminal !== undefined ? (action.leftHandTerminal as JointTransform) : base.leftHandTerminal,
    rightHandTerminal: action.rightHandTerminal !== undefined ? (action.rightHandTerminal as JointTransform) : base.rightHandTerminal,
    accessoryTerminal: base.accessoryTerminal
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY: Keeps legacy UI panel options working perfectly
// ============================================================================
export const POSE_PRESETS: Record<string, SkeletonState> = {
  neutral: { ...DEFAULT_SKELETON },
  ready: getCombinedSkeleton('ready', 'ready'),
  guard: getCombinedSkeleton('guard', 'guard'),
  walk: getCombinedSkeleton('walk', 'none'),
  run: getCombinedSkeleton('run', 'none'),
  punch: getCombinedSkeleton('guard', 'punch'), 
  block: getCombinedSkeleton('guard', 'block'),
  point: getCombinedSkeleton('ready', 'point'),
  push: getCombinedSkeleton('ready', 'push'),
  recoil: getCombinedSkeleton('dodge', 'recoil'),
  dodge: getCombinedSkeleton('dodge', 'ready'),
  kneel: getCombinedSkeleton('kneel', 'none')
};

// ============================================================================
// LEGACY GLB RIG LINKAGE: Kept for future asset validation, not used by the
// procedural actor renderer.
// ============================================================================
export const BONE_MAPPING = {
  pelvis: 'Bone',
  torso: 'Bone.001',
  head: 'Bone.003',
  
  // Arm chains exported under the chest joint.
  leftUpperArm: 'Bone.004',
  leftForearm: 'Bone.005',
  leftHandTerminal: 'Bone.006',
  
  rightUpperArm: 'Bone.007',
  rightForearm: 'Bone.008',
  rightHandTerminal: 'Bone.009',
  
  // Leg chains exported as two separate armature children.
  leftThigh: 'Bone.010',
  leftShin: 'Bone.011',
  leftFoot: 'Bone.012',
  
  rightThigh: 'Bone.013',
  rightShin: 'Bone.014',
  rightFoot: 'Bone.015',
  
  accessoryTerminal: 'Bone.015'
} as const;
