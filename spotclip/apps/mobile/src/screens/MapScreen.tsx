import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import type { ExtractedPlace } from "@spotclip/shared";
import { getCollections } from "../api";
import { geocodePlace, type Coords } from "../utils/geocode";

interface PlaceWithCoords extends ExtractedPlace {
  coords: Coords;
}

interface PinGroup {
  coords: Coords;
  places: ExtractedPlace[];
}

const INITIAL_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

export function MapScreen() {
  const [pinGroups, setPinGroups] = useState<PinGroup[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Request location permission — non-blocking, map works without it
      Location.requestForegroundPermissionsAsync().then(({ status: permStatus }) => {
        if (permStatus === "granted") {
          Location.getCurrentPositionAsync({}).then((loc) => {
            if (!cancelled) {
              setUserLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
            }
          }).catch(() => {});
        }
      });

      // Fetch all collections and gather unique places
      let allPlaces: ExtractedPlace[] = [];
      try {
        const data = await getCollections();
        const seen = new Set<string>();
        for (const col of data.collections) {
          for (const place of col.places) {
            if (!seen.has(place.id)) {
              seen.add(place.id);
              allPlaces.push(place);
            }
          }
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }

      if (cancelled) return;

      setProgress({ done: 0, total: allPlaces.length, failed: 0 });

      // Geocode sequentially to respect Nominatim's rate limit
      const resolved: PlaceWithCoords[] = [];
      let failed = 0;

      for (const place of allPlaces) {
        if (cancelled) return;

        const coords = await geocodePlace(place.name, place.city_guess);

        if (coords) {
          resolved.push({ ...place, coords });
        } else {
          failed++;
        }

        if (!cancelled) {
          setProgress((p) => ({ ...p, done: p.done + 1, failed }));
        }

        // Polite delay for Nominatim (cached results return instantly, so this
        // only adds noticeable delay for fresh network requests)
        await new Promise((r) => setTimeout(r, 250));
      }

      if (cancelled) return;

      // Group places that share the same coordinates into a single pin
      const groupMap = new Map<string, PinGroup>();
      for (const p of resolved) {
        const key = `${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`;
        const existing = groupMap.get(key);
        if (existing) {
          existing.places.push(p);
        } else {
          groupMap.set(key, { coords: p.coords, places: [p] });
        }
      }

      setPinGroups(Array.from(groupMap.values()));
      setStatus("ready");
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (status === "loading") {
    const pct =
      progress.total > 0
        ? Math.round((progress.done / progress.total) * 100)
        : 0;
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>
          {progress.total === 0
            ? "Loading places…"
            : `Locating places… ${pct}%`}
        </Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load places.</Text>
        <Text style={styles.errorSub}>Check your connection and try again.</Text>
      </View>
    );
  }

  function goToMyLocation() {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        400,
      );
    }
  }

  const totalShown = pinGroups.reduce((sum, g) => sum + g.places.length, 0);
  const totalPlaces = progress.total;
  const missing = totalPlaces - totalShown;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={
          userLocation
            ? { ...userLocation, latitudeDelta: 0.1, longitudeDelta: 0.1 }
            : INITIAL_REGION
        }
        showsUserLocation={userLocation !== null}
        showsMyLocationButton={userLocation !== null}
      >
        {pinGroups.map((group, idx) => {
          const isGroup = group.places.length > 1;
          const title = isGroup
            ? `${group.places.length} places`
            : group.places[0].name;
          const subtitle = isGroup
            ? group.places.map((p) => p.name).join(", ")
            : group.places[0].city_guess;

          return (
            <Marker key={idx} coordinate={group.coords} pinColor="#4f46e5">
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{title}</Text>
                  <Text style={styles.calloutSub} numberOfLines={3}>
                    {subtitle}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {userLocation && (
        <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation}>
          <Text style={styles.myLocationIcon}>⦿</Text>
        </TouchableOpacity>
      )}

      {missing > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {totalShown} of {totalPlaces} places shown
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fafafa",
  },
  loadingText: { marginTop: 12, fontSize: 15, color: "#666" },
  errorText: { fontSize: 18, color: "#999", marginBottom: 8 },
  errorSub: { fontSize: 14, color: "#bbb", textAlign: "center" },
  callout: { width: 200, padding: 10 },
  calloutTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  calloutSub: { fontSize: 13, color: "#666", marginTop: 4 },
  myLocationBtn: {
    position: "absolute",
    bottom: 80,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  myLocationIcon: {
    fontSize: 22,
    color: "#4f46e5",
    lineHeight: 24,
  },
  badge: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { color: "#fff", fontSize: 13 },
});
