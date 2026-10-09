import { LanguagePicker } from "../../patient/auth/LanguagePicker";
import { Text } from "../../patient/i18n/LanguageProvider";
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { ScrollView, TouchableOpacity, View } from '@/theme/primitives';
import { router } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { QueueHeader } from '../components/QueueHeader';
import { QueueBottomWaves } from '../components/QueueBottomWaves';
import { ScreenSwitcher } from '../components/ScreenSwitcher';
import { BottomTabs } from '@/features/patient/shared/ui';
import type { AdminAlertItem } from '../types';

const ADMIN_ALERTS: AdminAlertItem[] = [
  {
    id: 'aa1',
    type: 'approval',
    title: 'Pending Approval',
    time: '4 min ago',
    description: '2 schedule requests need review. Administration',
    iconType: 'warning',
  },
  {
    id: 'aa2',
    type: 'queue',
    title: 'High Queue Load',
    time: '9 min ago',
    description: 'Medical OPD is above threshold. 15 patients waiting.',
    iconType: 'queue',
  },
  {
    id: 'aa3',
    type: 'report',
    title: 'Report Ready',
    time: '1 hour ago',
    description: 'Weekly OPD summary is ready. 19 Sep 2026',
    iconType: 'report',
  },
  {
    id: 'aa4',
    type: 'system',
    title: 'System Announcement',
    time: 'Today',
    description: 'Queue display maintenance tonight. 22:00 – 23:00',
    iconType: 'info',
  },
];

export function AdminNotificationsScreen() {
  const renderIcon = (type: AdminAlertItem['iconType']) => {
    switch (type) {
      case 'warning':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2.5}>
            <Path d="M12 8v5M12 17h.01" strokeLinecap="round" />
          </Svg>
        );
      case 'queue':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            <Circle cx={12} cy={6} r={3} />
            <Path d="M9 10h6l-1 8h-4z" />
            <Path d="M7 21h10" />
          </Svg>
        );
      case 'report':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            <Rect x={4} y={3} width={16} height={18} rx={2} />
            <Path d="M8 8h8M8 12h8M8 16h5" />
          </Svg>
        );
      case 'info':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2.5}>
            <Path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
          </Svg>
        );
    }
  };

  return (
    <View style={styles.container}>
      <ScreenSwitcher currentScreenNumber={6} />
      <QueueHeader
        title="Admin Alerts"
        subtitle="System alerts and administrative updates"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {ADMIN_ALERTS.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.iconCircle}>
                {renderIcon(item.iconType)}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardTime}>{item.time}</Text>
                </View>
                <Text style={styles.cardBody}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.filledButton}
            onPress={() => router.push('/patient/appointment-history' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.filledButtonText}>View Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/patient/home' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decorative Wave & Bottom Tabs */}
      <QueueBottomWaves />
      <LanguagePicker />
      <BottomTabs active="notifications" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 110,
  },
  listContainer: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e1ecf6',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(3, 78, 162, 0.03)' },
      default: { shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5, },
    }),
    elevation: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ebf4fc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0e2b4d',
  },
  cardTime: {
    fontSize: 11,
    color: '#839cb8',
  },
  cardBody: {
    fontSize: 12,
    color: '#526e8d',
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filledButton: {
    flex: 1,
    backgroundColor: '#0e2b4d',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledButtonText: {
    textAlign: 'center',
    paddingHorizontal: 6,
    flexShrink: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  outlineButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0e2b4d',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    textAlign: 'center',
    paddingHorizontal: 6,
    flexShrink: 1,
    color: '#0e2b4d',
    fontSize: 14,
    fontWeight: '700',
  },
});
