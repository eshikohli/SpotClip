import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import MapView from "react-native-maps";
import { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import type { ExtractedPlace } from "@spotclip/shared";
import { getCollections } from "../api";
import { geocodePlace, geocodeCity, type Coords } from "../utils/geocode";
import { PlaceBottomSheet, type PlaceWithCoords } from "../components/PlaceBottomSheet";
import { NearMeBottomSheet } from "../components/NearMeBottomSheet";
import { getNearbySpots, type NearbyPlace } from "../utils/nearbySpots";

const INITIAL_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

interface Props {
  isActive: boolean;
}

export function MapScreen({ isActive }: Props) {
  const [places, setPlaces] = useState<PlaceWithCoords[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithCoords | null>(null);
  const [nearMeVisible, setNearMeVisible] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearbySpots, setNearbySpots] = useState<NearbyPlace[]>([]);
  const mapRef = useRef<MapView>(null);

  // Track which place IDs have already been geocoded so re-focusing the tab
  // only processes newly-added places instead of reloading everything.
  const geocodedIds = useRef(new Set<string>());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Request location permission once on mount — non-blocking
    Location.requestForegroundPermissionsAsync().then(({ status: permStatus }) => {
      if (permStatus === "granted") {
        Location.getCurrentPositionAsync({})
          .then((loc) => {
            setUserLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          })
          .catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;

    async function load() {
      // Fetch all collections and gather unique places (preserving collectionId)
      let allPlaces: (ExtractedPlace & { collectionId: string })[] = [];
      try {
        const data = await getCollections();
        const seen = new Set<string>();
        for (const col of data.collections) {
          for (const place of col.places) {
            if (!seen.has(place.id)) {
              seen.add(place.id);
              allPlaces.push({ ...place, collectionId: col.id });
            }
          }
        }
      } catch {
        if (!cancelled && !initialLoadDone.current) setStatus("error");
        return;
      }

      if (cancelled) return;

      // Only geocode places we haven't processed yet
      const newPlaces = allPlaces.filter((p) => !geocodedIds.current.has(p.id));

      if (newPlaces.length === 0) {
        if (!initialLoadDone.current) {
          setStatus("ready");
          initialLoadDone.current = true;
        }
        return;
      }

      if (!initialLoadDone.current) {
        setProgress({ done: 0, total: newPlaces.length, failed: 0 });
      }

      // Geocode sequentially to respect Nominatim's rate limit
      const resolved: PlaceWithCoords[] = [];
      let failed = 0;

      for (const place of newPlaces) {
        if (cancelled) return;

        const coords = await geocodePlace(place.name, place.city_guess, place.address);
        geocodedIds.current.add(place.id);

        if (coords) {
          resolved.push({ ...place, coords });
        } else {
          failed++;
        }

        if (!cancelled && !initialLoadDone.current) {
          setProgress((p) => ({ ...p, done: p.done + 1, failed }));
        }

        // Polite delay for Nominatim (cached results return instantly, so this
        // only adds noticeable delay for fresh network requests)
        await new Promise((r) => setTimeout(r, 250));
      }

      if (cancelled) return;

      setPlaces((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const brandNew = resolved.filter((p) => !existingIds.has(p.id));
        return brandNew.length > 0 ? [...prev, ...brandNew] : prev;
      });

      if (!initialLoadDone.current) {
        setStatus("ready");
        initialLoadDone.current = true;
      }
    }

    load();
      return () => {
        cancelled = true;
      };
  }, [isActive]);

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

  async function handleCitySearch() {
    const query = searchText.trim();
    if (!query || searching) return;
    setSearching(true);
    setNotFound(false);
    const coords = await geocodeCity(query);
    setSearching(false);
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...coords, latitudeDelta: 0.2, longitudeDelta: 0.2 },
        600,
      );
    } else if (!coords) {
      setNotFound(true);
      setTimeout(() => setNotFound(false), 2500);
    }
  }

  function goToMyLocation() {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        400,
      );
    }
  }

  async function handleNearMe() {
    if (nearMeLoading) return;

    setNearMeLoading(true);
    setNearMeVisible(true);

    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") {
      setNearMeLoading(false);
      setNearMeVisible(false);
      Alert.alert("Location needed", "Enable location access to use Near Me.");
      return;
    }

    let coords: Coords;
    try {
      const loc = await Location.getCurrentPositionAsync({});
      coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
    } catch {
      setNearMeLoading(false);
      setNearMeVisible(false);
      Alert.alert("Location unavailable", "Could not get your current location.");
      return;
    }

    const nearby = getNearbySpots(places, coords);
    setNearbySpots(nearby);
    setNearMeLoading(false);

    if (nearby.length > 0 && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...coords, latitudeDelta: 0.08, longitudeDelta: 0.08 },
        500,
      );
    }
  }

  function handleCloseNearMe() {
    setNearMeVisible(false);
    setNearbySpots([]);
  }

  function handleNearbySpotPress(spot: NearbyPlace) {
    handleCloseNearMe();
    setSelectedPlace(spot);
  }

  function handlePlaceUpdate(updated: ExtractedPlace) {
    setPlaces((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
    );
    setSelectedPlace((prev) =>
      prev && prev.id === updated.id ? { ...prev, ...updated } : prev,
    );
  }

  function handlePlaceDelete(placeId: string) {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
  }

  const missing = progress.total - places.length - progress.failed;
  const nearbyIds = nearMeVisible ? new Set(nearbySpots.map((s) => s.id)) : new Set<string>();

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
        {places.map((place) => {
          const isNearby = nearbyIds.has(place.id);
          return (
            <Marker
              key={place.id}
              coordinate={place.coords}
              pinColor={isNearby ? "#f97316" : "#4f46e5"}
              zIndex={isNearby ? 1 : 0}
              onPress={() => setSelectedPlace(place)}
            />
          );
        })}
      </MapView>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search city…"
          placeholderTextColor="#aaa"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          onSubmitEditing={handleCitySearch}
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleCitySearch} disabled={searching}>
          {searching
            ? <ActivityIndicator size="small" color="#4f46e5" />
            : <Text style={styles.searchBtnText}>→</Text>
          }
        </TouchableOpacity>
      </View>

      {notFound && (
        <Text style={styles.notFoundText}>City not found</Text>
      )}

      {!nearMeVisible && (
        <TouchableOpacity
          style={[styles.nearMeBtn, nearMeLoading && styles.nearMeBtnLoading]}
          onPress={handleNearMe}
          disabled={nearMeLoading}
          activeOpacity={0.85}
        >
          {nearMeLoading ? (
            <ActivityIndicator size="small" color="#f97316" />
          ) : (
            <Ionicons name="location" size={15} color="#f97316" />
          )}
          <Text style={styles.nearMeBtnText}>Near Me</Text>
        </TouchableOpacity>
      )}

      {userLocation && (
        <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation}>
          <Text style={styles.myLocationIcon}>⦿</Text>
        </TouchableOpacity>
      )}

      {missing > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {places.length} of {progress.total} places shown
          </Text>
        </View>
      )}

      <PlaceBottomSheet
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
        onUpdate={handlePlaceUpdate}
        onDelete={handlePlaceDelete}
      />

      <NearMeBottomSheet
        visible={nearMeVisible}
        loading={nearMeLoading}
        spots={nearbySpots}
        onClose={handleCloseNearMe}
        onSpotPress={handleNearbySpotPress}
      />
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
  searchBar: {
    position: "absolute",
    top: 68,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
    paddingVertical: 0,
  },
  searchBtn: { marginLeft: 8, padding: 4 },
  searchBtnText: { fontSize: 18, color: "#4f46e5", fontWeight: "600" },
  notFoundText: {
    position: "absolute",
    top: 126,
    alignSelf: "center",
    backgroundColor: "rgba(200,40,40,0.85)",
    color: "#fff",
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nearMeBtn: {
    position: "absolute",
    bottom: 220,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  nearMeBtnLoading: {
    opacity: 0.7,
  },
  nearMeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  myLocationBtn: {
    position: "absolute",
    bottom: 164,
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
    bottom: 164,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { color: "#fff", fontSize: 13 },
});
