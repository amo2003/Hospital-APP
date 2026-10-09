// Google client IDs are public identifiers; never put a client secret in the app.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const plugins = (config.plugins || []).filter(
    (plugin) =>
      (Array.isArray(plugin) ? plugin[0] : plugin) !==
      "@react-native-google-signin/google-signin",
  );
  if (iosClientId?.endsWith(".apps.googleusercontent.com")) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace(".apps.googleusercontent.com", "")}`,
      },
    ]);
  }
  // Android uses autolinking and Google Console package/SHA-1 registration; no Firebase files required.
  return { ...config, plugins };
};
