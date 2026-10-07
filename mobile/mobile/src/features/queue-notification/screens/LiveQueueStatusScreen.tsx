import { LanguagePicker } from "../../patient/auth/LanguagePicker";
import { Text } from "../../patient/i18n/LanguageProvider";
import React, { useState } from 'react';
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

export function LiveQueueStatusScreen() {
  const [nowServing] = useState('A-014');
  const [myToken] = useState('A-019');
  const [patientsAhead] = useState(5);
  const [estimatedWait] = useState('25 minutes');
  const [lastUpdated] = useState('Updated 9:41 AM');

  return (
    <View style={styles.container}>
      <ScreenSwitcher currentScreenNumber={1} />
      <QueueHeader
        title="Live Queue Status"
        subtitle="Track your token and estimated waiting time"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor & Room Card */}
        <View style={styles.doctorCard}>
          <Text style={styles.doctorEyebrow}>GENERAL OPD • DR. PRIYA SHARMA</Text>
          <Text style={styles.doctorTitle}>Token {myToken} • Room 03</Text>
        </View>

        {/* Twin Status Cards */}
        <View style={styles.twinCardsRow}>
          {/* Now Serving Card */}
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxLabel}>NOW SERVING</Text>
            <Text style={styles.statusBoxToken}>{nowServing}</Text>
            <Text style={styles.statusBoxSub}>Current token</Text>
          </View>

          {/* Your Token Card */}
          <View style={styles.statusBox}>
            <Text style={styles.statusBoxLabel}>YOUR TOKEN</Text>
            <Text style={styles.statusBoxToken}>{myToken}</Text>
            <Text style={styles.statusBoxSub}>{patientsAhead} patients ahead</Text>
          </View>
        </View>

        {/* Estimated Waiting Time Card */}
        <View style={styles.card}>
          <Text style={styles.cardSmallLabel}>ESTIMATED WAITING TIME</Text>
          <View style={styles.waitRow}>
            <Text style={styles.waitBigNumber}>{estimatedWait}</Text>
            <Text style={styles.waitUpdated}>{lastUpdated}</Text>
          </View>
        </View>

        {/* Queue Progress Card */}
        <View style={styles.card}>
          <Text style={styles.progressHeader}>Queue Progress</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '68%' }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelLeft}>{nowServing} <Text>now serving</Text></Text>
            <Text style={styles.progressLabelRight}>{myToken} <Text>yours</Text></Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/patient/queue-details' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Queue Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filledButton}
            onPress={() => router.push('/patient/notifications' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.filledButtonText}>Notifications</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.outlineButton, styles.fullWidthButton]}
          onPress={() => router.push('/patient/appointment-history' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.outlineButtonText}>Appointment History</Text>
        </TouchableOpacity>

        <Text style={styles.footerNotice}>Live position updates automatically.</Text>
      </ScrollView>

      {/* Curved Blue Waves & Bottom Tabs */}
      <QueueBottomWaves />
      <LanguagePicker />
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
  doctorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1ecf6',
    marginBottom: 14,
    shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  doctorEyebrow: {
    color: '#056cb3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  doctorTitle: {
    color: '#0e2b4d',
    fontSize: 18,
    fontWeight: '700',
  },
  twinCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statusBox: {
    flex: 1,
    backgroundColor: '#0c3564',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  statusBoxLabel: {
    color: '#a0c7ed',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusBoxToken: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  statusBoxSub: {
    color: '#c2def8',
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1ecf6',
    marginBottom: 14,
    shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSmallLabel: {
    color: '#65809f',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  waitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  waitBigNumber: {
    flexShrink: 1,
    color: '#0e2b4d',
    fontSize: 22,
    fontWeight: '700',
  },
  waitUpdated: {
    color: '#086cb3',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  progressHeader: {
    color: '#0e2b4d',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#dceaf6',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0c3564',
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  progressLabelLeft: {
    flexShrink: 1,
    color: '#65809f',
    fontSize: 12,
  },
  progressLabelRight: {
    flexShrink: 1,
    color: '#65809f',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
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
  fullWidthButton: {
    width: '100%',
    marginBottom: 14,
  },
  footerNotice: {
    color: '#65809f',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
