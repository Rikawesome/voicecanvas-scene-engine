import {
  CameraState,
  CanvasInstruction,
  CharacterState,
  RelationshipCanvasInstruction,
  SceneMood,
  SemanticModifier
} from '../types/scene';
import { compilePose, getCombinedSkeleton, getDefaultHandGestures } from '../constants/poses';

interface ParserResult {
  updatedCharacters?: CharacterState[];
  updatedMood?: SceneMood;
  updatedCamera?: CameraState;
  message?: string;
}

interface ActorToken {
  id: string;
  token: string;
}

const ACTOR_TOKENS: ActorToken[] = [
  { id: 'char-riku', token: 'riku' },
  { id: 'char-kiki', token: 'kiki' }
];

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));
const round = (value: number) => parseFloat(value.toFixed(2));

function getTargetIds(note: string, currentSelectedId: string | null): string[] {
  const explicitTargets = ACTOR_TOKENS
    .map(({ id, token }) => ({ id, index: note.indexOf(token) }))
    .filter(({ index }) => index !== -1)
    .sort((a, b) => a.index - b.index)
    .map(({ id }) => id);

  if (explicitTargets.length > 0) return explicitTargets;
  if (hasAny(note, ['them', 'each other', 'standoff', 'impact moment'])) return ACTOR_TOKENS.map(({ id }) => id);
  return currentSelectedId ? [currentSelectedId] : [];
}

function getTargetForActor(note: string, actorId: string): string | undefined {
  return ACTOR_TOKENS.find(({ id, token }) => id !== actorId && note.includes(token))?.id;
}

function getActorClause(note: string, actorId: string): string {
  const mentions = ACTOR_TOKENS
    .map(({ id, token }) => ({ id, token, index: note.indexOf(token) }))
    .filter((mention) => mention.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (mentions.length <= 1) return note;

  const mention = mentions.find((item) => item.id === actorId);
  if (!mention) return note;

  const mentionPosition = mentions.indexOf(mention);
  const nextMention = mentions[mentionPosition + 1];
  const ownClause = note.slice(mention.index, nextMention ? nextMention.index : note.length);
  const sharedTail = note.slice(mentions[mentions.length - 1].index + mentions[mentions.length - 1].token.length);

  return hasCommandIntent(ownClause) ? ownClause : `${ownClause} ${sharedTail}`;
}

function hasCommandIntent(text: string): boolean {
  return (
    hasAny(text, ['run', 'sprint', 'dash', 'advance', 'advances', 'approach', 'kneel', 'drop', 'crouch', 'walk', 'pace', 'step', 'dodge', 'evade', 'sidestep', 'retreat']) ||
    hasAny(text, ['guard stance', 'fight stance', 'defensive guard', 'defend', 'defensive', 'aggressive', 'ready', 'ready stance', 'neutral', 'stand', 'reset']) ||
    hasAny(text, ['punch', 'strike', 'jab', 'hook', 'block', 'shield', 'raise guard', 'point', 'aim', 'push', 'shove', 'recoil', 'flinch', 'stagger', 'relax', 'lower arms', 'stop action']) ||
    hasAny(text, ['left', 'right', 'forward', 'backward', 'rotate left', 'rotate right', 'behind'])
  );
}

function resolvePoseIntent(clause: string, activeChar: CharacterState) {
  let nextStance = activeChar.currentStance || 'neutral';
  let nextAction = activeChar.currentAction || 'none';
  let poseIntentDetected = false;

  if (hasAny(clause, ['run', 'sprint', 'dash'])) {
    nextStance = 'run';
    nextAction = 'none';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['kneel', 'drop', 'crouch'])) {
    nextStance = 'kneel';
    nextAction = 'none';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['dodge', 'evade', 'sidestep'])) {
    nextStance = 'dodge';
    nextAction = 'ready';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['advance', 'advances', 'approach'])) {
    nextStance = 'walk';
    nextAction = activeChar.currentAction === 'none' ? 'none' : activeChar.currentAction;
    poseIntentDetected = true;
  } else if (hasAny(clause, ['walk', 'pace', 'step'])) {
    nextStance = 'walk';
    nextAction = 'none';
    poseIntentDetected = true;
  } else if (
    hasAny(clause, ['guard stance', 'fight stance']) ||
    (clause.includes('guard') && !clause.includes('block'))
  ) {
    nextStance = 'guard';
    nextAction = 'guard';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['ready', 'ready stance', 'prepare'])) {
    nextStance = 'ready';
    if (nextAction === 'none') nextAction = 'ready';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['neutral', 'stand', 'reset'])) {
    nextStance = 'neutral';
    nextAction = 'none';
    poseIntentDetected = true;
  }

  if (hasAny(clause, ['block', 'blocks', 'shield', 'raise guard'])) {
    nextAction = 'block';
    if (nextStance === 'neutral') nextStance = 'guard';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['punch', 'punches', 'strike', 'jab', 'hook'])) {
    nextAction = 'punch';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['point', 'aim'])) {
    nextAction = 'point';
    if (nextStance === 'neutral') nextStance = 'ready';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['push', 'shove'])) {
    nextAction = 'push';
    if (nextStance === 'neutral') nextStance = 'ready';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['recoil', 'flinch', 'stagger', 'hit reaction'])) {
    nextAction = 'recoil';
    if (nextStance === 'neutral') nextStance = 'dodge';
    poseIntentDetected = true;
  } else if (hasAny(clause, ['relax', 'lower arms', 'stop action'])) {
    nextAction = 'none';
    poseIntentDetected = true;
  }

  return { nextStance, nextAction, poseIntentDetected };
}

