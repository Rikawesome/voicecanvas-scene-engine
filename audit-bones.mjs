import fs from 'fs';
import path from 'path';

const glbPath = path.join(process.cwd(), 'public', 'voicecanvas_actor_v2.glb');

if (!fs.existsSync(glbPath)) {
  console.error(`\x1b[31m❌ Error: Cannot find file at ${glbPath}\x1b[0m`);
  console.error(`Please ensure your model is saved exactly inside your public folder.`);
  process.exit(1);
}

console.log('\x1b[36m🤖 Reading voicecanvas_actor_v2.glb binary tree...\x1b[0m');

const buffer = fs.readFileSync(glbPath);

// Read GLTF JSON chunk out of the GLB binary file
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);

if (magic !== 0x46546C67) {
  console.error('\x1b[31m❌ Error: File is not a valid GLB asset.\x1b[0m');
  process.exit(1);
}

const jsonChunkLength = buffer.readUInt32LE(12);
const jsonChunkType = buffer.readUInt32LE(16);

if (jsonChunkType !== 0x4E4F534A) {
  console.error('\x1b[31m❌ Error: First GLB chunk is not JSON text.\x1b[0m');
  process.exit(1);
}

const jsonBuffer = buffer.subarray(20, 20 + jsonChunkLength);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

// Crawl nodes looking for bones
const nodes = gltf.nodes || [];
const boneNames = [];

nodes.forEach((node) => {
  // Check if node is explicitly a bone or hooked into a skin armature structure
  if (node.name && (node.skin !== undefined || nodes.some(n => n.children && n.children.includes(nodes.indexOf(node))))) {
    // Collect potential bone transforms, filtering out known camera/light markers
    if (!['camera', 'light', 'mesh', 'cube', 'cylinder'].some(word => node.name.toLowerCase().includes(word))) {
      boneNames.push(node.name);
    }
  }
});

console.log('\n\x1b[32m🦴 ===== TERMINAL RIG AUDIT RESULTS ===== 🦴\x1b[0m');
if (boneNames.length === 0) {
  // Fallback to dump all node strings if the skin heuristic passes empty
  console.log('\x1b[33mNo explicit structural bones filtered. Dumping raw asset nodes:\x1b[0m');
  nodes.forEach(n => { if(n.name) console.log(`  ➔ "${n.name}"`); });
} else {
  console.log(`Found ${boneNames.length} armature bone identifiers:\n`);
  boneNames.forEach((name) => {
    console.log(`  ➔  \x1b[35m"${name}"\x1b[0m`);
  });
}
console.log('\x1b[32m=========================================\x1b[0m\n');