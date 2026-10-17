import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { nurseApi, nurseMessageOf } from "./api";
import type { NurseQueueEntry } from "./types";

// Refresh while this screen is visible, without overlapping requests or updating
// an old date after navigation. Pause while a queue action is being submitted.
export function useNurseQueue(date?: string, revision = 0, paused = false) {
  const [entries, setEntries] = useState<NurseQueueEntry[]>([]);
  const [upcomingDates, setUpcomingDates] = useState<{ date: string; count: number }[]>([]);
  const [queueDate, setQueueDate] = useState("");
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    if (paused) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const result = await nurseApi.queue(date, true);
        if (!active) return;
        setEntries(result.entries);
        setQueueDate(result.date);
        setToday(result.today);
        setUpcomingDates(result.upcomingDates || []);
        setError("");
      } catch (reason) {
        if (active) setError(nurseMessageOf(reason));
      } finally {
        if (active) {
          setLoading(false);
          timer = setTimeout(() => void refresh(false), 8000);
        }
      }
    }
    void refresh(true);
    return () => { active = false; clearTimeout(timer); };
    // revision explicitly restarts the subscription when Refresh is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, revision, paused]));
  return { entries, setEntries, upcomingDates, queueDate, today, loading, error, setError };
}