function getPoseName(stance: string, action: string): string {
  if (stance === 'guard' && action === 'guard') return 'guard';
  if (action !== 'none') return action;
  return stance;
}

function getPoseBase(stance: string, action: string): string {
  return action !== 'none' ? action : stance;
}

function resolveSemanticModifiers(clause: string): SemanticModifier[] {
  const modifiers = new Set<SemanticModifier>();

  if (hasAny(clause, ['lean forward', 'push forward', 'advance', 'advances', 'approach', 'aggressive'])) {
    modifiers.add('leanForward');
  }
  if (hasAny(clause, ['lean backward', 'recoil', 'flinch', 'stagger', 'step back', 'retreat'])) {
    modifiers.add('leanBackward');
  }
  if (hasAny(clause, ['twist', 'turn torso'])) {
    modifiers.add('twistTorso');
  }
  if (hasAny(clause, ['extend punch', 'strong punch', 'full punch'])) {
    modifiers.add('extendPunch');
  }
  if (hasAny(clause, ['defensive', 'defend', 'guard', 'protect'])) {
    modifiers.add('defensive');
  }
  if (hasAny(clause, ['aggressive', 'attack', 'attacks', 'punch', 'punches'])) {
    modifiers.add('aggressive');
  }
  if (hasAny(clause, ['look at', 'points at', 'point at', 'faces', 'face'])) {
    modifiers.add('lookAtTarget');
  }

  return [...modifiers];
}

function resolveCameraIntent(note: string) {
  if (hasAny(note, ['low angle over', 'low ots'])) return 'lowOts' as const;
  if (hasAny(note, ['over shoulder', 'over-shoulder', 'ots'])) return 'ots' as const;
  if (hasAny(note, ['impact moment', 'impact shot'])) return 'impact' as const;
  if (hasAny(note, ['standoff', 'face off', 'face-off'])) return 'standoff' as const;
  if (hasAny(note, ['close up', 'close-up'])) return 'closeup' as const;
  if (hasAny(note, ['wide master', 'wide shot'])) return 'wide' as const;
  if (hasAny(note, ['low angle'])) return 'low' as const;
  if (hasAny(note, ['high angle'])) return 'high' as const;
  return undefined;
}

function resolveRelationshipInstructions(note: string, targetIds: string[]): RelationshipCanvasInstruction[] {
  const relationships: RelationshipCanvasInstruction[] = [];
  const primary = targetIds[0];
  const secondary = targetIds.find((id) => id !== primary);

  if (note.includes('face each other') || note.includes('make them face')) {
    relationships.push({ type: 'faceEachOther' });
  }
  if (hasAny(note, ['move closer', 'closer'])) {
    relationships.push({ type: 'moveCloser', actorId: primary, targetId: secondary });
  }
  if (hasAny(note, ['move apart', 'separate', 'space out'])) {
    relationships.push({ type: 'moveApart', actorId: primary, targetId: secondary });
  }
  if (hasAny(note, ['retreat from', 'backs away from'])) {
    relationships.push({ type: 'retreatFromTarget', actorId: primary, targetId: secondary });
  }
  if (note.includes('behind')) {
    relationships.push({ type: 'behindTarget', actorId: primary, targetId: secondary });
  }
  if (hasAny(note, ['standoff', 'face off', 'face-off'])) {
    relationships.push({ type: 'standoff' });
  }
  if (hasAny(note, ['impact moment', 'impact shot'])) {
    relationships.push({ type: 'impactMoment' });
  }

  return relationships;
}

