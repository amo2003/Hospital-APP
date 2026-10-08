import { Text, useLanguage } from "../i18n/LanguageProvider";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { usePatient } from "../shared/session";
import {
  BottomTabs,
  Button,
  C,
  ErrorMessage,
  Notice,
  NotificationBell,
  Screen,
  Wave,
  s,
} from "../shared/ui";
import { Icon, type IconName } from "../shared/icons";
import { dateLabel, timeLabel } from "./BookingScreen";
import { PatientAvatar } from "../profile/ProfilePhotoPicker";
import PatientDrawer from "../shared/PatientDrawer";
import { usePatientQueue } from "./usePatientQueue";
export default function HomeScreen() {
  const { patient } = usePatient();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const { queue, loading, error, retry, waiting, started } = usePatientQueue();
  const next = queue?.appointment;
  return (
    <Screen footer={<BottomTabs active="home" />}>
      {menuOpen && <PatientDrawer onClose={() => setMenuOpen(false)} />}
      <LinearGradient
        colors={["#004877", "#11336a"]}
        style={{
          marginHorizontal: -24,
          paddingHorizontal: 24,
          paddingTop: 22,
          paddingBottom: 88,
        }}
      >
        <View
          style={[s.row, { justifyContent: "space-between", marginBottom: 18 }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Open menu")}
            hitSlop={12}
            onPress={() => setMenuOpen(true)}
          >
            <Icon name="menu" color="#fff" />
          </Pressable>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={() => router.push("/patient/notifications")}
          >
            <NotificationBell color="#fff" size={29} />
          </Pressable>
        </View>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#e9f5ff", fontSize: 13 }}>
              Good{" "}
              {new Date().getHours() < 12
                ? "morning"
                : new Date().getHours() < 17
                  ? "afternoon"
                  : "evening"}
              ,
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 27,
                fontWeight: "700",
                marginTop: 4,
              }}
            >
              {patient?.fullName}
            </Text>
            <Text style={{ color: "#c7e5ff", fontSize: 12, marginTop: 7 }}>
              {next
                ? "Stay healthy. Stay happy!"
                : "Welcome to your OPD dashboard"}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="My profile"
            onPress={() => router.push("/patient/profile")}
            style={[s.iconTile, { width: 52, height: 52, borderRadius: 28 }]}
          >
            <PatientAvatar uri={patient?.profileImage} size={52} />
          </Pressable>
        </View>
      </LinearGradient>
      <View style={[s.card, { marginTop: -58, minHeight: 155, padding: 17 }]}>
        {loading ? (
          <ActivityIndicator color={C.blue} style={{ padding: 38 }} />
        ) : error ? (
          <>
            <ErrorMessage message={error} />
            <Button title="Retry" outline onPress={retry} />
          </>
        ) : next ? (
          <>
            <Text style={[s.label, { marginBottom: 13 }]}>
              Next Appointment
            </Text>
            <View style={s.row}>
              <View style={s.iconTile}>
                <Icon name="user" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: C.navy, fontWeight: "700", fontSize: 14 }}
                >
                  {next.doctorId?.name || "Doctor"}
                </Text>
                <Text style={[s.body, { fontSize: 11 }]}>
                  {next.department}
                </Text>
                <Text style={[s.body, { fontSize: 11 }]}>
                  {dateLabel(next.date)} | {timeLabel(next.time)}
                </Text>
                <Text style={[s.body, { fontSize: 11 }]}>
                  {next.hospitalId?.name}
                </Text>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/patient/queue",
                      params: { appointmentId: next._id },
                    })
                  }
                  style={{ paddingTop: 7 }}
                >
                  <Text style={s.link}>View Details →</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <View style={[s.iconTile, { width: 57, height: 57 }]}>
              <Icon name="calendar" size={27} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: C.navy,
                  fontSize: 17,
                  fontWeight: "700",
                  marginTop: 3,
                }}
              >
                No appointment yet
              </Text>
              <Text
                style={[
                  s.body,
                  { fontSize: 11, marginTop: 7, marginBottom: 16 },
                ]}
              >
                You have no upcoming OPD bookings. Book now to reserve a doctor
                and time.
              </Text>
              <Button
                title="Book Appointment"
                onPress={() => router.push("/patient/book")}
              />
            </View>
          </View>
        )}
      </View>
      <View style={[s.row, { marginTop: 15 }]}>
        <Pressable
          onPress={() => router.push("/patient/queue")}
          style={[s.card, { flex: 1, padding: 14, alignItems: "center" }]}
        >
          <Text style={{ color: C.muted, fontSize: 11, fontWeight: "600" }}>
            Your Queue
          </Text>
          <Text
            style={{
              color: C.navy,
              fontSize: 23,
              fontWeight: "700",
              marginVertical: 7,
            }}
          >
            {queue ? `#${queue.queueNumber}` : "--"}
          </Text>
          <Text style={{ color: "#00a884", fontSize: 11, fontWeight: "600" }}>
            {queue
              ? `${queue.patientsAhead} patients ahead`
              : "Book an appointment"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/patient/queue-details")}
          style={[s.card, { flex: 1, padding: 14, alignItems: "center" }]}
        >
          <Text style={{ color: C.muted, fontSize: 11, fontWeight: "600" }}>
            Estimated Waiting Time
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              color: C.navy,
              fontSize: 22,
              width: "100%",
              textAlign: "center",
              fontWeight: "700",
              marginVertical: 7,
            }}
          >
            {waiting}
          </Text>
          <Text style={{ color: C.blue, fontSize: 11, fontWeight: "600" }}>
            {queue
              ? started
                ? "Appointment time reached"
                : "Time until appointment"
              : "Not available yet"}
          </Text>
        </Pressable>
      </View>
      <Text
        style={[s.title, { fontSize: 18, marginTop: 23, marginBottom: 12 }]}
      >
        Quick Actions
      </Text>
      <View style={{ flexDirection: "row", gap: 9 }}>
        {(
          [
            {
              title: "Book\nAppointment",
              icon: "calendar",
              path: "/patient/book",
            },
            { title: "View\nQueue", icon: "clock", path: "/patient/queue" },
            {
              title: "Appointment\nHistory",
              icon: "id",
              path: "/patient/appointment-history",
            },
            {
              title: "Notifications",
              icon: "bell",
              path: "/patient/notifications",
            },
          ] as const
        ).map((action) => (
          <Pressable
            key={action.title}
            onPress={() => router.push(action.path)}
            style={[
              s.card,
              {
                flex: 1,
                paddingHorizontal: 3,
                paddingVertical: 13,
                alignItems: "center",
                gap: 8,
              },
            ]}
          >
            <View
              style={{
                backgroundColor: "#e9f5ff",
                padding: 7,
                borderRadius: 10,
              }}
            >
              <Icon name={action.icon as IconName} size={22} />
            </View>
            <Text
              style={{
                textAlign: "center",
                color: C.navy,
                fontSize: 9,
                lineHeight: 13,
                fontWeight: "600",
              }}
            >
              {action.title}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          flex: 1,
          minHeight: 115,
          marginTop: 12,
          overflow: "hidden",
          marginHorizontal: -24,
          marginBottom: -25,
          justifyContent: "flex-end",
          padding: 24,
        }}
      >
        <Wave />
        <Notice>
          {next
            ? "Queue updates every 15 seconds while this screen is open."
            : "Your queue and waiting time will appear after booking an appointment."}
        </Notice>
      </View>
    </Screen>
  );
}
