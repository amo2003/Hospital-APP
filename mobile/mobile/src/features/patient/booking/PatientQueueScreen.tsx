import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "../i18n/LanguageProvider";
import {
  BottomTabs,
  Button,
  C,
  ErrorMessage,
  Header,
  Notice,
  Screen,
  s,
} from "../shared/ui";
import { dateLabel, timeLabel } from "./BookingScreen";
import { usePatientQueue } from "./usePatientQueue";

export default function PatientQueueScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const { queue, loading, error, retry, waiting, started } =
    usePatientQueue(appointmentId);
  return (
    <Screen footer={<BottomTabs active="home" />}>
      <Header
        title="Queue Status"
        back={() => router.replace("/patient/home")}
      />
      {loading && <ActivityIndicator color={C.blue} />}
      <ErrorMessage message={error} />
      {!!error && <Button title="Retry" outline onPress={retry} />}
      {!loading && !error && !queue && (
        <Notice>You have no active appointments in a queue.</Notice>
      )}
      {queue && (
        <>
          <View style={[s.card, { marginBottom: 16, gap: 8 }]}>
            <Text translate={false} style={s.title}>
              {queue.appointment.doctorId?.name || ""}
            </Text>
            <Text style={s.body}>{queue.appointment.department}</Text>
            <Text translate={false} style={s.body}>
              {queue.appointment.hospitalId?.name}
            </Text>
            <Text style={s.body}>
              {dateLabel(queue.appointment.date)} |{" "}
              {timeLabel(queue.appointment.time)}
            </Text>
          </View>
          {queue.queueNumber == null ? (
            <Notice>
              {queue.status === "rejected"
                ? "Appointment Declined"
                : queue.status === "cancelled"
                  ? "Cancelled"
                  : "Your queue and waiting time will appear after doctor approval."}
            </Notice>
          ) : (
            <>
              <View style={[s.row, { marginBottom: 16 }]}>
                <View style={[s.card, { flex: 1, gap: 8 }]}>
                  <Text style={s.label}>Your Queue</Text>
                  <Text translate={false} style={s.title}>
                    #{queue.queueNumber}
                  </Text>
                  <Text
                    style={s.body}
                  >{`${queue.patientsAhead} patients ahead`}</Text>
                </View>
                <View style={[s.card, { flex: 1, gap: 8 }]}>
                  <Text style={s.label}>Now Serving</Text>
                  <Text translate={false} style={s.title}>
                    {queue.nowServing ? `#${queue.nowServing}` : "--"}
                  </Text>
                </View>
              </View>
              <View style={[s.card, { marginBottom: 16, gap: 8 }]}>
                <Text style={s.label}>Time until appointment</Text>
                <Text
                  translate={false}
                  style={{ color: C.blue, fontSize: 28, fontWeight: "700" }}
                >
                  {waiting}
                </Text>
                <Text style={s.body}>
                  {queue.status === "serving"
                    ? "Now Serving"
                    : queue.status === "completed"
                      ? "Completed"
                      : queue.status === "cancelled"
                        ? "Cancelled"
                        : started
                          ? "Appointment time reached"
                          : "Counts down to your scheduled appointment time."}
                </Text>
              </View>
              <Text style={[s.title, { fontSize: 18, marginBottom: 12 }]}>
                {"Doctor's Queue"}
              </Text>
              <Text style={[s.body, { marginBottom: 16 }]}>
                Approval order for this doctor and date. Other patients are
                shown by queue ID only.
              </Text>
              {queue.entries.map((entry) => (
                <View
                  key={entry.queueNumber}
                  style={[
                    s.card,
                    {
                      marginBottom: 10,
                      gap: 5,
                      borderColor: entry.isYou ? C.blue : C.line,
                      backgroundColor: entry.isYou ? "#e7f4ff" : "white",
                    },
                  ]}
                >
                  <Text
                    translate={false}
                    style={{ color: C.navy, fontSize: 16, fontWeight: "700" }}
                  >
                    {entry.name ||
                      `Q-${String(entry.queueNumber).padStart(3, "0")}`}
                  </Text>
                  {entry.isYou && <Text style={s.link}>You</Text>}
                  <Text
                    style={s.body}
                  >{`Token Q-${String(entry.queueNumber).padStart(3, "0")}`}</Text>
                  <Text style={s.body}>{timeLabel(entry.time)}</Text>
                  <Text style={s.body}>
                    {entry.status === "serving"
                      ? "Now Serving"
                      : entry.status === "completed"
                        ? "Completed"
                        : entry.status === "cancelled"
                          ? "Cancelled"
                          : "Waiting"}
                  </Text>
                </View>
              ))}
              <Text style={[s.body, { marginVertical: 12 }]}>
                Queue updates every 15 seconds while this screen is open.
              </Text>
            </>
          )}
        </>
      )}
      <Button
        title="Appointment History"
        outline
        onPress={() => router.push("/patient/appointment-history")}
        style={{ marginTop: 20 }}
      />
    </Screen>
  );
}
