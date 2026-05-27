# VoiceCanvas Scene Engine

VoiceCanvas is a cinematic semantic staging engine for manga/anime scene direction. It helps creators stage actor poses, camera framing, mood, and scene composition before AI image generation, so the image model receives clearer visual intent instead of guessing everything from text.

The project is currently a runtime staging prototype. It is not a game engine, final animation suite, or image-generation wrapper.

## Vision

Modern AI image generation can create strong visuals, but it often struggles with structure:

- character pose and body language
- fight choreography and interaction spacing
- camera angle and cinematic framing
- continuity across panels
- readable scene composition

VoiceCanvas aims to solve that by letting creators direct the scene first. The 3D viewport acts as a semantic blueprint layer: actors, poses, camera, mood, and relationships are staged before any final image generation happens.

## Current Features

- Procedural low-poly semantic actors
- Actor positioning and orientation controls
- Clickable body-part selection
- Contextual body-part adjustment widgets
- Advanced skeletal fine-tuning controls
- Semantic pose presets for actions like guard, punch, block, point, recoil, walk, run, kneel, and dodge
- Symbolic hand gestures such as fist, open palm, pointing hand, and blocking palm
- Natural-language director commands for multi-actor staging
- Relationship staging commands such as face each other, standoff, impact moment, advance, retreat, attack, and defend
- Camera presets for wide, standoff, impact, over-shoulder, low-angle, close-up, and high-angle framing
- Mood presets for cinematic lighting direction
- Scene export/import as JSON
- Structured canvas instruction input for future agent handoff
- Mobile canvas-first bottom-sheet controls

## Example Commands

Try these in the director notes input:

```txt
make riku and kiki face each other and punch
riku walk and kiki run
Riku defensive guard while Kiki advances
Kiki punches Riku
Riku blocks the punch
Kiki points at Riku
Riku recoils backward
create standoff
create impact moment
low angle over Riku shoulder
```

## Tech Stack

- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- Drei

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Direction

VoiceCanvas is being developed toward a future workflow where a storytelling or storyboard agent can pass structured panel intent into the canvas. The canvas then creates the first staging guess, which the creator can correct with natural language or manual controls.

Planned next areas:

- stronger pose library and pose previews
- better floor planting and lightweight IK cleanup
- improved scene relationship orchestration
- structured storyboard-to-canvas instruction handoff
- richer camera composition logic
- eventual image-generation guidance export

See [Canvas Instruction Schema](docs/CANVAS_INSTRUCTION_SCHEMA.md) for the current structured object that future Python/story agents should send into the scene engine.

## Important Notes

- The current actors are procedural semantic guides, not final production characters.
- Existing GLB/FBX assets are kept for future validation but are not the primary runtime pose system.
- Image generation is intentionally out of scope for the current milestone.
- The goal is controllable cinematic staging, not one-click final art.

## License

License has not been selected yet.
