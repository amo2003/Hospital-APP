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
import { nurseTranslations } from "../../nurse/translations";
import { queueTranslations } from "../../queue-notification/translations";
import { profileTranslations } from "../profile/translations";
const dictionary = {
  ...translations,
  ...nurseTranslations,
  ...queueTranslations,
  ...profileTranslations,
};
export type Language = "en" | "si" | "ta";
const KEY = "@careplus/language";
type ContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (text: string, values?: Record<string, string | number>) => string;
};
const Context = createContext<ContextValue>({
  language: "en",
  setLanguage: async () => {},
  t: (value) => value,
});
export function translate(text: string, language: Language): string {
  if (language === "en") return text;
  const key = text.replace(/\s+/g, " ").trim();
  const value = dictionary[key]?.[language === "si" ? 0 : 1];
  if (value)
    return `${/^\s/.test(text) ? " " : ""}${value}${/\s$/.test(text) ? " " : ""}`;
  if (key.startsWith("Patient ID: "))
    return `${translate("Patient ID:", language)} ${key.slice(12)}`;
  if (key.startsWith("Nurse ID: "))
    return `${translate("Nurse ID:", language)} ${key.slice(10)}`;
  if (key.startsWith("● ")) return `● ${translate(key.slice(2), language)}`;
  // Match only known UI phrases; do not translate arbitrary names or clinical notes.
  const patterns: [
    RegExp,
    (match: RegExpMatchArray) => readonly [string, string],
  ][] = [
    [
      /^(\d+) Patients Waiting$/,
      (m) => [
        `රෝගීන් ${m[1]} ක් බලා සිටී`,
        `${m[1]} நோயாளர்கள் காத்திருக்கின்றனர்`,
      ],
    ],
    [/^(\d+) patients$/, (m) => [`රෝගීන් ${m[1]}`, `${m[1]} நோயாளர்கள்`]],
    [
      /^(\d+) patients found$/,
      (m) => [
        `රෝගීන් ${m[1]} ක් හමු විය`,
        `${m[1]} நோயாளர்கள் கண்டறியப்பட்டனர்`,
      ],
    ],
    [
      /^Queue Position: #(\d+)$/,
      (m) => [`පෝලිමේ ස්ථානය: #${m[1]}`, `வரிசை நிலை: #${m[1]}`],
    ],
    [
      /^Now serving token ([\w-]+)$/,
      (m) => [
        `දැන් සේවය ලබන ටෝකනය ${m[1]}`,
        `தற்போது சேவை பெறும் டோக்கன் ${m[1]}`,
      ],
    ],
    [
      /^Avg\. wait time: (\d+) mins$/,
      (m) => [
        `සාමාන්‍ය රැඳී සිටීම: මිනිත්තු ${m[1]}`,
        `சராசரிக் காத்திருப்பு: ${m[1]} நிமிடங்கள்`,
      ],
    ],
    [
      /^(\d+)m ago$/,
      (m) => [`මිනිත්තු ${m[1]} කට පෙර`, `${m[1]} நிமிடங்களுக்கு முன்`],
    ],
    [/^(\d+) yrs$/, (m) => [`අවුරුදු ${m[1]}`, `${m[1]} வயது`]],
    [
      /^No (waiting|serving|completed|cancelled) patients$/,
      (m) => [
        `${translate(m[1], language)} රෝගීන් නොමැත`,
        `${translate(m[1], language)} நோயாளர்கள் இல்லை`,
      ],
    ],
    [
      /^(\d+) patients ahead$/,
      (m) => [`ඉදිරියෙන් රෝගීන් ${m[1]}`, `முன்னால் ${m[1]} நோயாளர்கள்`],
    ],
    [
      /^(\d+) (minutes|min)$/,
      (m) => [`මිනිත්තු ${m[1]}`, `${m[1]} நிமிடங்கள்`],
    ],
    [/^Token ([\w-]+)$/, (m) => [`ටෝකනය ${m[1]}`, `டோக்கன் ${m[1]}`]],
  ];
  for (const [pattern, format] of patterns) {
    const match = key.match(pattern);
    if (match) return format(match)[language === "si" ? 0 : 1];
  }
  if (
    /^(fullName|nic|dateOfBirth|gender|phone|email|address|district|username|password|acceptedTerms|code|department|ward|confirmPassword):/.test(
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
      value={{
        language,
        setLanguage,
        t: (text, values) =>
          translate(text, language).replace(
            /\{(\w+)\}/g,
            (match, name: string) =>
              values?.[name] === undefined ? match : String(values[name]),
          ),
      }}
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
