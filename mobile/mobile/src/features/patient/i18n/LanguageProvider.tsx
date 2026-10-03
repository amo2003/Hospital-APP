import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Text as NativeText, type TextProps } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations } from "./translations";
export type Language = "en" | "si" | "ta";
const KEY = "@careplus/language";
type ContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (text: string) => string;
};
const Context = createContext<ContextValue>({
  language: "en",
  setLanguage: async () => {},
  t: (value) => value,
});
export function translate(text: string, language: Language): string {
  if (language === "en") return text;
  const key = text.replace(/\s+/g, " ").trim();
  const value = translations[key]?.[language === "si" ? 0 : 1];
  if (value)
    return `${/^\s/.test(text) ? " " : ""}${value}${/\s$/.test(text) ? " " : ""}`;
  if (key.startsWith("Patient ID: "))
    return `${translate("Patient ID:", language)} ${key.slice(12)}`;
  if (
    /^(fullName|nic|dateOfBirth|gender|phone|email|address|district|username|password|acceptedTerms|code):/.test(
      key,
    )
  )
    return translate("Please check the entered details.", language);
  // Localize dates/times and schedule lists, not arbitrary personal names or identifiers.
  if (
    /^(?:\d|Sun|Mon|Tue|Wed|Thu|Fri|Sat|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(
      key,
    ) &&
    /^[A-Za-z\d\s,:|/.-]+$/.test(key)
  ) {
    return text.replace(
      /\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Wed|Thu|Fri|Sat|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|AM|PM)\b/g,
      (word) => translations[word]?.[language === "si" ? 0 : 1] || word,
    );
  }
  return text;
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>("en");
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === "si" || saved === "ta" || saved === "en") update(saved);
      })
      .catch(() => {});
  }, []);
  async function setLanguage(value: Language) {
    await AsyncStorage.setItem(KEY, value);
    update(value);
  }
  return (
    <Context.Provider
      value={{ language, setLanguage, t: (text) => translate(text, language) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function Text({
  children,
  translate: shouldTranslate = true,
  ...props
}: TextProps & { translate?: boolean }) {
  const { t } = useLanguage();
  // Merge adjacent text fragments so complete phrases are translated together.
  const parts: ReactNode[] = [];
  let buffer = "";
  React.Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number")
      buffer += String(child);
    else {
      if (buffer) {
        parts.push(shouldTranslate ? t(buffer) : buffer);
        buffer = "";
      }
      parts.push(child);
    }
  });
  if (buffer) parts.push(shouldTranslate ? t(buffer) : buffer);
  return <NativeText {...props}>{React.Children.toArray(parts)}</NativeText>;
}
