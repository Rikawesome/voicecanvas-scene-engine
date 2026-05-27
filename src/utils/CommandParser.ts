import {
  CameraState,
  CanvasInstruction,
  CanvasInstructionApplyResult,
  CharacterState,
  RelationshipCanvasInstruction,
  PoseVariant,
  SceneBeatKey,
  SceneMood,
  SemanticModifier
} from '../types/scene';
import { compilePose, DEFAULT_SKELETON, getDefaultHandGestures } from '../constants/poses';

interface ActorToken {
  id: string;
  token: string;
}

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));
const round = (value: number) => parseFloat(value.toFixed(2));
const THREE_DEG_TO_RAD = Math.PI / 180;
const CONTACT_DISTANCE = 1.18;
const GUARD_DISTANCE = 1.34;
const OBSERVER_DISTANCE = 2.35;
const slugifyActorName = (value: string) => value
  .toLowerCase()
  .replace(/\([^)]*\)/g, ' ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const displayActorName = (value: string) => {
  const clean = value.replace(/^char-/, '').replace(/[-_]+/g, ' ').trim();
  if (!clean) return 'Actor';
  return clean.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

function buildActorTokens(characters: CharacterState[]): ActorToken[] {
  const seen = new Set<string>();
  const tokens: ActorToken[] = [];

  characters.forEach((char) => {
    const candidates = [
      char.id,
      char.id.replace(/^char-/, ''),
      char.name,
      char.name.split(/[([]/)[0]
    ];

    candidates.forEach((candidate) => {
      const normalized = slugifyActorName(candidate).replace(/-/g, ' ');
      if (!normalized || seen.has(`${char.id}:${normalized}`)) return;
      seen.add(`${char.id}:${normalized}`);
      tokens.push({ id: char.id, token: normalized });
    });
  });

  return tokens.sort((a, b) => b.token.length - a.token.length);
}

function inferNamedActorRefs(text: string, existingTokens: ActorToken[]) {
  const ignored = new Set([
    'make',
    'create',
    'low',
    'wide',
    'close',
    'impact',
    'standoff',
    'director',
    'canvas'
  ]);
  const existingTokenValues = new Set(existingTokens.map(({ token }) => token));
  const matches = text.match(/\b[A-Z][a-zA-Z0-9_-]{1,}\b/g) || [];

  return [...new Set(matches)]
    .filter((name) => !ignored.has(name.toLowerCase()))
    .filter((name) => !existingTokenValues.has(slugifyActorName(name).replace(/-/g, ' ')));
}

function buildActorTokensForText(text: string, characters: CharacterState[]) {
  const tokens = buildActorTokens(characters);
  inferNamedActorRefs(text, tokens).forEach((name) => {
    tokens.push({ id: actorIdFromRef(name), token: slugifyActorName(name).replace(/-/g, ' ') });
  });
  return tokens.sort((a, b) => b.token.length - a.token.length);
}

function actorIdFromRef(ref: string): string {
  return ref.startsWith('char-') ? ref : `char-${slugifyActorName(ref)}`;
}

function createSemanticActor(ref: string, index: number): CharacterState {
  const id = actorIdFromRef(ref);
  const angle = index * Math.PI * 0.62;
  const radius = 2.3 + Math.floor(index / 5) * 0.7;

  return {
    id,
    name: displayActorName(ref),
    position: {
      x: round(Math.cos(angle) * radius),
      y: 0,
      z: round(Math.sin(angle) * radius)
    },
    rotation: { x: 0, y: 180, z: 0 },
    poseName: 'neutral',
    currentStance: 'neutral',
    currentAction: 'none',
    skeleton: JSON.parse(JSON.stringify(DEFAULT_SKELETON))
  };
}

function getTargetIds(note: string, currentSelectedId: string | null, actorTokens: ActorToken[]): string[] {
  const explicitTargets = actorTokens
    .map(({ id, token }) => ({ id, index: note.indexOf(token) }))
    .filter(({ index }) => index !== -1)
    .sort((a, b) => a.index - b.index)
    .map(({ id }) => id);

  if (explicitTargets.length > 0) return [...new Set(explicitTargets)];
  if (hasAny(note, ['them', 'each other', 'standoff', 'impact moment'])) return [...new Set(actorTokens.map(({ id }) => id))];
  return currentSelectedId ? [currentSelectedId] : [];
}

function getTargetForActor(note: string, actorId: string, actorTokens: ActorToken[]): string | undefined {
  return actorTokens.find(({ id, token }) => id !== actorId && note.includes(token))?.id;
}

function getMentionedActorIds(note: string, actorTokens: ActorToken[]): string[] {
  return [...new Set(
    actorTokens
      .map(({ id, token }) => ({ id, index: note.indexOf(token) }))
      .filter(({ index }) => index !== -1)
      .sort((a, b) => a.index - b.index)
      .map(({ id }) => id)
  )];
}

function findActorWithTerms(note: string, actorTokens: ActorToken[], terms: string[]): string | undefined {
  return getMentionedActorIds(note, actorTokens).find((id) => {
    const clause = getActorClause(note, id, actorTokens);
    return hasAny(clause, terms);
  });
}

function getActorDisplayRef(id: string) {
  return id.replace(/^char-/, '');
}

function resolveActorRef(ref: string | undefined, actorTokens: ActorToken[]): string | undefined {
  if (!ref) return undefined;
  const normalized = slugifyActorName(ref).replace(/-/g, ' ');
  return actorTokens.find(({ id, token }) => id === ref || token === normalized || normalized.includes(token))?.id;
}

function getActorClause(note: string, actorId: string, actorTokens: ActorToken[]): string {
  const mentions = actorTokens
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
    hasAny(text, ['run', 'sprint', 'dash', 'chase', 'flee', 'escape', 'advance', 'advances', 'approach', 'kneel', 'drop', 'crouch', 'walk', 'pace', 'step', 'dodge', 'evade', 'sidestep', 'retreat']) ||
    hasAny(text, ['guard stance', 'fight stance', 'defensive guard', 'defend', 'defensive', 'aggressive', 'ready', 'ready stance', 'neutral', 'stand', 'reset']) ||
    hasAny(text, ['punch', 'strike', 'jab', 'cross', 'hook', 'uppercut', 'block', 'shield', 'raise guard', 'point', 'aim', 'push', 'shove', 'recoil', 'flinch', 'stagger', 'relax', 'lower arms', 'stop action']) ||
    hasAny(text, ['left', 'right', 'forward', 'backward', 'rotate left', 'rotate right', 'behind'])
  );
}

function resolvePoseIntent(clause: string, activeChar: CharacterState) {
  let nextStance = activeChar.currentStance || 'neutral';
  let nextAction = activeChar.currentAction || 'none';
  let poseIntentDetected = false;

  if (hasAny(clause, ['run', 'sprint', 'dash', 'chase', 'chases', 'flee', 'flees', 'escape', 'escapes'])) {
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
    hasAny(clause, ['guard stance', 'fight stance', 'defensive stance', 'boxing stance', 'boxing guard', 'boxing defensive', 'hands up guard']) ||
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
  } else if (hasAny(clause, ['punch', 'punches', 'strike', 'jab', 'cross', 'hook', 'uppercut'])) {
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

function resolvePunchVariant(clause: string): PoseVariant | undefined {
  if (hasAny(clause, ['uppercut'])) return 'uppercut';
  if (hasAny(clause, ['hook'])) return 'hook';
  if (hasAny(clause, ['cross', 'straight right', 'power punch'])) return 'cross';
  if (hasAny(clause, ['jab', 'straight left'])) return 'jab';
  return undefined;
}

function resolveRunVariant(clause: string): PoseVariant | undefined {
  if (hasAny(clause, ['dash start', 'launch', 'burst forward', 'take off'])) return 'dashStart';
  if (hasAny(clause, ['look back', 'looks back', 'flee', 'flees', 'escape', 'escapes', 'panic'])) return 'lookBackRun';
  if (hasAny(clause, ['chase', 'chases', 'charging', 'charge', 'rush', 'aggressive run'])) return 'chaseDrive';
  if (hasAny(clause, ['run', 'runs', 'sprint', 'sprints', 'dash'])) return 'runForward';
  return undefined;
}

function resolveGuardVariant(clause: string): PoseVariant | undefined {
  if (hasAny(clause, ['high guard', 'tight guard', 'cover up', 'shell guard'])) return 'highGuard';
  if (hasAny(clause, ['low guard', 'body guard', 'ribs guard'])) return 'lowGuard';
  if (hasAny(clause, ['side guard', 'side stance', 'bladed stance', 'shoulder forward'])) return 'sideGuard';
  if (hasAny(clause, ['cautious guard', 'careful guard', 'nervous guard', 'loose guard'])) return 'cautiousGuard';
  if (hasAny(clause, ['boxing guard', 'boxing defensive', 'boxing stance', 'defensive stance', 'hands up guard'])) return 'boxingGuard';
  return undefined;
}

function resolveBlockVariant(clause: string): PoseVariant | undefined {
  if (hasAny(clause, ['intercept block', 'hand block', 'palm block', 'stop punch', 'catch punch'])) return 'interceptBlock';
  return undefined;
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
  if (hasAny(note, ['two shot', 'two-shot'])) return 'twoShot' as const;
  if (hasAny(note, ['group shot', 'group frame'])) return 'groupShot' as const;
  if (hasAny(note, ['reaction frame', 'reaction shot'])) return 'reactionFrame' as const;
  if (hasAny(note, ['establishing', 'establishing shot'])) return 'establishing' as const;
  if (hasAny(note, ['dominance low angle', 'power low angle'])) return 'dominanceLowAngle' as const;
  if (hasAny(note, ['vulnerability high angle', 'weak high angle'])) return 'vulnerabilityHighAngle' as const;
  if (hasAny(note, ['low angle over', 'low ots'])) return 'lowOts' as const;
  if (hasAny(note, ['over shoulder', 'over-shoulder', 'ots'])) return 'ots' as const;
  if (hasAny(note, ['impact frame', 'impact moment', 'impact shot'])) return 'impactFrame' as const;
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

function buildMultiActorRelationshipInstruction(note: string, actorTokens: ActorToken[]): CanvasInstruction | null {
  const mentionedIds = getMentionedActorIds(note, actorTokens);
  const mentionedRefs = mentionedIds.map(getActorDisplayRef);

  if (hasAny(note, ['protects', 'protect ', 'guards ', 'shields ']) && mentionedIds.length >= 2) {
    const protectorId = findActorWithTerms(note, actorTokens, ['protects', 'protect ', 'guards ', 'shields ']) || mentionedIds[0];
    const protectedId = mentionedIds.find((id) => id !== protectorId) || mentionedIds[1];
    const attackerId = findActorWithTerms(note, actorTokens, ['attacks', 'attack ', 'punches', 'strike', 'strikes']) ||
      mentionedIds.find((id) => id !== protectorId && id !== protectedId);

    return {
      actors: [
        { actorId: protectorId, role: 'defender', basePose: 'block', stance: 'guard', action: 'block', targetId: attackerId || protectedId, modifiers: ['defensive', 'lookAtTarget'] },
        { actorId: protectedId, role: 'victim', basePose: 'ready', stance: 'ready', action: 'none', targetId: attackerId || protectorId, modifiers: ['leanBackward'] },
        ...(attackerId ? [{ actorId: attackerId, role: 'attacker' as const, basePose: 'punch', stance: 'guard', action: 'punch', variant: resolvePunchVariant(note) || 'cross' as PoseVariant, targetId: protectorId, modifiers: ['aggressive', 'extendPunch', 'lookAtTarget'] as SemanticModifier[], intensity: 1.1 }] : [])
      ],
      relationships: [
        ...(attackerId ? [{ type: 'attackTarget' as const, actorId: attackerId, targetId: protectorId }] : []),
        { type: 'defendAgainstTarget', actorId: protectorId, targetId: attackerId || protectedId },
        { type: 'behindTarget', actorId: protectedId, targetId: protectorId },
        { type: 'faceEachOther' }
      ],
      focusActors: mentionedRefs,
      camera: attackerId ? 'impactFrame' : 'standoff',
      composition: 'protectorForeground',
      mood: 'suspense'
    };
  }

  if (hasAny(note, ['attacks', 'attack ', 'punches', 'punch ', 'strikes', 'strike ']) && mentionedIds.length >= 2) {
    const attackerId = findActorWithTerms(note, actorTokens, ['attacks', 'attack ', 'punches', 'punch ', 'strikes', 'strike ']) || mentionedIds[0];
    const targetId = mentionedIds.find((id) => id !== attackerId) || mentionedIds[1];
    const observerId = findActorWithTerms(note, actorTokens, ['watches', 'watching', 'observes', 'looks on']);

    return {
      actors: [
        {
          actorId: attackerId,
          role: 'attacker',
          basePose: 'punch',
          stance: 'guard',
          action: 'punch',
          variant: resolvePunchVariant(note) || 'cross',
          targetId,
          modifiers: ['aggressive', 'extendPunch', 'lookAtTarget'],
          intensity: 1.15,
          ...(observerId ? { position: { x: -0.85, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 } } : {})
        },
        {
          actorId: targetId,
          role: 'defender',
          basePose: hasAny(note, ['blocks', 'block ', 'defends']) ? 'block' : 'recoil',
          stance: hasAny(note, ['blocks', 'block ', 'defends']) ? 'guard' : 'dodge',
          action: hasAny(note, ['blocks', 'block ', 'defends']) ? 'block' : 'recoil',
          targetId: attackerId,
          modifiers: ['defensive', 'lookAtTarget'],
          ...(observerId ? { position: { x: 0.75, y: 0, z: 0 }, rotation: { x: 0, y: 270, z: 0 } } : {})
        },
        ...(observerId && observerId !== attackerId && observerId !== targetId
          ? [{ actorId: observerId, role: 'observer' as const, basePose: 'ready', stance: 'ready', action: 'none', targetId, modifiers: ['lookAtTarget'] as SemanticModifier[] }]
          : [])
      ],
      relationships: [
        { type: 'attackTarget', actorId: attackerId, targetId },
        ...(observerId && observerId !== attackerId && observerId !== targetId ? [{ type: 'observerLane' as const, actorId: observerId, targetId, secondaryTargetId: attackerId }] : [])
      ],
      focusActors: observerId ? [getActorDisplayRef(attackerId), getActorDisplayRef(targetId), getActorDisplayRef(observerId)] : [getActorDisplayRef(attackerId), getActorDisplayRef(targetId)],
      camera: observerId ? 'groupShot' : 'impactFrame',
      composition: observerId ? 'observerWide' : 'attackerForeground',
      mood: 'dramatic'
    };
  }

  if (hasAny(note, ['surround', 'surrounds', 'encircle', 'encircles'])) {
    const targetId = mentionedIds.find((id) => {
      const clause = getActorClause(note, id, actorTokens);
      return !hasAny(clause, ['surround', 'surrounds', 'encircle', 'encircles']);
    }) || mentionedIds[0] || 'char-riku';
    const surroundingIds = mentionedIds.filter((id) => id !== targetId);
    const fallbackIds = ['char-kiki', 'char-kanata', 'char-mina'].filter((id) => id !== targetId);
    const ringIds = [...new Set([...surroundingIds, ...fallbackIds])].slice(0, note.includes('three') ? 3 : Math.max(2, surroundingIds.length));

    return {
      actors: [
        { actorId: targetId, role: 'victim', basePose: 'guard', stance: 'guard', action: 'guard', modifiers: ['defensive'] },
        ...ringIds.map((id) => ({ actorId: id, role: 'attacker' as const, basePose: 'ready', stance: 'ready', action: 'ready', targetId, modifiers: ['aggressive', 'lookAtTarget'] as SemanticModifier[] }))
      ],
      relationships: [{ type: 'surroundTarget', targetId, actorId: ringIds[0] }],
      focusActors: [getActorDisplayRef(targetId), ...ringIds.map(getActorDisplayRef)],
      camera: 'establishing',
      composition: 'surrounded',
      mood: 'suspense'
    };
  }

  if (note.includes('between') && mentionedIds.length >= 3) {
    const middleId = mentionedIds[0];
    const leftId = mentionedIds[1];
    const rightId = mentionedIds[2];

    return {
      actors: [
        { actorId: middleId, role: 'defender', basePose: 'guard', stance: 'guard', action: 'guard', modifiers: ['defensive'] },
        { actorId: leftId, role: 'support', basePose: 'ready', stance: 'ready', action: 'none', targetId: rightId, modifiers: ['lookAtTarget'] },
        { actorId: rightId, role: 'attacker', basePose: 'ready', stance: 'ready', action: 'ready', targetId: middleId, modifiers: ['aggressive', 'lookAtTarget'] }
      ],
      relationships: [{ type: 'betweenTargets', actorId: middleId, targetId: leftId, secondaryTargetId: rightId }],
      focusActors: [getActorDisplayRef(middleId), getActorDisplayRef(leftId), getActorDisplayRef(rightId)],
      camera: 'twoShot',
      mood: 'suspense'
    };
  }

  if (hasAny(note, ['three person standoff', 'three-person standoff', 'three actor standoff', 'three-actor standoff'])) {
    const focusIds = mentionedIds.length >= 3 ? mentionedIds.slice(0, 3) : ['char-riku', 'char-kiki', 'char-kanata'];
    return {
      actors: focusIds.map((id, index) => ({
        actorId: id,
        role: index === 0 ? 'defender' : 'attacker',
        basePose: index === 0 ? 'guard' : 'ready',
        stance: index === 0 ? 'guard' : 'ready',
        action: index === 0 ? 'guard' : 'ready',
        modifiers: [index === 0 ? 'defensive' : 'aggressive'] as SemanticModifier[]
      })),
      relationships: [{ type: 'standoff' }],
      focusActors: focusIds.map(getActorDisplayRef),
      camera: 'standoff',
      mood: 'dramatic'
    };
  }

  return null;
}

export function buildCanvasInstruction(
  text: string,
  currentCharacters: CharacterState[],
  currentSelectedId: string | null
): CanvasInstruction {
  const note = text.toLowerCase().trim();
  const actorTokens = buildActorTokensForText(text, currentCharacters);
  const multiActorInstruction = buildMultiActorRelationshipInstruction(note, actorTokens);
  if (multiActorInstruction) return multiActorInstruction;

  const targetIds = getTargetIds(note, currentSelectedId, actorTokens);

  const actors = targetIds
    .map((id) => {
      const activeChar = currentCharacters.find((char) => char.id === id) || createSemanticActor(id, currentCharacters.length);

      const actorClause = getActorClause(note, id, actorTokens);
      const { nextStance, nextAction, poseIntentDetected } = resolvePoseIntent(actorClause, activeChar);
      const basePose = poseIntentDetected ? getPoseBase(nextStance, nextAction) : undefined;
      const variant = nextAction === 'punch'
        ? resolvePunchVariant(actorClause)
        : nextAction === 'block'
          ? resolveBlockVariant(actorClause)
          : nextStance === 'run'
            ? resolveRunVariant(actorClause)
            : nextStance === 'guard'
              ? resolveGuardVariant(actorClause)
              : undefined;
      const targetId = getTargetForActor(note, id, actorTokens);
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
        variant,
        modifiers: [...modifiers],
        targetId,
        intensity: hasAny(actorClause, ['strong', 'hard', 'aggressive', 'impact']) ? 1.2 : 1
      };
    })
    .filter(Boolean) as CanvasInstruction['actors'];

  const relationships = resolveRelationshipInstructions(note, targetIds);

  targetIds.forEach((id) => {
    const actorClause = getActorClause(note, id, actorTokens);
    const targetId = getTargetForActor(note, id, actorTokens) || targetIds.find((target) => target !== id);
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
      targetId: targetIds[1] || getTargetForActor(note, targetIds[0], actorTokens)
    });
  }
  if (hasAny(note, ['blocks', 'block', 'defends', 'defend']) && targetIds.length >= 1) {
    relationships.push({
      type: 'defendAgainstTarget',
      actorId: targetIds[0],
      targetId: targetIds[1] || getTargetForActor(note, targetIds[0], actorTokens)
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

export const SCENE_BEAT_PRESETS: Record<SceneBeatKey, CanvasInstruction> = {
  confrontation: {
    actors: [
      { actorId: 'char-riku', basePose: 'guard', stance: 'guard', action: 'guard', modifiers: ['defensive'], targetId: 'char-kiki' },
      { actorId: 'char-kiki', basePose: 'ready', stance: 'ready', action: 'ready', modifiers: ['aggressive'], targetId: 'char-riku' }
    ],
    relationships: [{ type: 'standoff' }],
    camera: 'twoShot',
    composition: 'powerImbalance',
    mood: 'dramatic'
  },
  attackWindup: {
    actors: [
      { actorId: 'char-riku', basePose: 'guard', stance: 'guard', action: 'guard', modifiers: ['defensive'], targetId: 'char-kiki' },
      { actorId: 'char-kiki', basePose: 'punch', stance: 'guard', action: 'punch', variant: 'cross', modifiers: ['aggressive', 'extendPunch'], targetId: 'char-riku', intensity: 0.85 }
    ],
    relationships: [{ type: 'faceEachOther' }, { type: 'moveCloser', actorId: 'char-kiki', targetId: 'char-riku' }],
    camera: 'dominanceLowAngle',
    composition: 'attackerForeground',
    mood: 'suspense'
  },
  impactReaction: {
    actors: [],
    relationships: [{ type: 'impactMoment' }],
    camera: 'impactFrame',
    composition: 'attackerForeground',
    mood: 'dramatic'
  },
  dialogueTension: {
    actors: [
      { actorId: 'char-riku', basePose: 'ready', stance: 'ready', action: 'ready', modifiers: ['defensive'], targetId: 'char-kiki' },
      { actorId: 'char-kiki', basePose: 'point', stance: 'ready', action: 'point', modifiers: ['lookAtTarget'], targetId: 'char-riku' }
    ],
    relationships: [{ type: 'faceEachOther' }, { type: 'moveApart', actorId: 'char-kiki', targetId: 'char-riku' }],
    camera: 'twoShot',
    composition: 'neutral',
    mood: 'suspense'
  },
  chase: {
    actors: [
      { actorId: 'char-riku', basePose: 'run', stance: 'run', action: 'none', variant: 'lookBackRun', position: { x: 0.9, y: 0, z: -0.2 }, rotation: { x: 0, y: 90, z: 0 } },
      { actorId: 'char-kiki', basePose: 'run', stance: 'run', action: 'none', variant: 'chaseDrive', modifiers: ['aggressive'], position: { x: -1.0, y: 0, z: 0.25 }, rotation: { x: 0, y: 90, z: 0 } }
    ],
    camera: 'establishing',
    composition: 'observerWide',
    mood: 'dramatic'
  },
  reveal: {
    actors: [
      { actorId: 'char-riku', basePose: 'ready', stance: 'ready', action: 'ready', modifiers: ['lookAtTarget'] },
      { actorId: 'char-kiki', basePose: 'neutral', stance: 'neutral', action: 'none' }
    ],
    relationships: [{ type: 'moveApart', actorId: 'char-kiki', targetId: 'char-riku' }],
    camera: 'dominanceLowAngle',
    composition: 'powerImbalance',
    mood: 'suspense'
  },
  retreat: {
    actors: [
      { actorId: 'char-riku', basePose: 'recoil', stance: 'dodge', action: 'recoil', modifiers: ['leanBackward'], targetId: 'char-kiki' },
      { actorId: 'char-kiki', basePose: 'ready', stance: 'ready', action: 'ready', modifiers: ['aggressive'], targetId: 'char-riku' }
    ],
    relationships: [{ type: 'retreatFromTarget', actorId: 'char-riku', targetId: 'char-kiki' }, { type: 'faceEachOther' }],
    camera: 'reactionFrame',
    mood: 'dramatic'
  },
  dominance: {
    actors: [
      { actorId: 'char-riku', basePose: 'kneel', stance: 'kneel', action: 'none', modifiers: ['leanBackward'], targetId: 'char-kiki' },
      { actorId: 'char-kiki', basePose: 'point', stance: 'ready', action: 'point', modifiers: ['aggressive', 'lookAtTarget'], targetId: 'char-riku' }
    ],
    relationships: [{ type: 'faceEachOther' }, { type: 'moveCloser', actorId: 'char-kiki', targetId: 'char-riku' }],
    camera: 'dominanceLowAngle',
    composition: 'powerImbalance',
    mood: 'dramatic'
  },
  vulnerability: {
    actors: [
      { actorId: 'char-riku', basePose: 'kneel', stance: 'kneel', action: 'none', modifiers: ['leanBackward'] },
      { actorId: 'char-kiki', basePose: 'neutral', stance: 'neutral', action: 'none' }
    ],
    relationships: [{ type: 'moveApart', actorId: 'char-kiki', targetId: 'char-riku' }],
    camera: 'vulnerabilityHighAngle',
    composition: 'powerImbalance',
    mood: 'suspense'
  }
};

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

function findFallbackTargetId(characters: CharacterState[], actorId: string | undefined, targetIds: string[] = []) {
  if (!actorId) return targetIds[0] || characters[0]?.id;
  return targetIds.find((id) => id !== actorId) || characters.find((char) => char.id !== actorId)?.id;
}

function getFlatVector(from: CharacterState, to: CharacterState) {
  const dx = to.position.x - from.position.x;
  const dz = to.position.z - from.position.z;
  const distance = Math.max(Math.sqrt(dx * dx + dz * dz), 0.001);

  return {
    dx,
    dz,
    distance,
    nx: dx / distance,
    nz: dz / distance,
    sideX: dz / distance,
    sideZ: -dx / distance
  };
}

function faceActorToward(actor: CharacterState, target: CharacterState): CharacterState {
  const { dx, dz } = getFlatVector(actor, target);
  const angle = Math.round(Math.atan2(dx, dz) * (180 / Math.PI));
  return { ...actor, rotation: { x: 0, y: (angle + 360) % 360, z: 0 } };
}

function compileCharacterPose(
  character: CharacterState,
  basePose: string,
  options: { stance?: string; action?: string; modifiers?: SemanticModifier[]; intensity?: number; variant?: PoseVariant } = {}
): CharacterState {
  const compiled = compilePose({
    basePose,
    modifiers: options.modifiers,
    intensity: options.intensity,
    variant: options.variant
  });
  const stance = options.stance || character.currentStance || basePose;
  const action = options.action || character.currentAction || 'none';

  return {
    ...character,
    currentStance: stance,
    currentAction: action,
    poseName: getPoseName(stance, action),
    skeleton: compiled.skeleton,
    handGestures: getDefaultHandGestures(stance, action)
  };
}

function withContactPunchPose(character: CharacterState): CharacterState {
  const posed = compileCharacterPose(character, 'punch', {
    stance: 'guard',
    action: 'punch',
    modifiers: ['aggressive', 'extendPunch', 'lookAtTarget'],
    intensity: 1.18,
    variant: 'cross'
  });

  return {
    ...posed,
    skeleton: {
      ...posed.skeleton,
      torso: { ...posed.skeleton.torso, x: 42, y: -18, z: 0 },
      head: { ...posed.skeleton.head, x: 10, y: -8, z: 0 },
      leftUpperArm: { x: -42, y: -2, z: -20 },
      leftForearm: { x: -62, y: 0, z: -8 },
      rightUpperArm: { x: -104, y: 2, z: 8 },
      rightForearm: { x: -4, y: 0, z: 1 }
    }
  };
}

function withContactBlockPose(character: CharacterState): CharacterState {
  const posed = compileCharacterPose(character, 'block', {
    stance: 'guard',
    action: 'block',
    modifiers: ['defensive', 'lookAtTarget'],
    intensity: 1.08
  });

  return {
    ...posed,
    skeleton: {
      ...posed.skeleton,
      torso: { ...posed.skeleton.torso, x: -8, y: 3, z: 0 },
      head: { ...posed.skeleton.head, x: 5, y: 4, z: 0 },
      leftUpperArm: { x: -76, y: -6, z: -26 },
      leftForearm: { x: -50, y: 0, z: -8 },
      rightUpperArm: { x: -76, y: 6, z: 26 },
      rightForearm: { x: -50, y: 0, z: 8 },
      leftHandTerminal: { x: 0, y: 0, z: -6 },
      rightHandTerminal: { x: 0, y: 0, z: 6 }
    }
  };
}

function withBalancedRecoilPose(character: CharacterState): CharacterState {
  const posed = compileCharacterPose(character, 'recoil', {
    stance: 'dodge',
    action: 'recoil',
    modifiers: ['leanBackward', 'lookAtTarget'],
    intensity: 0.92
  });

  return {
    ...posed,
    skeleton: {
      ...posed.skeleton,
      torso: { x: 18, y: -10, z: 7 },
      pelvis: { x: 7, y: 10, z: -8 },
      head: { x: 13, y: -12, z: -3 },
      leftThigh: { x: 10, y: 0, z: -10 },
      leftShin: { x: 30, y: 0, z: 0 },
      rightThigh: { x: -18, y: 0, z: 12 },
      rightShin: { x: 26, y: 0, z: 0 },
      leftFoot: { x: -38, y: -8, z: 2 },
      rightFoot: { x: -8, y: 8, z: -2 }
    }
  };
}

function getFocusCharacters(characters: CharacterState[], focusIds: string[] = []) {
  const focused = focusIds
    .map((id) => characters.find((char) => char.id === id))
    .filter(Boolean) as CharacterState[];
  return focused.length > 0 ? focused : characters;
}

function rotateActorsToFaceTargets(characters: CharacterState[], focusIds: string[] = []): CharacterState[] {
  const focusCharacters = getFocusCharacters(characters, focusIds);
  if (focusCharacters.length < 2) return characters;
  const centroid = focusCharacters.reduce((acc, char) => ({
    x: acc.x + char.position.x / focusCharacters.length,
    z: acc.z + char.position.z / focusCharacters.length
  }), { x: 0, z: 0 });

  return characters.map((char) => {
    if (!focusCharacters.some((focus) => focus.id === char.id)) return char;
    const dx = centroid.x - char.position.x;
    const dz = centroid.z - char.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return char;
    const angle = Math.round(Math.atan2(dx, dz) * (180 / Math.PI));
    return { ...char, rotation: { x: 0, y: (angle + 360) % 360, z: 0 } };
  });
}

function rotateActorTowardTarget(characters: CharacterState[], actorId: string, targetId: string): CharacterState[] {
  const next = [...characters];
  const actorIndex = next.findIndex((char) => char.id === actorId);
  const actor = next[actorIndex];
  const target = next.find((char) => char.id === targetId);
  if (actorIndex === -1 || !actor || !target) return next;

  const dx = target.position.x - actor.position.x;
  const dz = target.position.z - actor.position.z;
  const angle = Math.round(Math.atan2(dx, dz) * (180 / Math.PI));
  next[actorIndex] = { ...actor, rotation: { x: 0, y: (angle + 360) % 360, z: 0 } };

  return next;
}

function stageAttackContact(characters: CharacterState[], attackerId: string, targetId: string): CharacterState[] {
  const attacker = characters.find((char) => char.id === attackerId);
  const target = characters.find((char) => char.id === targetId);
  if (!attacker || !target) return characters;

  const vector = getFlatVector(target, attacker);
  const attackerPosition = {
    x: round(target.position.x + vector.nx * CONTACT_DISTANCE + vector.sideX * 0.12),
    y: attacker.position.y,
    z: round(target.position.z + vector.nz * CONTACT_DISTANCE + vector.sideZ * 0.12)
  };
  const targetPosition = target.currentAction === 'recoil'
    ? {
        x: round(target.position.x - vector.nx * 0.18),
        y: target.position.y,
        z: round(target.position.z - vector.nz * 0.18)
      }
    : target.position;

  let next = characters.map((char) => {
    if (char.id === attackerId) {
      const posed = attacker.currentAction === 'punch'
        ? withContactPunchPose(attacker)
        : attacker;
      return { ...posed, position: attackerPosition };
    }
    if (char.id === targetId) {
      const shouldRecoil = target.currentAction === 'recoil' || target.poseName === 'recoil';
      const posed = shouldRecoil
        ? withBalancedRecoilPose(target)
        : target;
      return { ...posed, position: targetPosition };
    }
    return char;
  });

  next = rotateActorTowardTarget(next, attackerId, targetId);
  return rotateActorTowardTarget(next, targetId, attackerId);
}

function stageDefenseContact(characters: CharacterState[], defenderId: string, attackerId: string): CharacterState[] {
  const defender = characters.find((char) => char.id === defenderId);
  const attacker = characters.find((char) => char.id === attackerId);
  if (!defender || !attacker) return characters;

  const vector = getFlatVector(defender, attacker);
  const defenderPosition = {
    x: round(attacker.position.x - vector.nx * GUARD_DISTANCE),
    y: defender.position.y,
    z: round(attacker.position.z - vector.nz * GUARD_DISTANCE)
  };

  let next = characters.map((char) => {
    if (char.id === defenderId) {
      return {
        ...withContactBlockPose(defender),
        position: defenderPosition
      };
    }
    return char;
  });

  next = rotateActorTowardTarget(next, defenderId, attackerId);
  return rotateActorTowardTarget(next, attackerId, defenderId);
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

function placeActorBehindTarget(characters: CharacterState[], actorId: string, targetId: string): CharacterState[] {
  const target = characters.find((char) => char.id === targetId);
  if (!target) return characters;
  const yaw = target.rotation.y * THREE_DEG_TO_RAD;
  const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const side = { x: Math.cos(yaw), z: -Math.sin(yaw) };

  return characters.map((char) => char.id === actorId
    ? {
        ...char,
        position: {
          x: round(target.position.x - forward.x * 0.98 - side.x * 0.58),
          y: char.position.y,
          z: round(target.position.z - forward.z * 0.98 - side.z * 0.58)
        },
        rotation: target.rotation
      }
    : char);
}

function placeObserverLane(characters: CharacterState[], observerId: string, primaryId: string, secondaryId: string): CharacterState[] {
  const primary = characters.find((char) => char.id === primaryId);
  const secondary = characters.find((char) => char.id === secondaryId);
  const observer = characters.find((char) => char.id === observerId);
  if (!primary || !secondary || !observer) return characters;

  const focusBounds = characters
    .filter((char) => char.id !== observerId)
    .reduce((acc, char) => ({
      minX: Math.min(acc.minX, char.position.x),
      maxX: Math.max(acc.maxX, char.position.x),
      minZ: Math.min(acc.minZ, char.position.z),
      maxZ: Math.max(acc.maxZ, char.position.z)
    }), {
      minX: Math.min(primary.position.x, secondary.position.x),
      maxX: Math.max(primary.position.x, secondary.position.x),
      minZ: Math.min(primary.position.z, secondary.position.z),
      maxZ: Math.max(primary.position.z, secondary.position.z)
    });
  const midpoint = {
    x: (primary.position.x + secondary.position.x) / 2,
    z: (primary.position.z + secondary.position.z) / 2
  };
  const observerPosition = {
    x: round(focusBounds.maxX + OBSERVER_DISTANCE),
    y: observer.position.y,
    z: round(Math.max(focusBounds.minZ - 0.35, midpoint.z - 0.75))
  };

  const next = characters.map((char) => char.id === observerId
    ? { ...char, position: observerPosition }
    : char);

  return rotateActorTowardTarget(next, observerId, secondaryId);
}

function surroundTarget(characters: CharacterState[], targetId: string, ringIds: string[]): CharacterState[] {
  const target = characters.find((char) => char.id === targetId);
  const validRingIds = ringIds.filter((id) => id !== targetId && characters.some((char) => char.id === id));
  if (!target || validRingIds.length === 0) return characters;

  const radius = validRingIds.length > 2 ? 1.75 : 1.45;
  const startAngle = validRingIds.length > 2 ? -35 : -55;
  let next = characters.map((char) => ({ ...char }));

  validRingIds.forEach((id, index) => {
    const angle = THREE_DEG_TO_RAD * (startAngle + index * (180 / Math.max(validRingIds.length - 1, 1)));
    next = next.map((char) => {
      if (char.id !== id) return char;
      return {
        ...char,
        position: {
          x: round(target.position.x + Math.sin(angle) * radius),
          y: char.position.y,
          z: round(target.position.z + Math.cos(angle) * radius)
        }
      };
    });
  });

  return rotateActorsToFaceTargets(next, [targetId, ...validRingIds]);
}

function placeBetweenTargets(characters: CharacterState[], actorId: string, targetId: string, secondaryTargetId: string): CharacterState[] {
  const actor = characters.find((char) => char.id === actorId);
  const firstTarget = characters.find((char) => char.id === targetId);
  const secondTarget = characters.find((char) => char.id === secondaryTargetId);
  if (!actor || !firstTarget || !secondTarget) return characters;

  const midpoint = {
    x: round((firstTarget.position.x + secondTarget.position.x) / 2),
    y: actor.position.y,
    z: round((firstTarget.position.z + secondTarget.position.z) / 2)
  };
  const spread = 1.55;
  const next = characters.map((char) => {
    if (char.id === actorId) return { ...char, position: midpoint };
    if (char.id === targetId) return { ...char, position: { x: round(midpoint.x - spread), y: char.position.y, z: round(midpoint.z + 0.15) } };
    if (char.id === secondaryTargetId) return { ...char, position: { x: round(midpoint.x + spread), y: char.position.y, z: round(midpoint.z + 0.15) } };
    return char;
  });

  return rotateActorsToFaceTargets(next, [actorId, targetId, secondaryTargetId]);
}

function createStandoff(characters: CharacterState[], focusIds: string[] = []): CharacterState[] {
  const focusCharacters = getFocusCharacters(characters, focusIds);
  if (focusCharacters.length < 2) return characters;
  const spacing = focusCharacters.length > 2 ? 1.7 : 1.6;
  const startX = -((focusCharacters.length - 1) * spacing) / 2;
  const focusIdSet = new Set(focusCharacters.map((char) => char.id));
  const next = characters.map((char) => ({ ...char }));

  focusCharacters.forEach((char, index) => {
    const targetIndex = next.findIndex((item) => item.id === char.id);
    const isPrimary = index === 0;
    const zOffset = focusCharacters.length > 2
      ? index === 0 || index === focusCharacters.length - 1 ? 0.2 : -0.35
      : index % 2 === 0 ? 0.15 : -0.15;
    next[targetIndex] = {
      ...next[targetIndex],
      position: { x: round(startX + index * spacing), y: next[targetIndex].position.y, z: zOffset },
      currentStance: isPrimary ? 'guard' : 'ready',
      currentAction: isPrimary ? 'guard' : 'ready',
      poseName: isPrimary ? 'guard' : 'ready',
      skeleton: compilePose({ basePose: isPrimary ? 'guard' : 'ready', modifiers: [isPrimary ? 'defensive' : 'aggressive'] }).skeleton,
      handGestures: getDefaultHandGestures(isPrimary ? 'guard' : 'ready', isPrimary ? 'guard' : 'ready')
    };
  });

  if (focusCharacters.length > 2) {
    return next.map((char) => {
      const focusIndex = focusCharacters.findIndex((focus) => focus.id === char.id);
      if (focusIndex === -1) return char;
      const isLeftEdge = focusIndex === 0;
      const isRightEdge = focusIndex === focusCharacters.length - 1;
      const readableY = isLeftEdge ? 95 : isRightEdge ? 265 : 180;
      return { ...char, rotation: { x: 0, y: readableY, z: 0 } };
    });
  }

  return rotateActorsToFaceTargets(next, [...focusIdSet]);
}

function createImpactMoment(characters: CharacterState[], focusIds: string[] = []): CharacterState[] {
  const focusCharacters = getFocusCharacters(characters, focusIds);
  if (focusCharacters.length < 2) return characters;
  const attacker = focusCharacters[0];
  const defender = focusCharacters[1];
  const next = characters.map((char) => ({ ...char }));
  const attackerIndex = next.findIndex((char) => char.id === attacker.id);
  const defenderIndex = next.findIndex((char) => char.id === defender.id);

  next[attackerIndex] = {
    ...next[attackerIndex],
    position: { x: -0.85, y: next[attackerIndex].position.y, z: 0 },
    currentStance: 'guard',
    currentAction: 'punch',
    poseName: 'punch',
    skeleton: compilePose({ basePose: 'punch', variant: 'cross', modifiers: ['aggressive', 'extendPunch'], intensity: 1.2 }).skeleton,
    handGestures: getDefaultHandGestures('guard', 'punch')
  };
  next[defenderIndex] = {
    ...next[defenderIndex],
    position: { x: 0.85, y: next[defenderIndex].position.y, z: 0 },
    currentStance: 'dodge',
    currentAction: 'recoil',
    poseName: 'recoil',
    skeleton: compilePose({ basePose: 'recoil', modifiers: ['leanBackward'] }).skeleton,
    handGestures: getDefaultHandGestures('dodge', 'recoil')
  };

  return rotateActorsToFaceTargets(next, [attacker.id, defender.id]);
}

export function planCameraFromIntent(intent: CanvasInstruction['camera'], characters: CharacterState[], currentCamera?: CameraState, focusIds: string[] = []): CameraState | undefined {
  if (!intent) return undefined;
  const focusCharacters = getFocusCharacters(characters, focusIds);
  const activeChar = focusCharacters[0];
  if (!activeChar) return currentCamera;
  const fallbackOpposingChar = characters.find((char) => char.id !== activeChar.id);
  const opposingChar = focusCharacters.find((char) => char.id !== activeChar.id) || fallbackOpposingChar || activeChar;

  const bounds = focusCharacters.reduce((acc, char) => ({
    minX: Math.min(acc.minX, char.position.x),
    maxX: Math.max(acc.maxX, char.position.x),
    minZ: Math.min(acc.minZ, char.position.z),
    maxZ: Math.max(acc.maxZ, char.position.z)
  }), { minX: activeChar.position.x, maxX: activeChar.position.x, minZ: activeChar.position.z, maxZ: activeChar.position.z });
  const spread = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 1.6);
  const actorScale = Math.max(focusCharacters.length - 2, 0);
  const midpoint = {
    x: round((bounds.minX + bounds.maxX) / 2),
    y: round(focusCharacters.reduce((sum, char) => sum + char.position.y, 0) / focusCharacters.length),
    z: round((bounds.minZ + bounds.maxZ) / 2)
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
    case 'twoShot':
      return {
        position: { x: round(midpoint.x + side.x * 0.75 - forward.x * 0.75), y: round(midpoint.y + 2.0), z: round(midpoint.z + 4.4 + spread * 0.35 - forward.z * 0.75) },
        target: { x: round(midpoint.x), y: round(midpoint.y + 0.95), z: midpoint.z }
      };
    case 'groupShot':
      return {
        position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 2.9 + spread * 0.2 + actorScale * 0.25), z: round(midpoint.z + 5.6 + spread * 0.9 + actorScale * 0.55) },
        target: { x: round(midpoint.x - 0.1), y: round(midpoint.y + 0.9), z: midpoint.z }
      };
    case 'establishing':
      return {
        position: { x: round(midpoint.x + side.x * 0.8), y: round(midpoint.y + 5.1 + spread * 0.25), z: round(midpoint.z + 7.8 + spread * 1.05) },
        target: { x: midpoint.x, y: round(midpoint.y + 0.65), z: midpoint.z }
      };
    case 'wide':
      return { position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 3.6 + spread * 0.22), z: round(midpoint.z + 6.4 + spread * 0.85) }, target: { x: round(midpoint.x - 0.2), y: round(midpoint.y + 0.85), z: midpoint.z } };
    case 'low':
      return { position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 0.85), z: round(midpoint.z + 5.4) }, target: { x: round(midpoint.x - 0.2), y: round(midpoint.y + 1.15), z: midpoint.z } };
    case 'dominanceLowAngle':
      return {
        position: { x: round(x - forward.x * 3.2 + side.x * 0.55), y: round(y + 0.75), z: round(z - forward.z * 3.2 + side.z * 0.55) },
        target: { x: round(opposingChar.position.x), y: round(opposingChar.position.y + 1.25), z: round(opposingChar.position.z) }
      };
    case 'high':
      return { position: { x: round(midpoint.x + side.x * 1.6), y: round(midpoint.y + 4.8), z: round(midpoint.z + side.z * 1.6 + 2.2) }, target: { x: midpoint.x, y: round(midpoint.y + 0.45), z: midpoint.z } };
    case 'vulnerabilityHighAngle':
      return {
        position: { x: round(midpoint.x + side.x * 1.5), y: round(midpoint.y + 5.6 + spread * 0.22), z: round(midpoint.z + side.z * 1.5 + 2.9 + spread * 0.4) },
        target: { x: midpoint.x, y: round(midpoint.y + 0.35), z: midpoint.z }
      };
    case 'ots':
      return { position: { x: round(x - forward.x * 3.5 + side.x * 0.9), y: round(y + 1.6), z: round(z - forward.z * 3.5 + side.z * 0.9) }, target: { x: round(opposingChar.position.x), y: round(opposingChar.position.y + 1.0), z: round(opposingChar.position.z) } };
    case 'lowOts':
      return { position: { x: round(x - forward.x * 4.4 + side.x * 1.05), y: round(y + 1.15), z: round(z - forward.z * 4.4 + side.z * 1.05) }, target: { x: round(opposingChar.position.x), y: round(opposingChar.position.y + 1.1), z: round(opposingChar.position.z) } };
    case 'standoff':
      return { position: { x: round(midpoint.x - 0.25), y: round(midpoint.y + 2.2 + spread * 0.12 + actorScale * 0.18), z: round(midpoint.z + 4.8 + spread * 0.65 + actorScale * 0.45) }, target: { x: round(midpoint.x - 0.2), y: round(midpoint.y + 0.9), z: midpoint.z } };
    case 'impact':
    case 'impactFrame':
      return { position: { x: round(midpoint.x + side.x * 0.45 - forward.x * 0.45), y: round(midpoint.y + 1.45), z: round(midpoint.z + 3.25 + spread * 0.48 - forward.z * 0.45) }, target: { x: round(midpoint.x - 0.05), y: round(midpoint.y + 1.0), z: midpoint.z } };
    case 'reactionFrame':
      return { position: { x: round(opposingChar.position.x + forward.x * 2.7 + side.x * 0.35), y: round(opposingChar.position.y + 1.55), z: round(opposingChar.position.z + forward.z * 2.7 + side.z * 0.35) }, target: { x: round(opposingChar.position.x), y: round(opposingChar.position.y + 0.95), z: round(opposingChar.position.z) } };
    default:
      return currentCamera;
  }
}

