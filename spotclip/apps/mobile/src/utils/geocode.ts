import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Coords {
  latitude: number;
  longitude: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_PREFIX = "geocache:";

function cacheKey(name: string, city: string, address?: string | null): string {
  // Address-based key is more precise and avoids stale name+city misses
  if (address?.trim()) {
    return `${CACHE_PREFIX}addr:${address.trim().toLowerCase()}`;
  }
  return `${CACHE_PREFIX}${name.trim().toLowerCase()}:${city.trim().toLowerCase()}`;
}

export async function geocodePlace(
  name: string,
  city: string,
  address?: string | null,
): Promise<Coords | null> {
  const key = cacheKey(name, city, address);

  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached !== null) {
      return JSON.parse(cached) as Coords;
    }
  } catch {
    // Cache read failure is non-fatal
  }

  // Prefer address when available — much more precise than "name city"
  const effectiveCity = city?.trim().toLowerCase() === "unknown" ? "" : city?.trim();
  const searchQuery = address?.trim()
    ? address.trim()
    : effectiveCity
    ? `${name} ${effectiveCity}`
    : name;

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SpotClip/1.0 (eshi.kohli@gmail.com)",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const coords: Coords = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };

    AsyncStorage.setItem(key, JSON.stringify(coords)).catch(() => {});

    return coords;
  } catch {
    return null;
  }
}

export async function geocodeCity(query: string): Promise<Coords | null> {
  const key = `${CACHE_PREFIX}city:${query.trim().toLowerCase()}`;

  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached !== null) {
      return JSON.parse(cached) as Coords;
    }
  } catch {
    // Cache read failure is non-fatal
  }

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query.trim())}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SpotClip/1.0 (eshi.kohli@gmail.com)" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const coords: Coords = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };

    AsyncStorage.setItem(key, JSON.stringify(coords)).catch(() => {});

    return coords;
  } catch {
    return null;
  }
}
