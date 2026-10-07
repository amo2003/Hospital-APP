import { Text } from "../../patient/i18n/LanguageProvider";
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { QueueHeader } from '../components/QueueHeader';
import { QueueBottomWaves } from '../components/QueueBottomWaves';
import { ScreenSwitcher } from '../components/ScreenSwitcher';
import { BottomTabs } from '@/features/patient/shared/ui';

export function AppointmentReminderScreen() {
  const checklist = [
    'Bring your National Identity Card.',
    'Arrive 15 minutes before your appointment.',
    'Bring previous medical documents if needed.',
    'Check the live queue before leaving.',
  ];

  return (
    <View style={styles.container}>
      <ScreenSwitcher currentScreenNumber={7} />
      <QueueHeader
        title="Reminder"
        subtitle="Patient • Upcoming OPD Appointment"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Appointment Main Info */}
        <View style={styles.card}>
          <View style={styles.darkBadge}>
            <Text style={styles.darkBadgeText}>TOMORROW</Text>
          </View>

          <Text style={styles.cardDeptTitle}>General OPD</Text>
          <Text style={styles.doctorName}>Dr. Priya Sharma</Text>
          <Text style={styles.dateTimeText}><Text>20 September 2026</Text> • <Text>10:00 AM</Text></Text>
          <Text style={styles.tokenRoomText}>Token A-019 • Room 03</Text>
        </View>

        {/* Card 2: Before You Visit */}
        <View style={styles.card}>
          <View style={styles.darkBadge}>
            <Text style={styles.darkBadgeText}>BEFORE YOU VISIT</Text>
          </View>

          <View style={styles.checklistContainer}>
            {checklist.map((item, idx) => (
              <View key={idx} style={styles.checkRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Card 3: Reminder Status */}
        <View style={styles.card}>
          <View style={styles.darkBadge}>
            <Text style={styles.darkBadgeText}>REMINDER STATUS</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.blueIndicatorDot} />
            <Text style={styles.statusBoldText}>Reminder sent successfully.</Text>
          </View>
          <Text style={styles.statusSubtext}>
            You will receive queue updates automatically.
          </Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.quickActionsTitle}>QUICK ACTIONS</Text>

        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => router.push('/patient/queue' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>View Live Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => router.push('/patient/queue-details' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>View Appointment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionOutlineBtn}
            onPress={() => router.push('/patient/appointment-history' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Appointment History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decorative Wave, Leaves & Bottom Tabs */}
      <QueueBottomWaves showLeaves />
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
    paddingTop: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1ecf6',
    marginBottom: 16,
    shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  darkBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0c3564',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  darkBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDeptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0e2b4d',
    marginBottom: 3,
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#086cb3',
    marginBottom: 4,
  },
  dateTimeText: {
    fontSize: 12,
    color: '#4f6c8d',
    marginBottom: 2,
  },
  tokenRoomText: {
    fontSize: 12,
    color: '#65809f',
  },
  checklistContainer: {
    gap: 8,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#086cb3',
    marginRight: 10,
  },
  checkText: {
    fontSize: 12,
    color: '#3e5876',
    lineHeight: 18,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  blueIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066cc',
    marginRight: 8,
  },
  statusBoldText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0e2b4d',
  },
  statusSubtext: {
    fontSize: 11,
    color: '#65809f',
    marginLeft: 16,
  },
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0e2b4d',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  actionsColumn: {
    gap: 10,
    marginBottom: 16,
  },
  actionOutlineBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0e2b4d',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    textAlign: 'center',
    paddingHorizontal: 6,
    flexShrink: 1,
    color: '#0e2b4d',
    fontSize: 14,
    fontWeight: '700',
  },
});
