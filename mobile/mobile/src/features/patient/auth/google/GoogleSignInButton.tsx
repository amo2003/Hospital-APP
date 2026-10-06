import { useRef, useState } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import GoogleButtonView, { type GoogleButtonProps } from "./GoogleButtonView";
import { messageOf } from "../../shared/api";

export default function GoogleSignInButton({
  onCredential,
  onError,
  disabled,
}: GoogleButtonProps) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function signIn() {
    if (inFlight.current) return;
    onError("");
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      onError(
        "Google sign-in requires the CarePlus development build or APK. It is not available in Expo Go.",
      );
      return;
    }
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
    if (!webClientId || (Platform.OS === "ios" && !iosClientId)) {
      onError(
        "Google sign-in is not configured yet. Please use email or phone.",
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      // Keep the module unloaded in Expo Go, where its native implementation is absent.
      // @ts-ignore
      const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
        // @ts-ignore
        await import("@react-native-google-signin/google-signin");
      try {
        GoogleSignin.configure({
          webClientId,
          iosClientId,
          offlineAccess: false,
        });
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
        // Always allow another account after logout or cancelled onboarding.
        if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return;
        if (!response.data.idToken)
          throw new Error(
            "Google did not return an identity token. Check the OAuth configuration.",
          );
        await onCredential(response.data.idToken);
      } catch (error: any) {
        if (isErrorWithCode(error)) {
          if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
          if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
            throw new Error(
              "Update Google Play Services to use Google sign-in.",
            );
          if (error.code === statusCodes.IN_PROGRESS) return;
          if (error.code === "10")
            throw new Error(
              "Google sign-in configuration does not match this app. Check the Android package, signing SHA-1, and web client ID.",
            );
        }
        throw error;
      }
    } catch (error) {
      onError(messageOf(error));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return <GoogleButtonView onPress={signIn} busy={busy} disabled={disabled} />;
}
