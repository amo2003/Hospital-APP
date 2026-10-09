import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Appearance, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { palettes, type ThemeMode } from "./palette";

export const THEME_KEY = "@careplus/theme";
const Context = createContext({ mode: "light" as ThemeMode, colors: palettes.light, ready: false, setMode: async (_mode: ThemeMode) => {} });
export const useAppTheme = () => useContext(Context);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, update] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (active && (saved === "light" || saved === "dark")) update(saved);
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") {
      document.documentElement.style.colorScheme = mode;
      document.body.style.backgroundColor = palettes[mode].canvas;
    } else {
      Appearance.setColorScheme(mode);
      void SystemUI.setBackgroundColorAsync(palettes[mode].background).catch(() => {});
    }
  }, [mode]);
  async function setMode(next: ThemeMode) {
    // Commit storage first; report failures through the selector without losing the previous preference.
    await AsyncStorage.setItem(THEME_KEY, next);
    update(next);
  }
  return <Context.Provider value={{ mode, colors: palettes[mode], ready, setMode }}>{children}</Context.Provider>;
}
