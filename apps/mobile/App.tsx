// Fallback entrypoint for Expo when it boots via `expo/AppEntry.js`.
// Expo expects `App` to be a React component. `expo-router/entry` is a side-effect
// entry that registers the root component, and does not export a component.
//
// `expo-router/build/qualified-entry` exports the actual React component we need.
import { App } from 'expo-router/build/qualified-entry';

export default App;

