import { Text } from "../../patient/i18n/LanguageProvider";
import React, { useState } from 'react';
import { Platform,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

export const SCREEN_ROUTES = [
  { id: '1', title: '01 Live Queue Status', route: '/patient/queue' },
  { id: '2', title: '02 Queue Details', route: '/patient/queue-details' },
  { id: '3', title: '03 Patient Notifications', route: '/patient/notifications' },
  { id: '4', title: '04 Appointment History', route: '/patient/appointment-history' },
  { id: '5', title: '05 Doctor Alerts', route: '/patient/doctor-notifications' },
  { id: '6', title: '06 Admin Alerts', route: '/patient/admin-notifications' },
  { id: '7', title: '07 Appointment Reminder', route: '/patient/appointment-reminder' },
] as const;

interface ScreenSwitcherProps {
  currentScreenNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function ScreenSwitcher({ currentScreenNumber }: ScreenSwitcherProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const current = SCREEN_ROUTES[currentScreenNumber - 1];

  const handleSelect = (route: string) => {
    setModalVisible(false);
    router.replace(route as any);
  };

  const handlePrev = () => {
    const prevIndex = currentScreenNumber === 1 ? SCREEN_ROUTES.length - 1 : currentScreenNumber - 2;
    router.replace(SCREEN_ROUTES[prevIndex].route as any);
  };

  const handleNext = () => {
    const nextIndex = currentScreenNumber === SCREEN_ROUTES.length ? 0 : currentScreenNumber;
    router.replace(SCREEN_ROUTES[nextIndex].route as any);
  };

  return (
    <>
      {/* Top Floating Control Bar */}
      <View style={styles.floatingBar}>
        <TouchableOpacity
          onPress={handlePrev}
          style={styles.navArrowBtn}
          accessibilityLabel="Previous screen"
        >
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatingCenterPill}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
          accessibilityLabel="Switch screen menu"
        >
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>
            {currentScreenNumber}/7 • <Text>{current.title.replace(/^\d+ /, "")}</Text> ▾
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.navArrowBtn}
          accessibilityLabel="Next screen"
        >
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalHeader}>Frontend Preview (7 Screens)</Text>
            <Text style={styles.modalSub}>
              Queue Monitoring & Notification Management
            </Text>

            <View style={styles.list}>
              {SCREEN_ROUTES.map((item, index) => {
                const isSelected = index + 1 === currentScreenNumber;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.itemRow,
                      isSelected && styles.itemRowSelected,
                    ]}
                    onPress={() => handleSelect(item.route)}
                  >
                    <View
                      style={[
                        styles.badgeNumber,
                        isSelected && styles.badgeNumberSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isSelected && styles.badgeTextSelected,
                        ]}
                      >
                        {item.id}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.itemTitle,
                        isSelected && styles.itemTitleSelected,
                      ]}
                    >
                      {item.title}
                    </Text>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    maxWidth: "90%",
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(3, 40, 77, 0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4, },
    }),
    elevation: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  navArrowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  floatingCenterPill: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
    marginRight: 6,
  },
  pillText: {
    flexShrink: 1,
    textAlign: "center",
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      web: { boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)' },
      default: { shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10, },
    }),
    elevation: 8,
  },
  modalHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f2d4e',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 12,
    color: '#55708f',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  list: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f5f9fc',
    borderWidth: 1,
    borderColor: '#e2edf7',
  },
  itemRowSelected: {
    backgroundColor: '#e6f3ff',
    borderColor: '#0066cc',
  },
  badgeNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dce8f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  badgeNumberSelected: {
    backgroundColor: '#0066cc',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f2d4e',
  },
  badgeTextSelected: {
    color: '#ffffff',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#213f63',
    flex: 1,
  },
  itemTitleSelected: {
    color: '#0066cc',
    fontWeight: '700',
  },
  checkMark: {
    fontSize: 15,
    color: '#0066cc',
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
  },
  closeBtnText: {
    color: '#476282',
    fontSize: 13,
    fontWeight: '600',
  },
});
