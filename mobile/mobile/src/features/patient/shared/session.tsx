import React, { createContext, useContext, useState } from "react";
import { Storage } from "@/utils/storage";
import { api } from "./api";
import type { Patient } from "./types";
type Session = {
  patient: Patient | null;
  setPatient: (patient: Patient | null) => void;
  signIn: (token: string, patient: Patient) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  async function signIn(token: string, user: Patient) {
    await Storage.setSession(token, user.id);
    setPatient(user);
  }
  async function signOut() {
    try {
      await api.logout();
    } finally {
      await Storage.clearSession();
      setPatient(null);
    }
  }
  return (
    <Context.Provider value={{ patient, setPatient, signIn, signOut }}>
      {children}
    </Context.Provider>
  );
}
export function usePatient() {
  const value = useContext(Context);
  if (!value) throw new Error("PatientProvider is required.");
  return value;
}
