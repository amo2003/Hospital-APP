import { Text } from "../../patient/i18n/LanguageProvider";
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

interface QueueHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
}

export function QueueHeader({ title, subtitle, onBack }: QueueHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/patient/home');
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.contentContainer}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {/* Title & Subtitle */}
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </View>

      {/* Organic Curved Wave */}
      <View style={[styles.waveWrapper, { pointerEvents: "none" }]}>
        <Svg
          width="100%"
          height={38}
          viewBox="0 0 390 38"
          preserveAspectRatio="none"
        >
          <Path
            d="M0,0 L390,0 L390,16 C300,38 210,4 120,24 C60,37 20,22 0,16 Z"
            fill="#055598"
            opacity={0.4}
          />
          <Path
            d="M0,0 L390,0 L390,8 C290,32 195,0 95,20 C45,30 15,16 0,8 Z"
            fill="#033d71"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#034ea2',
    position: 'relative',
    // Reserve space for the translated preview switcher above the back button.
    paddingTop: 52,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  backText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitleText: {
    color: '#d4ebfc',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  waveWrapper: {
    width: '100%',
    height: 38,
    overflow: 'hidden',
    marginTop: -2,
  },
});
