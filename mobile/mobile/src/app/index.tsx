import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Hospital OPD</Text>
          <Text style={styles.title}>Smart care dashboard</Text>
          <Text style={styles.subtitle}>
            Appointment and queue management for a smoother patient journey.
          </Text>
        </View>

        <View style={styles.grid}>
          <Pressable style={styles.card}>
            <Text style={styles.cardLabel}>Appointments</Text>
            <Text style={styles.cardNumber}>128</Text>
            <Text style={styles.cardMeta}>Scheduled today</Text>
          </Pressable>

          <Pressable style={styles.card}>
            <Text style={styles.cardLabel}>Queue</Text>
            <Text style={styles.cardNumber}>18</Text>
            <Text style={styles.cardMeta}>Patients waiting</Text>
          </Pressable>

          <Pressable style={styles.card}>
            <Text style={styles.cardLabel}>Doctors</Text>
            <Text style={styles.cardNumber}>12</Text>
            <Text style={styles.cardMeta}>On duty</Text>
          </Pressable>

          <Pressable style={styles.card}>
            <Text style={styles.cardLabel}>Reports</Text>
            <Text style={styles.cardNumber}>06</Text>
            <Text style={styles.cardMeta}>New updates</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today’s focus</Text>
          <View style={styles.listItem}>
            <Text style={styles.listDot}>•</Text>
            <Text style={styles.listText}>Complete patient registration checks.</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listDot}>•</Text>
            <Text style={styles.listText}>Verify doctor availability for the next queue.</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listDot}>•</Text>
            <Text style={styles.listText}>Send appointment reminders to patients.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  content: {
    padding: 20,
    gap: 18,
  },
  headerCard: {
    backgroundColor: '#1d4ed8',
    borderRadius: 22,
    padding: 22,
    gap: 8,
  },
  eyebrow: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#dbeafe',
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  cardNumber: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listDot: {
    color: '#1d4ed8',
    fontSize: 18,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
  },
});
