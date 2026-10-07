import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { QueueHeader } from '../components/QueueHeader';
import { QueueBottomWaves } from '../components/QueueBottomWaves';
import { ScreenSwitcher } from '../components/ScreenSwitcher';
import { BottomTabs } from '@/features/patient/shared/ui';
import type { PatientNotificationItem } from '../types';

const INITIAL_NOTIFICATIONS: PatientNotificationItem[] = [
  {
    id: 'n1',
    type: 'queue',
    title: 'Queue Update',
    time: '9:35 AM',
    description: 'Token A-019 is 5 patients away. Estimated waiting time: 25 minutes.',
    iconType: 'dot',
  },
  {
    id: 'n2',
    type: 'appointment',
    title: 'Appointment Reminder',
    time: '8:00 AM',
    description: 'Your appointment is tomorrow at 9:30 AM. Dr. Priya Sharma • General OPD',
    iconType: 'reminder',
  },
  {
    id: 'n3',
    type: 'general',
    title: 'Clinic Delay',
    time: 'Yesterday',
    description: 'General OPD was delayed by 15 minutes.',
    iconType: 'delay',
  },
  {
    id: 'n4',
    type: 'appointment',
    title: 'Appointment Confirmed',
    time: '18 Sep',
    description: 'Token A-019 has been confirmed.',
    iconType: 'confirmed',
  },
];

export function PatientNotificationsScreen() {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Appointment' | 'Queue' | 'General'>('All');

  const filtered = INITIAL_NOTIFICATIONS.filter((item) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Appointment') return item.type === 'appointment';
    if (activeFilter === 'Queue') return item.type === 'queue';
    if (activeFilter === 'General') return item.type === 'general';
    return true;
  });

  const renderIcon = (type: PatientNotificationItem['iconType']) => {
    switch (type) {
      case 'dot':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={5} fill="#0066cc" />
          </Svg>
        );
      case 'reminder':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            <Rect x={3} y={4} width={18} height={18} rx={2} />
            <Path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
          </Svg>
        );
      case 'delay':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            <Circle cx={12} cy={12} r={10} />
            <Path d="M12 6v6l4 2" />
          </Svg>
        );
      case 'confirmed':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2.5}>
            <Path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
    }
  };

  return (
    <View style={styles.container}>
      <ScreenSwitcher currentScreenNumber={3} />
      <QueueHeader
        title="Notifications"
        subtitle="Appointment, queue and clinic updates"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Appointment', 'Queue', 'General'] as const).map((tab) => {
            const isSelected = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notifications List */}
        <View style={styles.listContainer}>
          {filtered.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => {
                if (item.id === 'n2') router.push('/patient/appointment-reminder' as any);
                else if (item.id === 'n1') router.push('/patient/queue' as any);
              }}
            >
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/patient/queue' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Live Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/patient/appointment-history' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decorative Wave & Bottom Tabs */}
      <QueueBottomWaves />
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5e4f2',
  },
  pillActive: {
    backgroundColor: '#0c3564',
    borderColor: '#0c3564',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0e2b4d',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
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
    color: '#0e2b4d',
    fontSize: 14,
    fontWeight: '700',
  },
});
