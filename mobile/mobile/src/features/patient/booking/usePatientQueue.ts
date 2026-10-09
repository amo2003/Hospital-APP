import { useCallback, useState } from "react";
import { AppState } from 'react-native';

import { useFocusEffect } from "expo-router";
import { api, messageOf } from "../shared/api";
import type { PatientQueue } from "../shared/types";

export function countdown(startsAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(startsAt) - now) / 1000));
  if (!Number.isFinite(seconds)) return "--";
  const hours = Math.floor(seconds / 3600);
  return `${String(hours).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function usePatientQueue(appointmentId?: string) {
  const [queue, setQueue] = useState<PatientQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let pending = false;
      let offset = 0;
      async function refresh() {
        if (
          pending ||
          (AppState.currentState && AppState.currentState !== "active")
        )
          return;
        pending = true;
        try {
          const result = await api.queue(appointmentId);
          if (!active) return;
          offset = result ? Date.parse(result.serverTime) - Date.now() : 0;
          setQueue(result);
          setNow(Date.now() + offset);
          setError("");
        } catch (e) {
          if (active) setError(messageOf(e));
        } finally {
          pending = false;
          if (active) setLoading(false);
        }
      }
      setQueue(null);
      setLoading(true);
      setError("");
      void refresh();
      const poll = setInterval(() => void refresh(), 15000);
      const tick = setInterval(() => {
        if (!AppState.currentState || AppState.currentState === "active")
          setNow(Date.now() + offset);
      }, 1000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => {
        active = false;
        clearInterval(poll);
        clearInterval(tick);
        subscription.remove();
      };
      // Retry intentionally restarts the focused subscription.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appointmentId, retry]),
  );
  return {
    queue,
    loading,
    error,
    retry: () => setRetry((v) => v + 1),
    waiting: queue?.startsAt ? countdown(queue.startsAt, now) : "--",
    started: queue?.startsAt ? now >= Date.parse(queue.startsAt) : false,
  };
}
