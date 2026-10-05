// Legacy names retained for other group members.

import { Image } from "react-native";
import { assets } from "@/features/patient/shared/ui";
export function TopLeftLeaves() {
  return (
    <Image
      source={assets.top}
      resizeMode="contain"
      style={{
        position: "absolute",
        top: 20,
        left: 0,
        width: "68%",
        height: "33%",
      }}
    />
  );
}
export function BottomRightLeaves() {
  return (
    <Image
      source={assets.bottom}
      resizeMode="contain"
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: "60%",
        height: "38%",
      }}
    />
  );
}

export { Wave as BottomWave } from "@/features/patient/shared/ui";