export function buildCanvasInstruction(
  text: string,
  currentCharacters: CharacterState[],
  currentSelectedId: string | null
): CanvasInstruction {
  const note = text.toLowerCase().trim();
  const targetIds = getTargetIds(note, currentSelectedId);

  const actors = targetIds
    .map((id) => {
      const activeChar = currentCharacters.find((char) => char.id === id);
      if (!activeChar) return null;

      const actorClause = getActorClause(note, id);
      const { nextStance, nextAction, poseIntentDetected } = resolvePoseIntent(actorClause, activeChar);
      const basePose = poseIntentDetected ? getPoseBase(nextStance, nextAction) : undefined;
      const targetId = getTargetForActor(note, id);
      const modifiers = new Set<SemanticModifier>(resolveSemanticModifiers(actorClause));

      if (targetId && ['punch', 'point', 'block', 'push'].includes(nextAction)) {
        modifiers.add('lookAtTarget');
      }
      if (targetId && nextAction === 'punch') {
        modifiers.add('extendPunch');
        modifiers.add('aggressive');
      }
      if (targetId && nextAction === 'block') {
        modifiers.add('defensive');
      }
      if (nextAction === 'recoil') {
        modifiers.add('leanBackward');
      }

      if (!basePose && !targetId && modifiers.size === 0) return null;

      return {
        actorId: id,
        basePose,
        stance: poseIntentDetected ? nextStance : undefined,
        action: poseIntentDetected ? nextAction : undefined,
        modifiers: [...modifiers],
        targetId,
        intensity: hasAny(actorClause, ['strong', 'hard', 'aggressive', 'impact']) ? 1.2 : 1
      };
    })
    .filter(Boolean) as CanvasInstruction['actors'];

  const relationships = resolveRelationshipInstructions(note, targetIds);

  targetIds.forEach((id) => {
    const actorClause = getActorClause(note, id);
    const targetId = getTargetForActor(note, id) || targetIds.find((target) => target !== id);
    if (targetId && hasAny(actorClause, ['advance', 'advances', 'approach'])) {
      relationships.push({ type: 'moveCloser', actorId: id, targetId });
    }
    if (targetId && hasAny(actorClause, ['retreat', 'step back', 'backs away'])) {
      relationships.push({ type: 'retreatFromTarget', actorId: id, targetId });
    }
  });

  if (hasAny(note, ['punches', 'punch', 'strike', 'attacks']) && targetIds.length >= 1) {
    relationships.push({
      type: 'attackTarget',
      actorId: targetIds[0],
      targetId: targetIds[1] || getTargetForActor(note, targetIds[0])
    });
  }
  if (hasAny(note, ['blocks', 'block', 'defends', 'defend']) && targetIds.length >= 1) {
    relationships.push({
      type: 'defendAgainstTarget',
      actorId: targetIds[0],
      targetId: targetIds[1] || getTargetForActor(note, targetIds[0])
    });
  }

  let mood: SceneMood | undefined;
  if (hasAny(note, ['tense', 'suspense'])) mood = 'suspense';
  else if (hasAny(note, ['dramatic', 'dark'])) mood = 'dramatic';
  else if (hasAny(note, ['bright', 'neutral'])) mood = 'neutral';

  return {
    actors,
    relationships,
    camera: resolveCameraIntent(note),
    mood
  };
}

function applyDirectionalIntent(character: CharacterState, clause: string): CharacterState | null {
  let { x, y, z } = character.position;
  let rotY = character.rotation.y;
  const step = 1.0;
  let directionalIntentDetected = false;

  if (clause.includes('rotate left')) {
    rotY = (rotY - 45 + 360) % 360;
    directionalIntentDetected = true;
  } else if (clause.includes('rotate right')) {
    rotY = (rotY + 45) % 360;
    directionalIntentDetected = true;
  } else if (clause.includes('left')) {
    x -= step;
    directionalIntentDetected = true;
  } else if (clause.includes('right')) {
    x += step;
    directionalIntentDetected = true;
  } else if (clause.includes('forward')) {
    z -= step;
    directionalIntentDetected = true;
  } else if (clause.includes('backward')) {
    z += step;
    directionalIntentDetected = true;
  }

  if (!directionalIntentDetected) return null;

  return {
    ...character,
    position: { x: parseFloat(x.toFixed(1)), y, z: parseFloat(z.toFixed(1)) },
    rotation: { x: 0, y: rotY, z: 0 }
  };
}

