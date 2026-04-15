import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Coords {
  latitude: number;
  longitude: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_PREFIX = "geocache:";

function cacheKey(name: string, city: string): string {
  return `${CACHE_PREFIX}${name.trim().toLowerCase()}:${city.trim().toLowerCase()}`;
}

export async function geocodePlace(
  name: string,
  city: string,
): Promise<Coords | null> {
  const key = cacheKey(name, city);

  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached !== null) {
      return JSON.parse(cached) as Coords;
    }
  } catch {
    // Cache read failure is non-fatal
  }

  try {
    const query = encodeURIComponent(`${name} ${city}`);
    const url = `${NOMINATIM_URL}?q=${query}&format=json&limit=1`;
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
