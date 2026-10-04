import React, { createContext, useContext, useState } from "react";
import { Storage } from "@/utils/storage";
import { nurseApi } from "./api";
import type { Nurse } from "./types";

type NurseSession = {
  nurse: Nurse | null;
  setNurse: (nurse: Nurse | null) => void;
  signIn: (token: string, nurse: Nurse) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<NurseSession | null>(null);

export function NurseProvider({ children }: { children: React.ReactNode }) {
  const [nurse, setNurse] = useState<Nurse | null>(null);
  async function signIn(token: string, account: Nurse) {
    await Storage.setNurseSession(token);
    setNurse(account);
  }
  async function signOut() {
    try {
      await nurseApi.logout();
    } finally {
      await Storage.clearNurseSession();
      setNurse(null);
    }
  }
  return <Context.Provider value={{ nurse, setNurse, signIn, signOut }}>{children}</Context.Provider>;
}

export function useNurse() {
  const value = useContext(Context);
  if (!value) throw new Error("NurseProvider is required.");
  return value;
}