function getActorIndexes(characters: CharacterState[]) {
  return {
    rikuIndex: characters.findIndex((c) => c.id === 'char-riku'),
    kikiIndex: characters.findIndex((c) => c.id === 'char-kiki')
  };
}

function rotatePairToFace(characters: CharacterState[]): CharacterState[] {
  const next = [...characters];
  const { rikuIndex, kikiIndex } = getActorIndexes(next);
  if (rikuIndex === -1 || kikiIndex === -1) return next;

  const riku = next[rikuIndex];
  const kiki = next[kikiIndex];
  const dx = kiki.position.x - riku.position.x;
  const dz = kiki.position.z - riku.position.z;
  const angleRikuToKiki = Math.round(Math.atan2(dx, dz) * (180 / Math.PI));
  const angleKikiToRiku = (angleRikuToKiki + 180) % 360;

  next[rikuIndex] = { ...riku, rotation: { x: 0, y: (angleRikuToKiki + 360) % 360, z: 0 } };
  next[kikiIndex] = { ...kiki, rotation: { x: 0, y: angleKikiToRiku, z: 0 } };

  return next;
}

function moveActorAlongRelationship(
  characters: CharacterState[],
  actorId: string,
  targetId: string,
  distanceStep: number
): CharacterState[] {
  const actor = characters.find((c) => c.id === actorId);
  const target = characters.find((c) => c.id === targetId);
  if (!actor || !target) return characters;

  const dx = target.position.x - actor.position.x;
  const dz = target.position.z - actor.position.z;
  const distance = Math.max(Math.sqrt(dx * dx + dz * dz), 0.001);
  const ratio = distanceStep / distance;

  return characters.map((char) => {
    if (char.id !== actorId) return char;
    return {
      ...char,
      position: {
        x: parseFloat((char.position.x + dx * ratio).toFixed(1)),
        y: char.position.y,
        z: parseFloat((char.position.z + dz * ratio).toFixed(1))
      }
    };
  });
}

function createStandoff(characters: CharacterState[]): CharacterState[] {
  const { rikuIndex, kikiIndex } = getActorIndexes(characters);
  if (rikuIndex === -1 || kikiIndex === -1) return characters;

  const next = characters.map((char) => ({ ...char }));
  next[rikuIndex] = {
    ...next[rikuIndex],
    position: { x: -1.6, y: next[rikuIndex].position.y, z: 0 },
    currentStance: 'guard',
    currentAction: 'guard',
    poseName: 'guard',
    skeleton: compilePose({ basePose: 'guard', modifiers: ['defensive'] }).skeleton,
    handGestures: getDefaultHandGestures('guard', 'guard')
  };
  next[kikiIndex] = {
    ...next[kikiIndex],
    position: { x: 1.6, y: next[kikiIndex].position.y, z: 0 },
    currentStance: 'ready',
    currentAction: 'ready',
    poseName: 'ready',
    skeleton: compilePose({ basePose: 'ready', modifiers: ['aggressive'] }).skeleton,
    handGestures: getDefaultHandGestures('ready', 'ready')
  };

  return rotatePairToFace(next);
}

function createImpactMoment(characters: CharacterState[]): CharacterState[] {
  const { rikuIndex, kikiIndex } = getActorIndexes(characters);
  if (rikuIndex === -1 || kikiIndex === -1) return characters;

  const next = characters.map((char) => ({ ...char }));
  next[rikuIndex] = {
    ...next[rikuIndex],
    position: { x: -0.85, y: next[rikuIndex].position.y, z: 0 },
    currentStance: 'guard',
    currentAction: 'punch',
    poseName: 'punch',
    skeleton: compilePose({ basePose: 'punch', modifiers: ['aggressive', 'extendPunch'], intensity: 1.2 }).skeleton,
    handGestures: getDefaultHandGestures('guard', 'punch')
  };
  next[kikiIndex] = {
    ...next[kikiIndex],
    position: { x: 0.85, y: next[kikiIndex].position.y, z: 0 },
    currentStance: 'dodge',
    currentAction: 'recoil',
    poseName: 'recoil',
    skeleton: compilePose({ basePose: 'recoil', modifiers: ['leanBackward'] }).skeleton,
    handGestures: getDefaultHandGestures('dodge', 'recoil')
  };

  return rotatePairToFace(next);
}

