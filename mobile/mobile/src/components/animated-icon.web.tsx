import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';

import classes from './animated-icon.module.css';
const DURATION = 300;

export function AnimatedSplashOverlay() {
  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View style={styles.background} entering={keyframe.duration(DURATION)}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <LogoMark />
      </Animated.View>
    </View>
  );
}

function LogoMark() {
  return (
    <View style={styles.logoMark}>
      <View style={styles.logoVertical} />
      <View style={styles.logoHorizontal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  logoMark: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoVertical: {
    position: 'absolute',
    width: 18,
    height: 58,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  logoHorizontal: {
    position: 'absolute',
    width: 58,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
});
