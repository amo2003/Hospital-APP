import { useId } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Image, Path } from "react-native-svg";

export function BottomLeaves({ style }: { style: StyleProp<ViewStyle> }) {
  const clipId = `leaf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View style={style} pointerEvents="none" accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 752 1024">
        <Defs>
          <ClipPath id={clipId}>
            {/* Exclude the stray export mark in the empty upper-left corner. */}
            <Path d="M90 0H752V1024H0V200H90Z" />
          </ClipPath>
        </Defs>
        <Image
          href={require("../../../../assets/images/leaves-bottom.png")}
          width={752}
          height={1024}
          clipPath={`url(#${clipId})`}
        />
      </Svg>
    </View>
  );
}