function getCameraFromIntent(intent: CanvasInstruction['camera'], characters: CharacterState[], currentCamera?: CameraState): CameraState | undefined {
  if (!intent) return undefined;
  const activeChar = characters[0];
  const opposingChar = characters[1] || activeChar;
  if (!activeChar) return currentCamera;

  const midpoint = {
    x: round((activeChar.position.x + opposingChar.position.x) / 2),
    y: round((activeChar.position.y + opposingChar.position.y) / 2),
    z: round((activeChar.position.z + opposingChar.position.z) / 2)
  };
  const dx = opposingChar.position.x - activeChar.position.x;
  const dz = opposingChar.position.z - activeChar.position.z;
  const distance = Math.max(Math.sqrt(dx * dx + dz * dz), 0.001);
  const forward = { x: dx / distance, z: dz / distance };
  const side = { x: forward.z, z: -forward.x };
  const { x, y, z } = activeChar.position;

  switch (intent) {
    case 'closeup':
      return { position: { x: round(x - forward.x * 2.8 + side.x * 0.35), y: round(y + 1.6), z: round(z - forward.z * 2.8 + side.z * 0.35) }, target: { x: round(x), y: round(y + 1.0), z: round(z) } };
    case 'wide':
      return { position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 3.6), z: round(midpoint.z + 7.6) }, target: { x: round(midpoint.x - 0.2), y: round(midpoint.y + 0.85), z: midpoint.z } };
    case 'low':
      return { position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 0.85), z: round(midpoint.z + 5.4) }, target: { x: round(midpoint.x - 0.2), y: round(midpoint.y + 1.15), z: midpoint.z } };
    case 'high':
      return { position: { x: round(midpoint.x + side.x * 1.6), y: round(midpoint.y + 4.8), z: round(midpoint.z + side.z * 1.6 + 2.2) }, target: { x: midpoint.x, y: round(midpoint.y + 0.45), z: midpoint.z } };
    case 'ots':
      return { position: { x: round(x - forward.x * 2.7 + side.x * 0.65), y: round(y + 1.45), z: round(z - forward.z * 2.7 + side.z * 0.65) }, target: { x: round(opposingChar.position.x), y: round(opposingChar.position.y + 1.0), z: round(opposingChar.position.z) } };
    case 'lowOts':
      return { position: { x: round(x - forward.x * 3.2 + side.x * 0.65), y: round(y + 0.9), z: round(z - forward.z * 3.2 + side.z * 0.65) }, target: { x: round(opposingChar.position.x), y: round(opposingChar.position.y + 1.1), z: round(opposingChar.position.z) } };
    case 'standoff':
      return { position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 2.2), z: round(midpoint.z + 5.8) }, target: { x: round(midpoint.x - 0.2), y: round(midpoint.y + 0.9), z: midpoint.z } };
    case 'impact':
      return { position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 1.55), z: round(midpoint.z + 4.4) }, target: { x: round(midpoint.x - 0.2), y: round(midpoint.y + 1.0), z: midpoint.z } };
    default:
      return currentCamera;
  }
}

