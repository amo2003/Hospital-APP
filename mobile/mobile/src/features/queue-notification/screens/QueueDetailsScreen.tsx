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
import { Button } from '@/features/patient/shared/ui';
import { usePatientQueue } from '@/features/patient/booking/usePatientQueue';

export function QueueDetailsScreen() {
  const { queue, loading, error, retry } = usePatientQueue();
  return (
    <View style={styles.container}>
      <ScreenSwitcher currentScreenNumber={2} />
      <QueueHeader
        title="Queue Details"
        subtitle="Detailed position and waiting-time information"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && <Text style={styles.emptyText}>Loading queue details...</Text>}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!!error && <Button title="Retry" outline onPress={retry} />}
        {!loading && !error && !queue && (
          <Text style={styles.emptyText}>You have no active appointments in a queue.</Text>
        )}
        {queue && <>
        {/* Current Queue Header Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.currentQueueEyebrow}>CURRENT QUEUE</Text>
          <Text style={styles.currentQueueTitle}>{queue.appointment.department} • {queue.appointment.doctorId?.name || 'Doctor'}</Text>
        </View>

        {/* Dual Stat Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerColumn}>
            <Text style={styles.bannerLabel}>YOUR POSITION</Text>
            <Text style={styles.bannerValue}>{queue.patientsAhead + 1}th</Text>
            <Text style={styles.bannerSub}>Token Q-{String(queue.queueNumber).padStart(3, '0')}</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerColumn}>
            <Text style={styles.bannerLabel}>ESTIMATED WAIT</Text>
            <Text style={styles.bannerValue}>{queue.estimatedWaitMinutes} min</Text>
            <Text style={styles.bannerSub}> </Text>
          </View>
        </View>

        {/* Queue Timeline */}
        <Text style={styles.timelineSectionTitle}>Queue Timeline</Text>
        <View style={styles.timelineCard}>
          {queue.entries.map((entry, index) => (
            <View key={entry.queueNumber} style={[styles.timelineItem, index === queue.entries.length - 1 && { marginBottom: 0 }]}> 
              <View style={styles.nodeColumn}>
                <View style={[styles.circleDot, entry.isYou || entry.status === 'serving' ? styles.circleSolid : styles.circleHollow]} />
                {index < queue.entries.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineNodeTitle}>Q-{String(entry.queueNumber).padStart(3, '0')}{entry.isYou ? ' — You' : ''}</Text>
                <Text style={styles.timelineNodeSub}>{entry.status === 'serving' ? 'Now serving' : entry.isYou ? 'Your token' : entry.status === 'completed' ? 'Completed' : 'Waiting'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.filledButton}
            onPress={() => router.push('/patient/queue' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.filledButtonText}>Live Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/patient/notifications' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Notifications</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.outlineButton, styles.fullWidthButton]}
          onPress={() => router.push('/patient/appointment-history' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.outlineButtonText}>Appointment History</Text>
        </TouchableOpacity>
        </>}
      </ScrollView>

      {/* Decorative Wave & Leaf & Tabs */}
      <QueueBottomWaves showLeaves />
      <BottomTabs active="home" />
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
  sectionHeader: {
    marginBottom: 14,
  },
  currentQueueEyebrow: {
    color: '#056cb3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  currentQueueTitle: {
    color: '#0e2b4d',
    fontSize: 16,
    fontWeight: '700',
  },
  bannerCard: {
    backgroundColor: '#0c3564',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  bannerColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  bannerDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 16,
  },
  bannerLabel: {
    color: '#9cc7ef',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  bannerValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bannerSub: {
    color: '#c2def8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  timelineSectionTitle: {
    color: '#0e2b4d',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e1ecf6',
    marginBottom: 20,
    shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  nodeColumn: {
    width: 26,
    alignItems: 'center',
    marginRight: 12,
  },
  circleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0c3564',
  },
  circleSolid: {
    backgroundColor: '#0c3564',
  },
  circleHollow: {
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#0c3564',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#0c3564',
    marginTop: 3,
    minHeight: 28,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 0,
  },
  timelineNodeTitle: {
    color: '#0e2b4d',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  timelineNodeSub: {
    color: '#65809f',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  fullWidthButton: {
    width: '100%',
    marginBottom: 14,
  },
  emptyText: {
    color: '#65809f',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  errorText: {
    color: '#b42318',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
});
