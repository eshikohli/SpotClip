import Constants from "expo-constants";

const FALLBACK_HOST = "localhost";
const API_PORT = 3001;

function getDevHost(): string {
  try {
    const expoConfig = (Constants as any).expoConfig;
    const manifest = (Constants as any).manifest;
    const manifest2 = (Constants as any).manifest2;

    const hostUri: string | undefined =
      expoConfig?.hostUri ??
      manifest?.debuggerHost ??
      manifest2?.extra?.expoGo?.debuggerHost;

    if (typeof hostUri === "string" && hostUri.length > 0) {
      const host = hostUri.split(":")[0];
      if (host) return host;
    }
  } catch {
    // ignore and fall back
  }

  return FALLBACK_HOST;
}

const DEV_BASE_URL = `http://${getDevHost()}:${API_PORT}`;

// For production, replace PROD_BASE_URL with your deployed API URL
const PROD_BASE_URL = "http://localhost:3001";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? DEV_BASE_URL : PROD_BASE_URL);

