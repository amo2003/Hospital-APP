import { SymbolView } from 'expo-symbols';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },

    ios: {
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },

    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },

    default: {},
  });

  return (
    <ScrollView
      style={[
        styles.scrollView,
        {
          backgroundColor: theme.background,
        },
      ]}
      contentInset={insets}
      contentContainerStyle={[
        styles.contentContainer,
        contentPlatformStyle,
      ]}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">
            Hospital OPD
          </ThemedText>

          <ThemedText
            style={styles.centerText}
            themeColor="textSecondary"
          >
            Appointment & Queue{'\n'}Management System
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable
              style={({ pressed }) =>
                pressed ? styles.pressed : undefined
              }
            >
              <ThemedView
                type="backgroundElement"
                style={styles.linkButton}
              >
                <ThemedText type="link">
                  Expo documentation
                </ThemedText>

                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: 'arrow.up.right.square',
                    android: 'link',
                    web: 'link',
                  }}
                  size={12}
                />
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        {/* Sections */}
        <ThemedView style={styles.sectionsWrapper}>
          {/* Section 1 */}
          <Collapsible title="Project structure">
            <ThemedText type="small">
              The main application screens are stored inside{' '}
              <ThemedText type="code">
                src/app
              </ThemedText>
              .
            </ThemedText>

            <ThemedText type="small">
              The{' '}
              <ThemedText type="code">
                src/app/_layout.tsx
              </ThemedText>{' '}
              file controls the main navigation structure.
            </ThemedText>
          </Collapsible>

          {/* Section 2 */}
          <Collapsible title="Android, iOS, and web support">
            <ThemedView
              type="backgroundElement"
              style={styles.collapsibleContent}
            >
              <ThemedText type="small">
                This Hospital OPD application can be developed
                and tested on Android, iOS, and web.
              </ThemedText>

              <ThemedText type="small">
                To open the web version, press{' '}
                <ThemedText type="smallBold">
                  w
                </ThemedText>{' '}
                in the Expo terminal.
              </ThemedText>

              {/* Placeholder instead of missing tutorial-web.png */}
              <View style={styles.placeholder}>
                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: 'desktopcomputer',
                    android: 'computer',
                    web: 'computer',
                  }}
                  size={40}
                />

                <ThemedText
                  type="small"
                  style={styles.placeholderText}
                >
                  Web Preview
                </ThemedText>
              </View>
            </ThemedView>
          </Collapsible>

          {/* Section 3 */}
          <Collapsible title="Hospital application">
            <ThemedText type="small">
              This project will implement the Hospital OPD
              Appointment and Queue Management System.
            </ThemedText>

            <ThemedText type="small">
              The mobile frontend is being developed using
              React Native with Expo.
            </ThemedText>
          </Collapsible>

          {/* Section 4 */}
          <Collapsible title="Main features">
            <ThemedText type="small">
              The application will include patient
              registration, authentication, appointment
              management, queue management, and hospital
              management functionality.
            </ThemedText>
          </Collapsible>

          {/* Section 5 */}
          <Collapsible title="Development">
            <ThemedText type="small">
              React Native and Expo are used for the mobile
              frontend.
            </ThemedText>

            <ThemedText type="small">
              Node.js and Express can be used for the backend
              REST API, while MongoDB can be used for data
              storage.
            </ThemedText>
          </Collapsible>
        </ThemedView>

        {/* Web badge */}
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    width: '100%',
  },

  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },

  centerText: {
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.7,
  },

  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },

  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },

  collapsibleContent: {
    alignItems: 'center',
    gap: Spacing.two,
  },

  placeholder: {
    width: '100%',
    minHeight: 150,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D6E5F2',
  },

  placeholderText: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});