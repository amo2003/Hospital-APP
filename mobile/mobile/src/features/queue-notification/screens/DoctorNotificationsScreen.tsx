import { LanguagePicker } from "../../patient/auth/LanguagePicker";
import { Text } from "../../patient/i18n/LanguageProvider";
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { QueueHeader } from '../components/QueueHeader';
import { QueueBottomWaves } from '../components/QueueBottomWaves';
import { ScreenSwitcher } from '../components/ScreenSwitcher';
import { BottomTabs } from '@/features/patient/shared/ui';
import type { DoctorAlertItem } from '../types';

const DOCTOR_ALERTS: DoctorAlertItem[] = [
  {
    id: 'da1',
    type: 'checkin',
    title: 'Patient Check-in',
    time: '9:20 AM',
    description: 'Patient A-020 has checked in. Appointment 10:15 AM',
    iconType: 'dot',
  },
  {
    id: 'da2',
    type: 'queue',
    title: 'Queue Alert',
    time: '8:45 AM',
    description: 'Queue is growing quickly. 12 patients waiting.',
    iconType: 'queue',
  },
  {
    id: 'da3',
    type: 'schedule',
    title: 'Schedule Change',
    time: 'Yesterday',
    description: 'Morning clinic starts 15 min late. Schedule updated.',
    iconType: 'schedule',
  },
];

export function DoctorNotificationsScreen() {
  const renderIcon = (type: DoctorAlertItem['iconType']) => {
    switch (type) {
      case 'dot':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={5} fill="#0066cc" />
          </Svg>
        );
      case 'queue':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            {/* Chess pawn / queue icon */}
            <Circle cx={12} cy={6} r={3} />
            <Path d="M9 10h6l-1 8h-4z" />
            <Path d="M7 21h10" />
          </Svg>
        );
      case 'schedule':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            <Rect x={3} y={4} width={18} height={18} rx={2} />
            <Path d="M16 2v4M8 2v4M3 10h18" />
            <Circle cx={12} cy={15} r={2} />
          </Svg>
        );
    }
  };

  return (
    <View style={styles.container}>
      <ScreenSwitcher currentScreenNumber={5} />
      <QueueHeader
        title="Doctor Alerts"
        subtitle="Live alerts and important updates"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {DOCTOR_ALERTS.map((item) => (
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
            <Text style={styles.filledButtonText}>Appointment Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/patient/queue' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Patient List</Text>
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
    paddingTop: 20,
    paddingBottom: 110,
  },
  listContainer: {
    gap: 14,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e1ecf6',
    shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ebf4fc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    marginBottom: 5,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0e2b4d',
  },
  cardTime: {
    fontSize: 12,
    color: '#839cb8',
  },
  cardBody: {
    fontSize: 13,
    color: '#526e8d',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  filledButton: {
    flex: 1.3,
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
    fontSize: 13,
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
