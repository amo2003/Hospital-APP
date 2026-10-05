import { router } from "expo-router";
import { View } from "react-native";
import { BottomTabs, Button, Header, Notice, Screen } from "./ui";
export function QueueScreen() {
  return (
    <Screen footer={<BottomTabs active="home" />}>
      <Header title="Your Queue" back={() => router.replace("/patient/home")} />
      <Notice>
        Your appointment details are available in My Appointments. Live queue
        position and waiting time will appear when the hospital queue service is
        connected.
      </Notice>
      <View style={{ height: 24 }} />
      <Button
        title="View Appointments"
        onPress={() => router.replace("/patient/appointments")}
      />
    </Screen>
  );
}
export function NotificationsScreen() {
  return (
    <Screen footer={<BottomTabs active="notifications" />}>
      <Header
        title="Notifications"
        back={() => router.replace("/patient/home")}
      />
      <Notice>
        No notifications yet. Hospital queue alerts and reminders will be
        connected in a later update.
      </Notice>
    </Screen>
  );
}
