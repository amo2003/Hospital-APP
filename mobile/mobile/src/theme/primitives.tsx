import React, { forwardRef } from "react";
import * as RN from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import { LinearGradient as NativeGradient } from "expo-linear-gradient";
import { useAppTheme } from "./ThemeProvider";
import { themeColor, type ThemeMode } from "./palette";

export function themedStyle(style: any, mode: ThemeMode) {
  if (mode === "light" || !style) return style;
  const flat = RN.StyleSheet.flatten(style);
  if (!flat) return flat;
  const result = { ...flat };
  for (const key of Object.keys(result)) {
    if (key === "backgroundColor") result[key] = themeColor(result[key], "background", mode);
    else if (key === "color" || key === "textDecorationColor" || key === "tintColor") result[key] = themeColor(result[key], "text", mode);
    else if (/^border.*Color$/.test(key)) result[key] = themeColor(result[key], "border", mode);
  }
  return result;
}
// Explicit component adapters let existing static StyleSheets react to the shared
// context on both native and web, without mutating RN or remounting screen state.
function adapt<T extends React.ElementType>(Component: T, text = false, input = false) {
  const Adapter = forwardRef<any, React.ComponentPropsWithoutRef<T>>((props: any, ref) => {
    const { mode, colors } = useAppTheme();
    const style = typeof props.style === "function"
      ? (state: any) => themedStyle(props.style(state), mode)
      : themedStyle(props.style, mode);
    const extras: Record<string, unknown> = {};
    if (props.contentContainerStyle) extras.contentContainerStyle = themedStyle(props.contentContainerStyle, mode);
    if (input) {
      extras.placeholderTextColor = themeColor(props.placeholderTextColor || "#7b8fac", "text", mode);
      extras.keyboardAppearance = mode;
      extras.selectionColor = colors.accent;
    }
    return React.createElement(Component, { ...props, ...extras, ref,
      style: text ? [{ color: colors.text }, style] : style });
  });
  Adapter.displayName = `Themed(${typeof Component === "string" ? Component : (Component as any).displayName || "View"})`;
  return Adapter;
}
export const View = adapt(RN.View);
export const Text = adapt(RN.Text, true);
export const TextInput = adapt(RN.TextInput, true, true);
export const ScrollView = adapt(RN.ScrollView);
export const Pressable = adapt(RN.Pressable);
export const TouchableOpacity = adapt(RN.TouchableOpacity);
export const TouchableHighlight = adapt(RN.TouchableHighlight);
export const KeyboardAvoidingView = adapt(RN.KeyboardAvoidingView);
export const SafeAreaView = adapt(NativeSafeAreaView);
export const Animated = { ...RN.Animated, View: RN.Animated.createAnimatedComponent(View) };
export function LinearGradient(props: React.ComponentProps<typeof NativeGradient>) {
  const { mode } = useAppTheme();
  return <NativeGradient {...props} style={themedStyle(props.style, mode)}
    colors={[themeColor(props.colors[0], "background", mode), themeColor(props.colors[1], "background", mode), ...props.colors.slice(2).map((color) => themeColor(color, "background", mode))]} />;
}
