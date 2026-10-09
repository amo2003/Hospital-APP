import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Text, useLanguage } from "../patient/i18n/LanguageProvider";
import { C, ErrorMessage, Header, Screen, s } from "../patient/shared/ui";
import { nurseApi, nurseMessageOf } from "./api";
import { NurseTabs } from "./NurseShared";
import type { NurseNotification } from "./types";

type TypeFilter = "all" | "appointment" | "queue" | "general";

export default function NurseNotificationsScreen() {
  const { t } = useLanguage();
  const [type, setType] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<NurseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => {
        setLoading(true);
        nurseApi.notifications(type, "all")
          .then((result) => {
            if (active) {
              setItems(result);
              setError("");
            }
          })
          .catch((reason) => {
            if (active) setError(nurseMessageOf(reason));
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      };
      load();
      const timer = setInterval(load, 15000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [type]),
  );

  const typeFilters: Array<{ key: TypeFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "appointment", label: "Appointments" },
    { key: "queue", label: "Queue" },
    { key: "general", label: "General" },
  ];
  const query = search.trim().toLowerCase();
  const visibleItems = items.filter((item) => {
    if (!query) return true;
    return [item.title, item.description, item.patient?.fullName, item.patient?.patientId]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  return (
    <Screen footer={<NurseTabs active="notifications" />}>
      <Header
        title={t("Notifications")}
        subtitle="Patient bookings, approvals and status updates"
        back={() => router.replace("/nurse/dashboard")}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search patient or notification..."
          placeholderTextColor={C.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[s.label, { marginBottom: 8 }]}>Category</Text>
        <View style={[s.row, { flexWrap: "wrap", gap: 8, marginBottom: 14 }]}>
          {typeFilters.map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => setType(filter.key)}
              style={{
                borderWidth: 1,
                borderColor: type === filter.key ? C.navy : C.line,
                backgroundColor: type === filter.key ? C.navy : "#fff",
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: type === filter.key ? "#fff" : C.navy, fontSize: 11, fontWeight: "700" }}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {loading && <ActivityIndicator color={C.blue} style={{ marginVertical: 24 }} />}
        {!!error && <ErrorMessage message={error} />}
        {!loading && !error && visibleItems.length === 0 && (
          <Text style={[s.body, { textAlign: "center", marginVertical: 28 }]}>No notifications match these filters.</Text>
        )}
        {!loading && !error && visibleItems.map((item) => (
          <View key={item.id} style={[s.card, { marginBottom: 10, borderColor: item.read ? C.line : C.blue, backgroundColor: item.read ? "#fff" : "#f4faff" }]}>
            <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }]}>
              <Text style={[s.title, { fontSize: 15, flex: 1 }]}>{item.title}</Text>
              <Text style={{ color: C.muted, fontSize: 10 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            {item.patient && <Text style={[s.link, { marginBottom: 4 }]}>{item.patient.fullName} · {item.patient.patientId}</Text>}
            <Text style={s.body}>{item.description}</Text>
            {!item.read && <Text style={{ color: C.blue, fontSize: 10, fontWeight: "700", marginTop: 8 }}>Unread</Text>}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = {
  searchInput: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: "#fff",
    color: C.navy,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
  },
};
