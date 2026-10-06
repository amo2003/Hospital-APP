import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "../../i18n/LanguageProvider";
import { GoogleLogo } from "../../shared/icons";
import { C, s } from "../../shared/ui";
export type GoogleButtonProps = {
  onCredential: (idToken: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
};
export default function GoogleButtonView({
  onPress,
  busy,
  disabled,
}: {
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        s.inputBox,
        {
          justifyContent: "center",
          minHeight: 49,
          paddingHorizontal: 45,
          paddingVertical: 12,
          opacity: disabled || busy ? 0.6 : 1,
        },
      ]}
    >
      <View style={{ position: "absolute", left: 17 }}>
        <GoogleLogo />
      </View>
      {busy ? (
        <ActivityIndicator color={C.blue} />
      ) : (
        <Text
          style={{
            color: C.navy,
            fontSize: 14,
            fontWeight: "600",
            textAlign: "center",
            flexShrink: 1,
          }}
        >
          Continue with Google
        </Text>
      )}
    </Pressable>
  );
}