function inferCameraIntentFromComposition(instruction: CanvasInstruction): CanvasInstruction['camera'] {
  if (instruction.camera) return instruction.camera;

  switch (instruction.composition) {
    case 'protectorForeground':
    case 'attackerForeground':
      return 'impactFrame';
    case 'observerWide':
    case 'surrounded':
      return 'groupShot';
    case 'powerImbalance':
      return 'dominanceLowAngle';
    case 'neutral':
      return instruction.focusActors && instruction.focusActors.length > 2 ? 'groupShot' : 'twoShot';
    default:
      return undefined;
  }
}

function collectInstructionActorRefs(instruction: CanvasInstruction) {
  const refs = new Set<string>();
  instruction.actors.forEach((actor) => {
    if (actor.actorId || actor.actor) refs.add(actor.actorId || actor.actor || '');
    if (actor.targetId || actor.target) refs.add(actor.targetId || actor.target || '');
  });
  instruction.relationships?.forEach((relationship) => {
    if (relationship.actorId || relationship.actor) refs.add(relationship.actorId || relationship.actor || '');
    if (relationship.targetId || relationship.target) refs.add(relationship.targetId || relationship.target || '');
    if (relationship.secondaryTargetId || relationship.secondaryTarget) refs.add(relationship.secondaryTargetId || relationship.secondaryTarget || '');
  });
  instruction.focusActors?.forEach((actor) => refs.add(actor));
  instruction.secondaryActors?.forEach((actor) => refs.add(actor));
  refs.delete('');
  return [...refs];
}

