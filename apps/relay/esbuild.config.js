import * as esbuild from 'esbuild';
import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const handlersDir = './dist/handlers';
const handlers = readdirSync(handlersDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => join(handlersDir, f));

// Bundle each handler
for (const handler of handlers) {
  await esbuild.build({
    entryPoints: [handler],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: handler,
    allowOverwrite: true,
    external: [
      '@aws-sdk/client-apigatewaymanagementapi',
      '@aws-sdk/client-dynamodb',
      '@aws-sdk/lib-dynamodb',
    ],
  });
}

// Also bundle db.js and websocket.js
const utilFiles = ['./dist/db.js', './dist/websocket.js'];
for (const file of utilFiles) {
  await esbuild.build({
    entryPoints: [file],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: file,
    allowOverwrite: true,
    external: [
      '@aws-sdk/client-apigatewaymanagementapi',
      '@aws-sdk/client-dynamodb',
      '@aws-sdk/lib-dynamodb',
    ],
  });
}

console.log('Build complete!');
