import { LanguagePicker } from "../../patient/auth/LanguagePicker";
import { Text } from "../../patient/i18n/LanguageProvider";
import React, { useCallback, useState } from 'react';
import { Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { QueueHeader } from '../components/QueueHeader';
import { QueueBottomWaves } from '../components/QueueBottomWaves';
import { ScreenSwitcher } from '../components/ScreenSwitcher';
import { doctorApi, type DoctorNotification } from '@/features/doctor/shared/doctorApi';
import { useFocusEffect } from 'expo-router';

export function DoctorNotificationsScreen() {
  const [alerts, setAlerts] = useState<DoctorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => doctorApi.getNotifications()
        .then((result) => {
          if (active) {
            setAlerts(result);
            setError('');
          }
        })
        .catch((reason) => {
          if (active) setError(reason instanceof Error ? reason.message : 'Could not load doctor notifications.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      setLoading(true);
      void load();
      const timer = setInterval(load, 15000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, []),
  );

  const renderIcon = (type: DoctorNotification['iconType']) => {
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
  const query = search.trim().toLowerCase();
  const visibleAlerts = alerts.filter((item) =>
    !query || `${item.title} ${item.description} ${item.status}`.toLowerCase().includes(query),
  );

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
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search doctor notifications..."
          placeholderTextColor="#839cb8"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.listContainer}>
          {loading && <ActivityIndicator color="#0c3564" />}
          {!!error && <Text style={styles.emptyText}>{error}</Text>}
          {!loading && !error && visibleAlerts.length === 0 && (
            <Text style={styles.emptyText}>No doctor notifications for today.</Text>
          )}
          {visibleAlerts.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.iconCircle}>
                {renderIcon(item.iconType)}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardTime}>{new Date(item.time).toLocaleTimeString()}</Text>
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
            onPress={() => router.push('/doctor/appointments')}
            activeOpacity={0.7}
          >
            <Text style={styles.filledButtonText}>Appointment Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push('/doctor/patients')}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Patient List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decorative Wave & Bottom Tabs */}
      <QueueBottomWaves />
      <LanguagePicker />
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#d5e4f2',
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#0e2b4d',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 16,
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
  emptyText: {
    color: '#65809f',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
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
