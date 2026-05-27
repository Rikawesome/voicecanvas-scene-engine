# Canvas Instruction Schema

This is the structured object that the future VoiceCanvas Python/story agent should send to the scene engine.

## Shape

```ts
type CanvasInstruction = {
  actors: ActorCanvasInstruction[];
  relationships?: RelationshipCanvasInstruction[];
  focusActors?: string[];
  secondaryActors?: string[];
  camera?: 'closeup' | 'wide' | 'low' | 'high' | 'ots' | 'lowOts' | 'standoff' | 'impact' | 'twoShot' | 'groupShot' | 'impactFrame' | 'reactionFrame' | 'establishing' | 'dominanceLowAngle' | 'vulnerabilityHighAngle';
  composition?: 'neutral' | 'protectorForeground' | 'attackerForeground' | 'observerWide' | 'surrounded' | 'powerImbalance';
  mood?: 'neutral' | 'dramatic' | 'suspense' | 'warm' | 'night';
};
```

```ts
type ActorCanvasInstruction = {
  actor?: string;
  actorId?: string;
  role?: 'lead' | 'rival' | 'attacker' | 'defender' | 'victim' | 'observer' | 'support' | 'background';
  basePose?: 'neutral' | 'ready' | 'guard' | 'walk' | 'run' | 'kneel' | 'dodge' | 'punch' | 'block' | 'point' | 'push' | 'recoil';
  target?: string;
  targetId?: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  modifiers?: Array<'leanForward' | 'leanBackward' | 'twistTorso' | 'extendPunch' | 'defensive' | 'aggressive' | 'lookAtTarget'>;
  intensity?: number;
  variant?: 'left' | 'right';
};
```

```ts
type RelationshipCanvasInstruction = {
  type: 'faceEachOther' | 'moveCloser' | 'moveApart' | 'attackTarget' | 'defendAgainstTarget' | 'retreatFromTarget' | 'behindTarget' | 'surroundTarget' | 'betweenTargets' | 'observerLane' | 'standoff' | 'impactMoment';
  actor?: string;
  actorId?: string;
  target?: string;
  targetId?: string;
  secondaryTarget?: string;
  secondaryTargetId?: string;
};
```

## Example

```json
{
  "actors": [
    {
      "actor": "Riku",
      "basePose": "guard",
      "target": "Kiki",
      "modifiers": ["defensive", "leanBackward"]
    },
    {
      "actor": "Kiki",
      "basePose": "point",
      "target": "Riku",
      "modifiers": ["aggressive", "lookAtTarget"]
    }
  ],
  "relationships": [{ "type": "faceEachOther" }],
  "focusActors": ["Riku", "Kiki"],
  "camera": "twoShot",
  "composition": "attackerForeground",
  "mood": "suspense"
}
```

## Multi-Actor Example

If an instruction references an actor that is not already in the scene, the canvas creates a procedural semantic actor with a stable generated id.

```json
{
  "actors": [
    {
      "actor": "Riku",
      "role": "defender",
      "basePose": "guard",
      "target": "Kanata",
      "modifiers": ["defensive"]
    },
    {
      "actor": "Kiki",
      "role": "support",
      "basePose": "ready",
      "target": "Kanata",
      "modifiers": ["lookAtTarget"]
    },
    {
      "actor": "Kanata",
      "role": "attacker",
      "basePose": "point",
      "target": "Riku",
      "modifiers": ["aggressive", "lookAtTarget"]
    }
  ],
  "relationships": [{ "type": "standoff" }],
  "focusActors": ["Riku", "Kiki", "Kanata"],
  "camera": "groupShot",
  "composition": "observerWide",
  "mood": "suspense"
}
```

## Notes

- Friendly actor names (`Riku`, `Kiki`, `Kanata`) are accepted for quick authoring.
- Stable actor ids (`char-riku`, `char-kiki`, `char-kanata`) are safer for generated instructions.
- `focusActors` tells the camera and relationship presets which actors matter most in the panel.
- `camera` describes the lens/framing job; `composition` describes why that framing is being chosen.
- If `camera` is omitted, the runtime can infer a deterministic camera from `composition`.
- `surroundTarget` arranges all focus actors except the target around that target.
- `betweenTargets` places one actor between two named targets.
- `observerLane` places a third actor outside the main action line so they remain readable.
- The canvas runtime remains deterministic: AI should produce this object, not directly manipulate bones.