function ensureInstructionActors(characters: CharacterState[], instruction: CanvasInstruction) {
  let updatedCharacters = [...characters];
  const createdNames: string[] = [];

  collectInstructionActorRefs(instruction).forEach((ref) => {
    const tokens = buildActorTokens(updatedCharacters);
    if (resolveActorRef(ref, tokens)) return;
    const normalized = slugifyActorName(ref);
    if (!normalized || normalized.length < 2) return;
    const nextActor = createSemanticActor(ref, updatedCharacters.length);
    updatedCharacters = [...updatedCharacters, nextActor];
    createdNames.push(nextActor.name);
  });

  return { updatedCharacters, createdNames };
}

function resolveInstructionFocusIds(instruction: CanvasInstruction, characters: CharacterState[], fallbackIds: string[]) {
  const tokens = buildActorTokens(characters);
  const requested = instruction.focusActors?.length ? instruction.focusActors : fallbackIds;
  const resolved = requested
    .map((actor) => resolveActorRef(actor, tokens) || actor)
    .filter((id) => characters.some((char) => char.id === id));
  return [...new Set(resolved)];
}

export function applyCanvasInstruction(
  instruction: CanvasInstruction,
  currentCharacters: CharacterState[],
  currentSelectedId: string | null,
  currentCamera?: CameraState,
  sourceLabel = 'Structured instruction'
): CanvasInstructionApplyResult {
  const ensured = ensureInstructionActors(currentCharacters, instruction);
  let updatedCharacters = ensured.updatedCharacters;
  const statusMessages: string[] = [];
  if (ensured.createdNames.length) {
    statusMessages.push(`Created semantic actors: ${ensured.createdNames.join(', ')}`);
  }
  let structuralChangeMade = false;
  let actorTokens = buildActorTokens(updatedCharacters);
  const targetIds = instruction.actors.length > 0
    ? instruction.actors.map((actor) => resolveActorRef(actor.actorId || actor.actor, actorTokens)).filter(Boolean) as string[]
    : instruction.relationships?.length
      ? updatedCharacters.map(({ id }) => id)
      : currentSelectedId
      ? [currentSelectedId]
      : updatedCharacters.map(({ id }) => id);
  const focusIds = resolveInstructionFocusIds(instruction, updatedCharacters, targetIds);
  structuralChangeMade = ensured.createdNames.length > 0;

  instruction.actors.forEach((actorInstruction) => {
    actorTokens = buildActorTokens(updatedCharacters);
    const resolvedActorId = resolveActorRef(actorInstruction.actorId || actorInstruction.actor, actorTokens);
    if (!resolvedActorId) return;
    const resolvedTargetId = resolveActorRef(actorInstruction.targetId || actorInstruction.target, actorTokens);
    const normalizedInstruction = {
      ...actorInstruction,
      actorId: resolvedActorId,
      targetId: resolvedTargetId || actorInstruction.targetId
    };
    const targetIdx = updatedCharacters.findIndex((c) => c.id === normalizedInstruction.actorId);
    if (targetIdx === -1) return;

    let activeChar = updatedCharacters[targetIdx];
    const nextStance = normalizedInstruction.stance || activeChar.currentStance || 'neutral';
    const nextAction = normalizedInstruction.action || activeChar.currentAction || 'none';

    if (normalizedInstruction.basePose) {
      const compiled = compilePose({
        basePose: normalizedInstruction.basePose,
        modifiers: normalizedInstruction.modifiers,
        intensity: normalizedInstruction.intensity,
        variant: normalizedInstruction.variant
      });
      activeChar = {
        ...activeChar,
        role: normalizedInstruction.role || activeChar.role,
        position: normalizedInstruction.position || activeChar.position,
        rotation: normalizedInstruction.rotation || activeChar.rotation,
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

    if (!normalizedInstruction.basePose && normalizedInstruction.modifiers?.length) {
      const compiled = compilePose({
        basePose: getPoseBase(activeChar.currentStance || 'neutral', activeChar.currentAction || 'none'),
        modifiers: normalizedInstruction.modifiers,
        intensity: normalizedInstruction.intensity
      });
      activeChar = {
        ...activeChar,
        role: normalizedInstruction.role || activeChar.role,
        position: normalizedInstruction.position || activeChar.position,
        rotation: normalizedInstruction.rotation || activeChar.rotation,
        skeleton: compiled.skeleton,
        handGestures: compiled.handGestures
      };
      updatedCharacters[targetIdx] = activeChar;
      statusMessages.push(`Refined ${activeChar.name} with semantic modifiers`);
      structuralChangeMade = true;
    }

    if (!normalizedInstruction.basePose && !normalizedInstruction.modifiers?.length && (normalizedInstruction.position || normalizedInstruction.rotation)) {
      activeChar = {
        ...activeChar,
        role: normalizedInstruction.role || activeChar.role,
        position: normalizedInstruction.position || activeChar.position,
        rotation: normalizedInstruction.rotation || activeChar.rotation
      };
      updatedCharacters[targetIdx] = activeChar;
      statusMessages.push(`Placed ${activeChar.name}`);
      structuralChangeMade = true;
    }
  });

  instruction.relationships?.forEach((relationship) => {
    actorTokens = buildActorTokens(updatedCharacters);
    const actorId = resolveActorRef(relationship.actorId || relationship.actor, actorTokens) || targetIds[0] || updatedCharacters[0]?.id;
    const targetId = resolveActorRef(relationship.targetId || relationship.target, actorTokens) || findFallbackTargetId(updatedCharacters, actorId, targetIds);
    const secondaryTargetId = resolveActorRef(relationship.secondaryTargetId || relationship.secondaryTarget, actorTokens);
    if (!actorId) return;

    if (relationship.type === 'faceEachOther') {
      updatedCharacters = rotateActorsToFaceTargets(updatedCharacters, focusIds.length > 1 ? focusIds : targetIds);
      statusMessages.push('Focused actors rotated toward their shared staging center');
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
      updatedCharacters = placeActorBehindTarget(updatedCharacters, actorId, targetId);
      statusMessages.push('Actor placed behind target');
      structuralChangeMade = true;
    } else if (relationship.type === 'surroundTarget' && targetId) {
      const ringIds = (focusIds.length > 1 ? focusIds : targetIds).filter((id) => id !== targetId);
      updatedCharacters = surroundTarget(updatedCharacters, targetId, ringIds);
      statusMessages.push('Actors arranged around target');
      structuralChangeMade = true;
    } else if (relationship.type === 'betweenTargets' && targetId && secondaryTargetId) {
      updatedCharacters = placeBetweenTargets(updatedCharacters, actorId, targetId, secondaryTargetId);
      statusMessages.push('Actor placed between opposing targets');
      structuralChangeMade = true;
    } else if (relationship.type === 'observerLane' && targetId && secondaryTargetId) {
      updatedCharacters = placeObserverLane(updatedCharacters, actorId, secondaryTargetId, targetId);
      statusMessages.push('Observer placed on a clear side lane');
      structuralChangeMade = true;
    } else if (relationship.type === 'attackTarget') {
      updatedCharacters = targetId ? stageAttackContact(updatedCharacters, actorId, targetId) : rotateActorsToFaceTargets(updatedCharacters, focusIds.length > 1 ? focusIds : targetIds);
      statusMessages.push('Attack relationship staged toward target');
      structuralChangeMade = true;
    } else if (relationship.type === 'defendAgainstTarget') {
      updatedCharacters = targetId ? stageDefenseContact(updatedCharacters, actorId, targetId) : rotateActorsToFaceTargets(updatedCharacters, focusIds.length > 1 ? focusIds : targetIds);
      statusMessages.push('Defense relationship staged against target');
      structuralChangeMade = true;
    } else if (relationship.type === 'standoff') {
      updatedCharacters = createStandoff(updatedCharacters, focusIds.length > 1 ? focusIds : targetIds);
      statusMessages.push('Standoff composition created');
      structuralChangeMade = true;
    } else if (relationship.type === 'impactMoment') {
      updatedCharacters = createImpactMoment(updatedCharacters, focusIds.length > 1 ? focusIds : targetIds);
      statusMessages.push('Impact moment created with action and reaction poses');
      structuralChangeMade = true;
    }
  });

  if (instruction.mood) {
    statusMessages.push(`Environment mood flipped to ${instruction.mood.toUpperCase()} lighting`);
  }

  const cameraIntent = inferCameraIntentFromComposition(instruction);
  const updatedCamera = planCameraFromIntent(cameraIntent, updatedCharacters, currentCamera, focusIds);
  if (updatedCamera) {
    statusMessages.push(`Camera staged as ${cameraIntent}`);
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
    message: `${sourceLabel} parsed, but no actionable scene changes matched.`
  };
}

export function parseDirectorNotes(
  text: string,
  currentCharacters: CharacterState[],
  currentSelectedId: string | null,
  currentCamera?: CameraState
): CanvasInstructionApplyResult {
  const note = text.toLowerCase().trim();
  const instruction = buildCanvasInstruction(text, currentCharacters, currentSelectedId);
  const result = applyCanvasInstruction(instruction, currentCharacters, currentSelectedId, currentCamera, 'Director note');

  const updatedCharacters = [...(result.updatedCharacters || currentCharacters)];
  let directionalChangeMade = false;
  const actorTokens = buildActorTokens(updatedCharacters);
  const targetIds = getTargetIds(note, currentSelectedId, actorTokens);
  const statusMessages: string[] = result.message && !result.message.includes('no actionable')
    ? [result.message.replace(/\.$/, '')]
    : [];

  targetIds.forEach((id) => {
    const targetIdx = updatedCharacters.findIndex((c) => c.id === id);
    if (targetIdx === -1) return;
    const actorClause = getActorClause(note, id, actorTokens);
    const movedChar = applyDirectionalIntent(updatedCharacters[targetIdx], actorClause);
    if (movedChar) {
      updatedCharacters[targetIdx] = movedChar;
      statusMessages.push(`Moved ${movedChar.name}`);
      directionalChangeMade = true;
    }
  });

  if (directionalChangeMade) {
    return {
      ...result,
      updatedCharacters,
      message: `${statusMessages.join(' | ')}.`
    };
  }

  if (!result.updatedCharacters && !result.updatedMood && !result.updatedCamera) {
    return {
      message: `Note parsed, but no actionable scene changes matched: "${text}"`
    };
  }

  return result;
}
