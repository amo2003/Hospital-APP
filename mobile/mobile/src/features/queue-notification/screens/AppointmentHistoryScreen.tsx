import { LanguagePicker } from "../../patient/auth/LanguagePicker";
import { Text, useLanguage } from "../../patient/i18n/LanguageProvider";
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { QueueHeader } from '../components/QueueHeader';
import { QueueBottomWaves } from '../components/QueueBottomWaves';
import { ScreenSwitcher } from '../components/ScreenSwitcher';
import { BottomTabs } from '@/features/patient/shared/ui';
import type { AppointmentHistoryItem } from '../types';

const INITIAL_HISTORY: AppointmentHistoryItem[] = [
  {
    id: 'h1',
    department: 'General OPD',
    doctorName: 'Dr. Priya Sharma',
    date: '20 Sep 2026',
    time: '09:30 AM',
    token: 'Token A-019',
    status: 'Confirmed',
  },
  {
    id: 'h2',
    department: 'General OPD',
    doctorName: 'Dr. R. Silva',
    date: '10 Aug 2026',
    time: '10:00 AM',
    token: 'Token B-092',
    status: 'Completed',
  },
  {
    id: 'h3',
    department: 'Medical Clinic',
    doctorName: 'Dr. K. Perera',
    date: '15 Jul 2026',
    time: '08:30 AM',
    token: 'Token C-044',
    status: 'Completed',
  },
  {
    id: 'h4',
    department: 'General OPD',
    doctorName: 'Dr. A. Fernando',
    date: '02 Jun 2026',
    time: '09:00 AM',
    token: 'Token A-031',
    status: 'Cancelled',
  },
];

export function AppointmentHistoryScreen() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Confirmed' | 'Completed' | 'Cancelled'>('All');

  const filtered = INITIAL_HISTORY.filter((item) => {
    const matchesStatus =
      statusFilter === 'All' ? true : item.status.toLowerCase() === statusFilter.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.department.toLowerCase().includes(q) || t(item.department).toLowerCase().includes(q)) ||
      item.doctorName.toLowerCase().includes(q) ||
      item.token.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: AppointmentHistoryItem['status']) => {
    switch (status) {
      case 'Confirmed':
        return '#00a884';
      case 'Completed':
        return '#1b73e8';
      case 'Cancelled':
        return '#e53935';
    }
  };

  return (
    <View style={styles.container}>
      <ScreenSwitcher currentScreenNumber={4} />
      <QueueHeader
        title="Appointment History"
        subtitle="Filter and review your previous appointments"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#6f8ca8" strokeWidth={2}>
            <Circle cx={11} cy={11} r={8} />
            <Path d="M21 21l-4.35-4.35" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder={t("Search doctor / clinic / token")}
            placeholderTextColor="#8aa3bd"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Status Section */}
        <Text style={styles.filterTitle}>Filter Status</Text>
        <View style={styles.filterRow}>
          {(['All', 'Confirmed', 'Completed', 'Cancelled'] as const).map((tab) => {
            const isSelected = statusFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setStatusFilter(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* All Appointments Section */}
        <Text style={styles.sectionHeading}>All Appointments</Text>
        <View style={styles.list}>
          {filtered.map((item) => {
            const color = getStatusColor(item.status);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.appointmentCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (item.status === 'Confirmed') {
                    router.push('/patient/appointment-reminder' as any);
                  }
                }}
              >
                {/* Left Colored Accent Bar */}
                <View style={[styles.accentBar, { backgroundColor: color }]} />

                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.deptTitle}>{item.department}</Text>
                    <Text style={[styles.statusBadge, { color }]}>{item.status}</Text>
                  </View>

                  <Text style={styles.doctorSub}>
                    <Text translate={false}>{item.doctorName}</Text> • <Text>{item.date}</Text>
                  </Text>
                  <Text style={styles.timeToken}>
                    <Text>{item.time}</Text> • <Text>{item.token}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/patient/notifications' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filledButton}
            onPress={() => router.push('/patient/queue' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.filledButtonText}>Live Queue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decorative Wave & Leaves & Tabs */}
      <QueueBottomWaves showLeaves />
      <LanguagePicker />
      <BottomTabs active="appointments" />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#cce1f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#0e2b4d',
    padding: 0,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0e2b4d',
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0e2b4d',
    marginBottom: 12,
  },
  list: {
    gap: 12,
    marginBottom: 20,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e1ecf6',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#034ea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  accentBar: {
    width: 5,
  },
  cardInfo: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deptTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0e2b4d',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  doctorSub: {
    fontSize: 12,
    color: '#496788',
    marginBottom: 4,
  },
  timeToken: {
    fontSize: 11,
    color: '#7e96b0',
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
});
