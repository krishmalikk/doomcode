import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap points (from bottom of screen)
const CLOSED_HEIGHT = 0;
const MID_HEIGHT = SCREEN_HEIGHT * 0.55; // ~55% of screen
const FULL_HEIGHT = SCREEN_HEIGHT * 0.92; // ~92% of screen (leaving status bar visible)

// Threshold for snapping (how far to drag before snapping to next position)
const SNAP_THRESHOLD = 50;

interface SlideUpPanelProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function SlideUpPanel({ visible, onClose, children }: SlideUpPanelProps) {
  const panelHeight = useRef(new Animated.Value(CLOSED_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const currentHeight = useRef(CLOSED_HEIGHT);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Animate to a specific height
  const animateToHeight = (toHeight: number, velocity?: number) => {
    currentHeight.current = toHeight;
    setIsFullScreen(toHeight === FULL_HEIGHT);

    const springConfig = {
      toValue: toHeight,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
      velocity: velocity || 0,
    };

    Animated.spring(panelHeight, springConfig).start();
  };

  // Create pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Stop any running animations
        panelHeight.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new height based on drag
        const dragAmount = -gestureState.dy; // Negative because dragging up should increase height
        const newHeight = Math.max(
          CLOSED_HEIGHT,
          Math.min(FULL_HEIGHT, currentHeight.current + dragAmount)
        );
        panelHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dragAmount = -gestureState.dy;
        const velocity = -gestureState.vy;
        const projectedHeight = currentHeight.current + dragAmount;

        // Determine which snap point to go to based on position and velocity
        let targetHeight: number;

        if (velocity > 0.5) {
          // Fast swipe up - go to full screen
          targetHeight = FULL_HEIGHT;
        } else if (velocity < -0.5) {
          // Fast swipe down
          if (currentHeight.current === FULL_HEIGHT) {
            targetHeight = MID_HEIGHT;
          } else {
            targetHeight = CLOSED_HEIGHT;
            onClose();
          }
        } else {
          // Slow drag - snap to nearest point based on position
          if (projectedHeight > (FULL_HEIGHT + MID_HEIGHT) / 2) {
            targetHeight = FULL_HEIGHT;
          } else if (projectedHeight > MID_HEIGHT / 2) {
            targetHeight = MID_HEIGHT;
          } else {
            targetHeight = CLOSED_HEIGHT;
            onClose();
          }
        }

        animateToHeight(targetHeight, velocity);
      },
    })
  ).current;

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Open to mid height
      Animated.parallel([
        Animated.spring(panelHeight, {
          toValue: MID_HEIGHT,
          useNativeDriver: false,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      currentHeight.current = MID_HEIGHT;
      setIsFullScreen(false);
    } else {
      // Close panel
      Animated.parallel([
        Animated.timing(panelHeight, {
          toValue: CLOSED_HEIGHT,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      currentHeight.current = CLOSED_HEIGHT;
      setIsFullScreen(false);
    }
  }, [visible, panelHeight, opacity]);

  // Handle double tap on handle to toggle full screen
  const lastTap = useRef<number>(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap - toggle between full and mid
      if (currentHeight.current === FULL_HEIGHT) {
        animateToHeight(MID_HEIGHT);
      } else {
        animateToHeight(FULL_HEIGHT);
      }
    }
    lastTap.current = now;
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.panel,
          {
            height: panelHeight,
          },
        ]}
      >
        {/* Drag Handle */}
        <View
          style={styles.dragHandle}
          {...panResponder.panHandlers}
        >
          <TouchableWithoutFeedback onPress={handleTap}>
            <View style={styles.dragIndicatorContainer}>
              <View style={styles.dragIndicator} />
            </View>
          </TouchableWithoutFeedback>
        </View>

        {/* Content */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragIndicatorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 40,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#555555',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
});
