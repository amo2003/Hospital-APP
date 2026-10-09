import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from '@/theme/primitives';
import Svg, { Path } from 'react-native-svg';
import { BottomLeaves } from '@/features/patient/shared/BottomLeaves';

interface QueueBottomWavesProps {
  showLeaves?: boolean;
}

export function QueueBottomWaves({ showLeaves = false }: QueueBottomWavesProps) {
  return (
    <View style={[styles.container, { pointerEvents: "none" }]}>
      {/* Decorative SVG Waves */}
      <Svg
        width="100%"
        height={85}
        viewBox="0 0 390 85"
        preserveAspectRatio="none"
        style={styles.svg}
      >
        <Path
          d="M0,85 L390,85 L390,30 C290,75 190,10 0,55 Z"
          fill="#005599"
          opacity={0.35}
        />
        <Path
          d="M0,85 L390,85 L390,45 C280,82 170,18 0,65 Z"
          fill="#023b70"
          opacity={0.7}
        />
        <Path
          d="M0,85 L390,85 L390,58 C260,88 150,32 0,72 Z"
          fill="#032d56"
        />
      </Svg>

      {/* Decorative leaf graphic matching designs 02, 04, 07 */}
      {showLeaves && (
        <BottomLeaves
          style={{
            position: 'absolute',
            width: 90,
            height: 140,
            right: 0,
            bottom: 25,
            opacity: 0.6,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 56, // sitting right above bottom tabs
    left: 0,
    right: 0,
    height: 85,
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