export function parseDirectorNotes(
  text: string,
  currentCharacters: CharacterState[],
  currentSelectedId: string | null,
  currentCamera?: CameraState
): ParserResult {
  const note = text.toLowerCase().trim();
  const instruction = buildCanvasInstruction(text, currentCharacters, currentSelectedId);
  let updatedCharacters = [...currentCharacters];
  const statusMessages: string[] = [];
  let structuralChangeMade = false;
  const targetIds = getTargetIds(note, currentSelectedId);

  instruction.actors.forEach((actorInstruction) => {
    const targetIdx = updatedCharacters.findIndex((c) => c.id === actorInstruction.actorId);
    if (targetIdx === -1) return;

    let activeChar = updatedCharacters[targetIdx];
    const actorClause = getActorClause(note, actorInstruction.actorId);
    const nextStance = actorInstruction.stance || activeChar.currentStance || 'neutral';
    const nextAction = actorInstruction.action || activeChar.currentAction || 'none';

    if (actorInstruction.basePose) {
      const compiled = compilePose({
        basePose: actorInstruction.basePose,
        modifiers: actorInstruction.modifiers,
        intensity: actorInstruction.intensity,
        variant: actorInstruction.variant
      });
      activeChar = {
        ...activeChar,
        currentStance: nextStance,
        currentAction: nextAction,
        poseName: getPoseName(nextStance, nextAction),
        skeleton: compiled.skeleton,
        handGestures: compiled.handGestures
      };
      updatedCharacters[targetIdx] = activeChar;
      statusMessages.push(
        `Staged ${activeChar.name} -> [Stance: ${nextStance.toUpperCase()} | Action: ${nextAction.toUpperCase()}]`
      );
      structuralChangeMade = true;
    }

    if (!actorInstruction.basePose && actorInstruction.modifiers?.length) {
      const compiled = compilePose({
        basePose: getPoseBase(activeChar.currentStance || 'neutral', activeChar.currentAction || 'none'),
        modifiers: actorInstruction.modifiers,
        intensity: actorInstruction.intensity
      });
      activeChar = { ...activeChar, skeleton: compiled.skeleton, handGestures: compiled.handGestures };
      updatedCharacters[targetIdx] = activeChar;
      statusMessages.push(`Refined ${activeChar.name} with semantic modifiers`);
      structuralChangeMade = true;
    }

    const movedChar = applyDirectionalIntent(activeChar, actorClause);
    if (movedChar) {
      updatedCharacters[targetIdx] = movedChar;
      statusMessages.push(`Moved ${movedChar.name}`);
      structuralChangeMade = true;
    }
  });

  instruction.relationships?.forEach((relationship) => {
    const actorId = relationship.actorId || targetIds[0] || 'char-riku';
    const targetId = relationship.targetId || targetIds.find((id) => id !== actorId) || ACTOR_TOKENS.find(({ id }) => id !== actorId)?.id;

    if (relationship.type === 'faceEachOther') {
      updatedCharacters = rotatePairToFace(updatedCharacters);
      statusMessages.push('Actors rotated to face each other directly');
      structuralChangeMade = true;
    } else if (relationship.type === 'moveCloser' && targetId) {
      updatedCharacters = moveActorAlongRelationship(updatedCharacters, actorId, targetId, 1.0);
      statusMessages.push('Distance closed between actors smoothly along staging vector');
      structuralChangeMade = true;
    } else if (relationship.type === 'moveApart' && targetId) {
      updatedCharacters = moveActorAlongRelationship(updatedCharacters, actorId, targetId, -1.0);
      statusMessages.push('Actors moved apart for clearer panel spacing');
      structuralChangeMade = true;
    } else if (relationship.type === 'retreatFromTarget' && targetId) {
      updatedCharacters = moveActorAlongRelationship(updatedCharacters, actorId, targetId, -0.8);
      statusMessages.push('Actor retreated from target');
      structuralChangeMade = true;
    } else if (relationship.type === 'behindTarget' && targetId) {
      const target = updatedCharacters.find((char) => char.id === targetId);
      if (target) {
        updatedCharacters = updatedCharacters.map((char) => char.id === actorId
          ? { ...char, position: { x: target.position.x, y: char.position.y, z: round(target.position.z + 1.1) } }
          : char);
        statusMessages.push('Actor placed behind target');
        structuralChangeMade = true;
      }
    } else if (relationship.type === 'attackTarget') {
      updatedCharacters = rotatePairToFace(updatedCharacters);
      statusMessages.push('Attack relationship staged toward target');
      structuralChangeMade = true;
    } else if (relationship.type === 'defendAgainstTarget') {
      updatedCharacters = rotatePairToFace(updatedCharacters);
      statusMessages.push('Defense relationship staged against target');
      structuralChangeMade = true;
    } else if (relationship.type === 'standoff') {
      updatedCharacters = createStandoff(updatedCharacters);
      statusMessages.push('Standoff composition created');
      structuralChangeMade = true;
    } else if (relationship.type === 'impactMoment') {
      updatedCharacters = createImpactMoment(updatedCharacters);
      statusMessages.push('Impact moment created with action and reaction poses');
      structuralChangeMade = true;
    }
  });

  if (instruction.mood) {
    statusMessages.push(`Environment mood flipped to ${instruction.mood.toUpperCase()} lighting`);
  }

  const updatedCamera = getCameraFromIntent(instruction.camera, updatedCharacters, currentCamera);
  if (updatedCamera) {
    statusMessages.push(`Camera staged as ${instruction.camera}`);
  }

  if (structuralChangeMade || instruction.mood || updatedCamera) {
    return {
      updatedCharacters: structuralChangeMade ? updatedCharacters : undefined,
      updatedMood: instruction.mood,
      updatedCamera,
      message: `${statusMessages.join(' | ')}.`
    };
  }

  return {
    message: `Note parsed, but no actionable scene changes matched: "${text}"`
  };
}
