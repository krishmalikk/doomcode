import { useCallback, useRef } from 'react';
import { Gesture, GestureStateChangeEvent, PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSessionStore } from '../store/session';
import { useAgentStore } from '../store/agentStore';
import { usePatchHistoryStore } from '../store/patchHistoryStore';

interface UseGestureHandlersOptions {
  onUndoTriggered?: () => void;
  onRegenerateTriggered?: () => void;
  swipeThreshold?: number;
  longPressDuration?: number;
}

export function useGestureHandlers(options: UseGestureHandlersOptions = {}) {
  const {
    onUndoTriggered,
    onRegenerateTriggered,
    swipeThreshold = 100,
    longPressDuration = 500,
  } = options;

  const { sendUndoRequest, sendAgentControl, connected } = useSessionStore();
  const { lastPrompt, getActiveStatus } = useAgentStore();
  const { canUndo, getLastPatch } = usePatchHistoryStore();

  // Prevent multiple rapid triggers
  const lastUndoTime = useRef(0);
  const lastRegenerateTime = useRef(0);
  const DEBOUNCE_MS = 1000;

  const handleUndo = useCallback(() => {
    const now = Date.now();
    if (now - lastUndoTime.current < DEBOUNCE_MS) return;
    if (!connected || !canUndo()) return;

    const lastPatch = getLastPatch();
    if (lastPatch) {
      lastUndoTime.current = now;
      sendUndoRequest(lastPatch.patchId);
      onUndoTriggered?.();
    }
  }, [connected, canUndo, getLastPatch, sendUndoRequest, onUndoTriggered]);

  const handleRegenerate = useCallback(() => {
    const now = Date.now();
    if (now - lastRegenerateTime.current < DEBOUNCE_MS) return;
    if (!connected) return;

    const status = getActiveStatus();
    if (status !== 'idle' || !lastPrompt) return;

    lastRegenerateTime.current = now;
    sendAgentControl('retry');
    onRegenerateTriggered?.();
  }, [connected, getActiveStatus, lastPrompt, sendAgentControl, onRegenerateTriggered]);

  // Swipe left gesture for undo
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(-20)
    .failOffsetX(20)
    .failOffsetY([-20, 20])
    .onEnd((event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      'worklet';
      if (event.translationX < -swipeThreshold) {
        runOnJS(handleUndo)();
      }
    });

  // Long press gesture for regenerate
  const longPressGesture = Gesture.LongPress()
    .minDuration(longPressDuration)
    .onEnd((_event, success) => {
      'worklet';
      if (success) {
        runOnJS(handleRegenerate)();
      }
    });

  // Combined gesture (simultaneous for flexibility)
  const combinedGesture = Gesture.Simultaneous(swipeGesture, longPressGesture);

  return {
    swipeGesture,
    longPressGesture,
    combinedGesture,
    handleUndo,
    handleRegenerate,
    canUndo: connected && canUndo(),
    canRegenerate: connected && getActiveStatus() === 'idle' && lastPrompt !== null,
  };
}
