// Expo's default entry (`expo/AppEntry.js`) resolves `../../App` relative to the
// installed `expo` package location. In this monorepo, dependencies are hoisted
// to the workspace root, so Expo ends up looking for `doomcode/App`.
//
// Provide a tiny shim that forwards to the actual mobile app entry.
export { default } from './apps/mobile/App';

