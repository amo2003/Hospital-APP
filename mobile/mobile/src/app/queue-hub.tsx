import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { QueueHeader } from '@/features/queue-notification/components/QueueHeader';
import { SCREEN_ROUTES } from '@/features/queue-notification/components/ScreenSwitcher';
import { BottomTabs } from '@/features/patient/shared/ui';

export default function QueueHubScreen() {
  const descriptions: Record<string, string> = {
    '1': 'Live token tracking, current serving token, waiting time & progress bar',
    '2': 'Position details, estimated wait time banner & connected queue timeline',
    '3': 'Patient notifications with filter pills (All, Appointment, Queue, General)',
    '4': 'History with search bar, status filters (Confirmed, Completed, Cancelled)',
    '5': 'Staff/doctor live alerts: Patient check-ins, queue alerts & schedule changes',
    '6': 'Hospital administration alerts: Approvals, queue load & announcements',
    '7': 'Upcoming OPD appointment reminder card, pre-visit checklist & quick actions',
  };

  return (
    <View style={styles.container}>
      <QueueHeader
        title="Queue & Notifications"
        subtitle="7 Completed Project Screens • CarePlus OPD"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>All 7 Project Screens</Text>
        <Text style={styles.sectionSubtitle}>
          Select any screen below to preview the exact UI matching your designs:
        </Text>

        <View style={styles.grid}>
          {SCREEN_ROUTES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Screen {item.id}</Text>
                </View>
                <Text style={styles.arrowText}>→</Text>
              </View>

              <Text style={styles.cardTitle}>{item.title.substring(3)}</Text>
              <Text style={styles.cardDesc}>{descriptions[item.id]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/patient/queue' as any)}
        >
          <Text style={styles.startBtnText}>Start Live Queue Walkthrough</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: '#0066cc', marginTop: 10 }]}
          onPress={() => router.push('/launch' as any)}
        >
          <Text style={styles.startBtnText}>Go to Doctor, Nurse & Patient Portal</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabs active="notifications" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f9fd',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0e2b4d',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#537191',
    lineHeight: 18,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce8f5',
    shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#0c3564',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  arrowText: {
    color: '#0066cc',
    fontSize: 18,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0e2b4d',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#557291',
    lineHeight: 17,
  },
  startBtn: {
    backgroundColor: '#0e2b4d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
