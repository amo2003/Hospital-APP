import { useState } from "react";
import { Image, View } from "react-native";
import { Button, C, ErrorMessage } from "../shared/ui";
import { Icon } from "../shared/icons";
import { Text, useLanguage } from "../i18n/LanguageProvider";

export function PatientAvatar({
  uri,
  size = 76,
}: {
  uri?: string | null;
  size?: number;
}) {
  const { t } = useLanguage();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#073049",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={t("Profile photo")}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Icon name="user" size={size / 2} color="#fff" />
      )}
    </View>
  );
}

export default function ProfilePhotoPicker({
  value,
  onChange,
  disabled,
  onBusyChange,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
  onBusyChange: (value: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function choose() {
    if (busy || disabled) return;
    setError("");
    setBusy(true);
    onBusyChange(true);
    try {
      // Lazy-load so an older development APK can still edit text fields.
      const picker = await import("expo-image-picker");
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo.base64) throw new Error("invalid-photo");
      const bytes =
        (photo.base64.length * 3) / 4 -
        (photo.base64.endsWith("==") ? 2 : photo.base64.endsWith("=") ? 1 : 0);
      if (bytes > 5 * 1024 * 1024) {
        setError("Choose a photo smaller than 5 MB.");
        return;
      }
      // Detect the returned bytes: the native cropper may convert the original type.
      const mime = photo.base64.startsWith("/9j/")
        ? "jpeg"
        : photo.base64.startsWith("iVBORw0KGgo")
          ? "png"
          : photo.base64.startsWith("UklGR")
            ? "webp"
            : null;
      if (!mime) {
        setError("Choose a valid JPEG, PNG or WebP photo.");
        return;
      }
      onChange(`data:image/${mime};base64,${photo.base64}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        /native module|ExpoImagePicker|Cannot find native/i.test(message)
          ? "Photo selection requires an updated app build."
          : "Could not open the photo. Please try again.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <View style={{ gap: 10, marginBottom: 22 }}>
      <Button
        title={value ? "Change Photo" : "Upload Photo"}
        outline
        disabled={disabled}
        loading={busy}
        onPress={choose}
      />
      {!!value && (
        <Button
          title="Remove Photo"
          outline
          disabled={disabled || busy}
          onPress={() => {
            setError("");
            onChange(null);
          }}
        />
      )}
      <Text style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>
        JPEG, PNG or WebP. Maximum 5 MB. Save Changes to upload.
      </Text>
      <ErrorMessage message={error} />
    </View>
  );
}
