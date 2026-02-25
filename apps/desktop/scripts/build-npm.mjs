#!/usr/bin/env node
/**
 * Build script for npm publishing.
 * Bundles all workspace dependencies into a single distributable file.
 */
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const outdir = 'dist-npm';

// Clean output directory
if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir);

console.log('Building doomcode for npm...\n');

// First, build workspace dependencies
console.log('Building workspace packages...');
execSync('pnpm run build', {
  cwd: path.resolve('../../packages/crypto'),
  stdio: 'inherit',
});
execSync('pnpm run build', {
  cwd: path.resolve('../../packages/protocol'),
  stdio: 'inherit',
});
execSync('pnpm run build', {
  cwd: path.resolve('../../packages/diff-parser'),
  stdio: 'inherit',
});

// Bundle the CLI
console.log('\nBundling CLI...');
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs', // Use CommonJS for better compatibility with commander
  outfile: `${outdir}/index.js`,
  external: [
    // Keep native modules external - they can't be bundled
    'node-pty',
  ],
  // Resolve workspace packages
  alias: {
    '@doomcode/crypto': '../../packages/crypto/dist/index.js',
    '@doomcode/protocol': '../../packages/protocol/dist/index.js',
    '@doomcode/diff-parser': '../../packages/diff-parser/dist/index.js',
  },
  minify: false, // Keep readable for debugging
  sourcemap: false,
});

// Copy package.json for npm (with modifications)
const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

const npmPkgJson = {
  name: 'doomcode',
  version: pkgJson.version,
  description: 'Control AI coding agents from your mobile device',
  bin: {
    doomcode: './index.js',
  },
  files: ['index.js'],
  keywords: [
    'ai',
    'coding',
    'agent',
    'claude',
    'codex',
    'gemini',
    'mobile',
    'terminal',
    'cli',
  ],
  author: 'Krish Malik',
  license: 'MIT',
  repository: {
    type: 'git',
    url: 'https://github.com/krishmalikk/doomcode.git',
  },
  homepage: 'https://github.com/krishmalikk/doomcode',
  bugs: {
    url: 'https://github.com/krishmalikk/doomcode/issues',
  },
  engines: {
    node: '>=20.0.0',
  },
  dependencies: {
    // node-pty must be installed by the end user (native module)
    'node-pty': '^1.0.0',
  },
};

fs.writeFileSync(
  `${outdir}/package.json`,
  JSON.stringify(npmPkgJson, null, 2)
);

// Create README for npm
const readme = `# DoomCode

Control AI coding agents (Claude, Codex, Gemini) from your mobile device.

## Installation

\`\`\`bash
npm install -g doomcode
\`\`\`

## Usage

1. Start a session in your project directory:

\`\`\`bash
cd your-project
doomcode start
\`\`\`

2. Scan the QR code with the DoomCode mobile app

3. Control your AI coding agent from your phone!

## Commands

- \`doomcode start\` - Start a new session
- \`doomcode start --agent codex\` - Use a specific agent (claude, codex, gemini)
- \`doomcode start --reuse\` - Reuse existing session
- \`doomcode connect <session-id>\` - Connect to existing session

## Requirements

- Node.js 20+
- Claude Code, OpenAI Codex CLI, or Google Gemini CLI installed
- DoomCode mobile app (iOS/Android)

## Links

- [GitHub](https://github.com/krishmalikk/doomcode)
- [Issues](https://github.com/krishmalikk/doomcode/issues)
`;

fs.writeFileSync(`${outdir}/README.md`, readme);

console.log('\n✅ Build complete!');
console.log(`\nOutput: ${outdir}/`);
console.log('\nTo publish:');
console.log(`  cd ${outdir}`);
console.log('  npm publish');
