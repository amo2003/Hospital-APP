import { Text } from "../../patient/i18n/LanguageProvider";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { BottomTabs, notifyNotificationChange } from '@/features/patient/shared/ui';
import { api, messageOf } from '@/features/patient/shared/api';
import type { PatientNotificationRecord } from '../types';

export function PatientNotificationsScreen() {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Appointment' | 'Queue' | 'General'>('All');
  const [notifications, setNotifications] = useState<PatientNotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.notifications()
      .then((result) => {
        if (active) setNotifications(result);
      })
      .catch((reason) => {
        if (active) setError(messageOf(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = notifications.filter((item) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Appointment') return item.type === 'appointment';
    if (activeFilter === 'Queue') return item.type === 'queue';
    if (activeFilter === 'General') return item.type === 'general';
    return true;
  });

  const renderIcon = (type: PatientNotificationRecord['type']) => {
    switch (type) {
      case 'queue':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={5} fill="#0066cc" />
          </Svg>
        );
      case 'appointment':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            <Rect x={3} y={4} width={18} height={18} rx={2} />
            <Path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
          </Svg>
        );
      case 'general':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth={2}>
            <Circle cx={12} cy={12} r={10} />
            <Path d="M12 6v6l4 2" />
          </Svg>
        );
      default:
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
          {loading && <ActivityIndicator color="#0c3564" />}
          {!!error && <Text style={styles.emptyText}>{error}</Text>}
          {!loading && !error && filtered.length === 0 && (
            <Text style={styles.emptyText}>No notifications yet.</Text>
          )}
          {filtered.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={[styles.card, !item.read && styles.unreadCard]}
              activeOpacity={0.8}
              onPress={() => {
                if (!item.read) {
                  setNotifications((current) => current.map((notification) =>
                    notification._id === item._id ? { ...notification, read: true } : notification,
                  ));
                  notifyNotificationChange();
                  void api.markNotificationRead(item._id);
                }
                if (item.action === 'appointment-reminder') router.push('/patient/appointment-reminder' as any);
                else if (item.action === 'queue') router.push('/patient/queue' as any);
              }}
            >
              <View style={styles.iconCircle}>
                {renderIcon(item.type)}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.cardBody}>{item.description}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Delete notification"
                onPress={() => {
                  void api.deleteNotification(item._id).then(() => {
                    setNotifications((current) => current.filter((notification) => notification._id !== item._id));
                    notifyNotificationChange();
                  });
                }}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
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
    flexWrap: 'wrap',
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
  unreadCard: {
    borderColor: '#8bbce8',
    backgroundColor: '#f7fbff',
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
  deleteButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteButtonText: {
    color: '#b42318',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    color: '#65809f',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
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
});
