import { useAppTheme } from "@/theme/ThemeProvider";
import { themeColor } from "@/theme/palette";
import Svg, { Path, Circle, Rect } from "react-native-svg";
export type IconName =
  | "user"
  | "lock"
  | "eye"
  | "mail"
  | "phone"
  | "pin"
  | "calendar"
  | "home"
  | "bell"
  | "clock"
  | "back"
  | "arrow"
  | "chevron"
  | "check"
  | "menu"
  | "search"
  | "id"
  | "cross"
  | "edit"
  | "logout"
  | "settings"
  | "globe"
  | "info"
  | "close"
  | "more";
const paths: Record<IconName, string> = {
  user: "M5 21v-3a7 7 0 0 1 14 0v3 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  lock: "M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  mail: "M3 5h18v14H3z M3 6l9 7 9-7",
  phone:
    "M5 3l4 4-2 3c2 3 4 5 7 7l3-2 4 4c-1 4-5 3-8 1C7 17 2 11 3 6z M14 3a8 8 0 0 1 7 7 M14 7a4 4 0 0 1 3 3",
  pin: "M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 1 1 14 0 M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  calendar: "M4 5h16v16H4z M4 10h16 M8 2v5 M16 2v5 M8 15l3 3 5-5",
  home: "M2 11L12 2l10 9 M5 9v12h5v-7h4v7h5V9",
  bell: "M4 17h16l-2-4V9a6 6 0 0 0-12 0v4z M10 21h4",
  clock: "M12 3a9 9 0 1 1-7 3 M3 3v5h5 M12 7v5l4 2",
  back: "M15 4l-8 8 8 8",
  arrow: "M3 12h18 M14 5l7 7-7 7",
  chevron: "M5 9l7 7 7-7",
  check: "M4 12l5 5L21 5",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  search: "M16 16l6 6 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  id: "M3 4h18v16H3z M7 8h3v4H7z M14 8h4 M14 12h4 M7 16h11",
  cross: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  edit: "M3 16L16 3l5 5L8 21H3z M13 6l5 5",
  logout: "M14 17l5-5-5-5 M19 12H8 M4 4v16",
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 M12 3c5 5 5 13 0 18",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7h.01",
  close: "M6 6l12 12 M18 6L6 18",
  more: "",
};
export function Icon({
  name,
  size = 22,
  color = "#086ab9",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { mode } = useAppTheme();
  color = themeColor(color, "text", mode);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "more" ? (
        [5, 12, 19].map((cy) => (
          <Circle key={cy} cx={12} cy={cy} r={1.5} fill={color} />
        ))
      ) : (
        <Path d={paths[name]} />
      )}
    </Svg>
  );
}
export function HeartMark({
  size = 220,
  opacity = 1,
}: {
  size?: number;
  opacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 220" opacity={opacity}>
      <Path
        d="M120 210C82 187 8 125 8 66 8 6 80-14 120 29 160-14 232 6 232 66c0 59-74 121-112 144"
        fill="#28a8f7"
      />
      <Path
        d="M8 92c46 8 76 32 100 100C57 172 23 132 8 92 M232 92c-46 8-76 32-100 100 51-20 85-60 100-100"
        fill="#0d3561"
      />
      <Rect x={102} y={43} width={36} height={95} rx={5} fill="white" />
      <Rect x={72} y={72} width={96} height={36} rx={5} fill="white" />
    </Svg>
  );
}

export function GoogleLogo({ size = 25 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      accessibilityLabel="Google"
    >
      <Path
        fill="#4285F4"
        d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.13h6.61c3.87-3.56 6.08-8.8 6.08-14.81Z"
      />
      <Path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.82 13.46-4.93l-6.61-5.13c-1.83 1.22-4.17 1.96-6.85 1.96-5.3 0-9.8-3.57-11.4-8.39H5.78v5.29A20 20 0 0 0 24 44Z"
      />
      <Path
        fill="#FBBC05"
        d="M12.6 27.51a12 12 0 0 1 0-7.02V15.2H5.78a20 20 0 0 0 0 17.6l6.82-5.29Z"
      />
      <Path
        fill="#EA4335"
        d="M24 12.1c3 0 5.68 1.03 7.8 3.05l5.85-5.85C34.11 5.99 29.51 4 24 4A20 20 0 0 0 5.78 15.2l6.82 5.29c1.6-4.82 6.1-8.39 11.4-8.39Z"
      />
    </Svg>
  );
}
