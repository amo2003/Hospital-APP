import { useCallback, useState } from "react";
import { ActivityIndicator, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Pressable, ScrollView, View } from "@/theme/primitives";
import { Text, useLanguage } from "../../patient/i18n/LanguageProvider";
import { Button, C, ErrorMessage, Header, Screen, s } from "../../patient/shared/ui";
import DateField from "../../patient/shared/DateField";
import { nurseApi, nurseMessageOf } from "../api";
import { NurseTabs } from "../NurseShared";
import type { NurseReport } from "../types";
import { exportReport } from "./exportReport";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const daysBefore = (date: string, days: number) => new Date(Date.parse(date) - days * 86_400_000).toISOString().slice(0, 10);

export default function NurseReportsScreen() {
  const { t, language } = useLanguage();
  const [range, setRange] = useState(() => ({ from: today(), to: today() }));
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [report, setReport] = useState<NurseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(""); setExportError(""); setReport(null); setVisibleCount(20);
    nurseApi.report(range.from, range.to).then(data => { if (active) setReport(data); })
      .catch(cause => { if (active) setError(nurseMessageOf(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]));

  function apply() {
    const length = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (!from || !to || !Number.isFinite(length) || length < 0 || length > 89) {
      setError("Choose a date range of up to 90 days, with the start before the end."); return;
    }
    if (to > today()) { setError("Report dates cannot be in the future."); return; }
    setRange({ from, to });
  }
  function preset(days: number) {
    const end = today(), start = daysBefore(end, days - 1);
    setFrom(start); setTo(end); setRange({ from: start, to: end });
  }
  async function savePdf() {
    if (!report) return;
    setExporting(true); setExportError("");
    try { await exportReport(report, t, language); }
    catch (cause) { setExportError(nurseMessageOf(cause)); }
    finally { setExporting(false); }
  }
  const maxDaily = Math.max(1, ...(report?.daily.map(day => day.count) ?? []));
  const maxDoctor = Math.max(1, ...(report?.byDoctor.map(doctor => doctor.count) ?? []));
  const card = [s.card, { marginBottom: 16, padding: 18 }];

  return <Screen footer={<NurseTabs active="home" />}>
    <Header title="Reports" subtitle="Completed queue report" back={() => router.replace("/nurse/dashboard")} />
    <View style={card}>
      <Text style={[s.title, { fontSize: 17, marginBottom: 12 }]}>Report period</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {[["Today", 1], ["Last 7 days", 7], ["Last 30 days", 30]].map(([label, days]) => <Pressable key={label} accessibilityRole="button" onPress={() => preset(Number(days))} style={{ backgroundColor: "#e6f3ff", borderRadius: 18, padding: 10 }}><Text style={{ color: C.blue, fontSize: 12, fontWeight: "600" }}>{label}</Text></Pressable>)}
      </View>
      <DateField label="From date" value={from} onChange={setFrom} />
      <DateField label="To date" value={to} onChange={setTo} />
      <Button title="Apply dates" onPress={apply} disabled={loading} />
      <Button title="Refresh" outline onPress={() => setRange(current => ({ ...current }))} disabled={loading} style={{ marginTop: 10 }} />
      <Text style={[s.body, { marginTop: 12 }]}>Based on queue dates. Completed visits only.</Text>
    </View>
    <ErrorMessage message={error} />
    {!!error && !report && <Button title="Retry" outline onPress={() => setRange(current => ({ ...current }))} />}
    {loading && <ActivityIndicator accessibilityLabel={t("Loading report")} color={C.blue} style={{ margin: 24 }} />}
    {report && !loading && <>
      <Text style={[s.label, { fontSize: 16 }]}>{report.hospital}</Text>
      <Text style={[s.body, { marginBottom: 14 }]}>{report.department}{"\n"}{report.from} — {report.to}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {[["Completed visits", report.summary.completed], ["Unique patients", report.summary.patients], ["Doctors", report.summary.doctors], ["Average per day", report.summary.averagePerDay]].map(([label, value]) => <View key={label} style={[s.card, { width: "48%", flexGrow: 1, padding: 14 }]}><Text style={[s.body, { fontSize: 12 }]}>{label}</Text><Text style={{ color: C.blue, fontSize: 28, fontWeight: "800", marginTop: 6 }}>{value}</Text></View>)}
      </View>
      {!report.records.length ? <View style={card}><Text style={s.title}>No completed records</Text><Text style={[s.body, { marginTop: 8 }]}>Complete a patient visit in Queue Management, or choose another date range.</Text></View> : <>
        <View style={card}>
          <Text style={[s.title, { fontSize: 17, marginBottom: 18 }]}>Completed visits by day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 6, paddingBottom: 10, flexGrow: 1 }}>
            {report.daily.map(day => <View key={day.date} accessible accessibilityLabel={`${day.date}: ${day.count} ${t("Completed visits")}`} style={{ width: report.daily.length > 7 ? 42 : undefined, flex: report.daily.length <= 7 ? 1 : undefined, minWidth: 24, alignItems: "center" }}>
              <Text style={[s.label, { fontSize: 12 }]}>{day.count}</Text>
              <View style={{ height: 105, width: 22, justifyContent: "flex-end", backgroundColor: "#edf4fa", borderRadius: 5 }}><View style={{ height: day.count ? Math.max(3, day.count / maxDaily * 105) : 0, backgroundColor: C.blue, borderRadius: 5 }} /></View>
              <Text style={[s.body, { fontSize: 10, marginTop: 8 }]}>{day.date.slice(5)}</Text>
            </View>)}
          </ScrollView>
          {report.daily.length > 7 && <Text style={[s.body, { fontSize: 11 }]}>Swipe to see all dates.</Text>}
        </View>
        <View style={card}>
          <Text style={[s.title, { fontSize: 17, marginBottom: 16 }]}>Completed visits by doctor</Text>
          {report.byDoctor.map(doctor => <View key={doctor.id} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}><Text style={[s.label, { flex: 1 }]}>{doctor.name || t("Not recorded")}</Text><Text style={s.label}>{doctor.count}</Text></View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: "#edf4fa" }}><View style={{ width: `${doctor.count / maxDoctor * 100}%`, height: 10, borderRadius: 5, backgroundColor: C.blue }} /></View>
          </View>)}
        </View>
      </>}
      <Button title="Download PDF" loading={exporting} disabled={!report.records.length} onPress={savePdf} />
      <Text style={[s.body, { fontSize: 11, marginTop: 8, marginBottom: 14 }]}>{Platform.OS === "web" ? "Choose Save as PDF in the print window." : "Save or share the PDF using your phone's share menu."}</Text>
      <ErrorMessage message={exportError} />
      <Text style={[s.title, { fontSize: 18, marginBottom: 12 }]}><Text>Completed records</Text> ({report.records.length})</Text>
      <Text style={[s.body, { fontSize: 11, marginBottom: 14 }]}>Completion times are unavailable for older records.</Text>
      {report.records.slice(0, visibleCount).map(record => <View key={record.id} style={card}>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}><Text style={[s.title, { fontSize: 18, flex: 1 }]}>{record.patientName || t("Not recorded")}</Text><Text style={{ color: C.blue, fontWeight: "700" }}>{record.token}</Text></View>
        <Text style={s.body}>{record.patientId || t("Not recorded")}</Text>
        <Text style={s.body}>{record.department}</Text>
        <Text style={[s.label, { marginTop: 10 }]}><Text>Doctor</Text>: {record.doctorName || t("Not recorded")}</Text>
        <Text style={s.body}>{record.date} · {record.time || "—"}</Text>
        <Text style={s.body}><Text>Appointment ID</Text>: {record.appointmentId || "—"}</Text>
        <Text style={[s.body, { marginTop: 8 }]}><Text>Completed at</Text>: {record.completedAt ? new Date(record.completedAt).toLocaleString(language === "en" ? "en-GB" : `${language}-LK`, { timeZone: "Asia/Colombo" }) : t("Not recorded")}</Text>
      </View>)}
      {visibleCount < report.records.length && <Button title="Show more" outline onPress={() => setVisibleCount(count => count + 20)} />}
    </>}
  </Screen>;
}
