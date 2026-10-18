type ApiLocation = {
  configured?: string;
  development: boolean;
  metroHost?: string;
  browserHost?: string;
};

function localHost(host: string) {
  if (host === "localhost" || host === "[::1]") return true;
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

function parseUrl(value?: string) {
  try { return value ? new URL(value) : undefined; } catch { return undefined; }
}

export function resolveApiUrl({ configured, development, metroHost, browserHost }: ApiLocation): string | undefined {
  const setting = configured?.trim().replace(/\/+$/, "");
  const explicit = setting && setting !== "auto" && !setting.includes("YOUR_") ? parseUrl(setting) : undefined;
  const valid = explicit && ["http:", "https:"].includes(explicit.protocol) ? explicit : undefined;
  if (!development) return valid ? setting : undefined;

  // Hosted APIs stay explicit. Only local development follows the Metro/browser
  // machine after a network change. Never mistake an Expo tunnel for an API.
  if (valid && !localHost(valid.hostname)) return setting;
  const metro = parseUrl(metroHost?.includes("://") ? metroHost : metroHost ? `http://${metroHost}` : undefined);
  const host = browserHost || metro?.hostname;
  if (!host || !localHost(host)) return valid ? setting : undefined;
  const url = valid || new URL("http://localhost:4000/api");
  url.hostname = host;
  return url.toString().replace(/\/+$/, "");
}
