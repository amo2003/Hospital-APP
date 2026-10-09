import { useAppTheme } from "@/theme/ThemeProvider";
export function useColorScheme() { return useAppTheme().mode; }
