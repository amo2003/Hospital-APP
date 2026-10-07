import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLanguage } from "../../i18n/LanguageProvider";
import GoogleButtonView, { type GoogleButtonProps } from "./GoogleButtonView";
import { messageOf } from "../../shared/api";
import { C } from "../../shared/ui";

type GoogleIdentityAPI = {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
    ux_mode: string;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type: string;
      theme: string;
      size: string;
      text: string;
      shape: string;
      width: number;
      locale: string;
    },
  ) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityAPI } };
  }
}
let loadPromise: Promise<GoogleIdentityAPI> | undefined;
function loadGoogle() {
  if (window.google?.accounts.id)
    return Promise.resolve(window.google.accounts.id);
  if (!loadPromise)
    loadPromise = new Promise<GoogleIdentityAPI>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      const timer = setTimeout(() => {
        script.remove();
        reject(
          new Error(
            "Google could not be loaded. Check your connection and try again.",
          ),
        );
      }, 15000);
      script.onload = () => {
        clearTimeout(timer);
        if (window.google?.accounts.id) resolve(window.google.accounts.id);
        else reject(new Error("Google sign-in could not be loaded."));
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(
          new Error(
            "Google could not be loaded. Check your connection and try again.",
          ),
        );
      };
      document.head.appendChild(script);
    }).catch((error) => {
      loadPromise = undefined;
      throw error;
    });
  return loadPromise;
}
export default function GoogleSignInButton({
  onCredential,
  onError,
  disabled,
}: GoogleButtonProps) {
  const host = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const handlers = useRef({ onCredential, onError, disabled });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { language } = useLanguage();
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  useEffect(() => {
    handlers.current = { onCredential, onError, disabled };
  }, [onCredential, onError, disabled]);
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    loadGoogle()
      .then((google) => {
        if (!active || !host.current) return;
        google.initialize({
          client_id: clientId,
          auto_select: false,
          ux_mode: "popup",
          callback: (response) => {
            if (!active || handlers.current.disabled || inFlight.current)
              return;
            inFlight.current = true;
            setBusy(true);
            handlers.current.onError("");
            Promise.resolve()
              .then(() => {
                if (!response.credential)
                  throw new Error("Google sign-in could not be completed.");
                return handlers.current.onCredential(response.credential);
              })
              .catch((error) => {
                if (active) handlers.current.onError(messageOf(error));
              })
              .finally(() => {
                inFlight.current = false;
                if (active) setBusy(false);
              });
          },
        });
        host.current.replaceChildren();
        google.renderButton(host.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: Math.min(360, host.current.clientWidth || 300),
          locale: language,
        });
      })
      .catch((error) => {
        if (active) {
          setFailed(true);
          handlers.current.onError(messageOf(error));
        }
      });
    return () => {
      active = false;
    };
  }, [clientId, language, attempt]);
  if (!clientId)
    return (
      <GoogleButtonView
        disabled={disabled}
        onPress={() =>
          onError(
            "Google sign-in is not configured yet. Please use email or phone.",
          )
        }
      />
    );
  return (
    <View style={{ minHeight: 49, alignItems: "center" }}>
      <div
        ref={host}
        style={{
          width: "100%",
          display: failed ? "none" : "flex",
          justifyContent: "center",
          pointerEvents: busy || disabled ? "none" : "auto",
          opacity: busy || disabled ? 0.5 : 1,
        }}
      />
      {busy && <ActivityIndicator color={C.blue} />}
      {failed && (
        <GoogleButtonView
          onPress={() => {
            setFailed(false);
            onError("");
            setAttempt((value) => value + 1);
          }}
        />
      )}
    </View>
  );
}
