import React, { useState, useCallback, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import type { Collection, ExtractedPlace } from "@spotclip/shared";
import { getCollection, toggleFavorite, toggleVisited, deletePlace, updatePlace } from "../api";
import { PlaceCard } from "../PlaceCard";
import { EditSpotModal } from "../components/EditSpotModal";
import { NoteViewModal } from "../components/NoteViewModal";
import { getTagColor } from "../tagColors";
import { geocodePlace, type Coords } from "../utils/geocode";
import { getDistance } from "../utils/nearbySpots";
import type { CollectionDetailScreenProps } from "../navigation/types";

const NEAR_ME_RADIUS_MILES = 5;

export function CollectionDetailScreen({ route, navigation }: CollectionDetailScreenProps) {
  const { collectionId } = route.params;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalPlace, setEditModalPlace] = useState<ExtractedPlace | null>(null);
  const [noteModalPlace, setNoteModalPlace] = useState<ExtractedPlace | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Near Me state
  const [nearMode, setNearMode] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [nearMeDistances, setNearMeDistances] = useState<Map<string, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getCollection(collectionId)
        .then((data) => {
          if (active) setCollection(data);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, [collectionId]),
  );

  useLayoutEffect(() => {
    if (collection) {
      navigation.setOptions({ title: collection.name });
    }
  }, [navigation, collection]);

  const sortedPlaces = useMemo(() => {
    if (!collection) return [];
    return [...collection.places].sort((a, b) => {
      const aVisited = a.isVisited === true ? 1 : 0;
      const bVisited = b.isVisited === true ? 1 : 0;
      return aVisited - bVisited;
    });
  }, [collection]);

  const availableTags = useMemo(() => {
    if (!collection) return [];
    const set = new Set<string>();
    for (const p of collection.places) {
      for (const t of p.tags ?? []) set.add(t);
    }
    return Array.from(set).sort();
  }, [collection]);

  const filteredPlaces = useMemo(() => {
    let result = selectedTag
      ? sortedPlaces.filter((p) => (p.tags ?? []).includes(selectedTag))
      : sortedPlaces;

    if (nearMode) {
      result = result
        .filter((p) => {
          const d = nearMeDistances.get(p.id);
          return d !== undefined && d <= NEAR_ME_RADIUS_MILES;
        })
        .sort((a, b) => (nearMeDistances.get(a.id) ?? 0) - (nearMeDistances.get(b.id) ?? 0));
    }

    return result;
  }, [sortedPlaces, selectedTag, nearMode, nearMeDistances]);

  const handleTagPress = useCallback((tag: string | null) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  }, []);

  async function handleNearMeToggle() {
    if (nearMode) {
      setNearMode(false);
      return;
    }

    setLocationLoading(true);
    setLocationDenied(false);

    let loc = userLocation;
    if (!loc) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        setLocationLoading(false);
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({});
        loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(loc);
      } catch {
        setLocationLoading(false);
        Alert.alert("Location unavailable", "Could not get your current location.");
        return;
      }
    }

    // Geocode all places in parallel (uses address when available for precision)
    const places = collection?.places ?? [];
    const geocoded = await Promise.all(
      places.map(async (p) => ({
        id: p.id,
        coords: await geocodePlace(p.name, p.city_guess, p.address),
      })),
    );

    const distances = new Map<string, number>();
    for (const { id, coords } of geocoded) {
      if (coords && loc) {
        distances.set(id, getDistance(loc.latitude, loc.longitude, coords.latitude, coords.longitude));
      }
    }

    setNearMeDistances(distances);
    setNearMode(true);
    setLocationLoading(false);
  }

  const handleFavorite = useCallback(
    async (placeId: string, isFavorite: boolean) => {
      if (!collection) return;
      const prev = collection.places.find((p) => p.id === placeId);
      if (!prev) return;
      const previous = prev.isFavorite;
      setCollection((c) =>
        c ? { ...c, places: c.places.map((p) => p.id === placeId ? { ...p, isFavorite } : p) } : null,
      );
      try {
        await toggleFavorite(collectionId, placeId, isFavorite);
      } catch {
        setCollection((c) =>
          c ? { ...c, places: c.places.map((p) => p.id === placeId ? { ...p, isFavorite: previous } : p) } : null,
        );
        Alert.alert("Error", "Failed to update favorite");
      }
    },
    [collection, collectionId],
  );

  const handleVisited = useCallback(
    async (placeId: string, isVisited: boolean) => {
      if (!collection) return;
      const prev = collection.places.find((p) => p.id === placeId);
      if (!prev) return;
      const previous = prev.isVisited;
      setCollection((c) =>
        c ? { ...c, places: c.places.map((p) => p.id === placeId ? { ...p, isVisited } : p) } : null,
      );
      try {
        await toggleVisited(collectionId, placeId, isVisited);
      } catch {
        setCollection((c) =>
          c ? { ...c, places: c.places.map((p) => p.id === placeId ? { ...p, isVisited: previous } : p) } : null,
        );
        Alert.alert("Error", "Failed to update visited");
      }
    },
    [collection, collectionId],
  );

  const handleDelete = useCallback(
    (placeId: string) => {
      const place = collection?.places.find((p) => p.id === placeId);
      Alert.alert(
        "Remove this spot?",
        place ? `"${place.name}" will be removed from this collection.` : undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              if (!collection) return;
              const previous = collection.places;
              setCollection((c) =>
                c ? { ...c, places: c.places.filter((p) => p.id !== placeId) } : null,
              );
              try {
                await deletePlace(collectionId, placeId);
              } catch {
                setCollection((c) => (c ? { ...c, places: previous } : null));
                Alert.alert("Error", "Failed to remove spot");
              }
            },
          },
        ],
      );
    },
    [collection, collectionId],
  );

  const handleEditSave = useCallback(
    async (placeId: string, payload: { note: string | null; tags: string[] }) => {
      if (!collection) return;
      const previous = collection.places.find((p) => p.id === placeId);
      if (!previous) return;
      setCollection((c) =>
        c
          ? {
              ...c,
              places: c.places.map((p) =>
                p.id === placeId ? { ...p, note: payload.note, tags: payload.tags } : p,
              ),
            }
          : null,
      );
      setEditModalPlace(null);
      try {
        await updatePlace(collectionId, placeId, payload);
      } catch {
        setCollection((c) =>
          c
            ? {
                ...c,
                places: c.places.map((p) =>
                  p.id === placeId ? { ...p, note: previous.note, tags: previous.tags } : p,
                ),
              }
            : null,
        );
        Alert.alert("Error", "Failed to update spot");
      }
    },
    [collection, collectionId],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Collection not found</Text>
      </View>
    );
  }

  const tagFilterHeader = (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagFilterScroll}
        contentContainerStyle={styles.tagFilterContent}
      >
        {/* All (tags) */}
        <TouchableOpacity
          style={[styles.tagChipAll, selectedTag === null && !nearMode && styles.tagChipAllSelected]}
          onPress={() => { handleTagPress(null); setNearMode(false); }}
        >
          <Text style={[styles.tagChipText, selectedTag === null && !nearMode && styles.tagChipTextSelected]}>
            All
          </Text>
        </TouchableOpacity>

        {/* Near Me */}
        <TouchableOpacity
          style={[styles.tagChipNearMe, nearMode && styles.tagChipNearMeActive]}
          onPress={handleNearMeToggle}
          disabled={locationLoading}
        >
          {locationLoading && (
            <ActivityIndicator size="small" color={nearMode ? "#fff" : "#f97316"} style={styles.nearMeSpinner} />
          )}
          <Text style={[styles.tagChipText, styles.tagChipNearMeText, nearMode && styles.tagChipNearMeActiveText]}>
            {locationLoading ? "Locating…" : "Near Me"}
          </Text>
        </TouchableOpacity>

        {/* Tag pills */}
        {availableTags.map((tag) => {
          const selected = selectedTag === tag;
          const { backgroundColor, color } = getTagColor(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagChipFilter,
                { backgroundColor },
                selected && { borderWidth: 2, borderColor: color },
              ]}
              onPress={() => handleTagPress(tag)}
            >
              <Text style={[styles.tagChipText, { color }]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {locationDenied && (
        <Text style={styles.locationDeniedText}>Enable location to use Near Me</Text>
      )}
    </>
  );

  const emptyText = nearMode && !locationDenied
    ? "No saved spots within 5 miles"
    : selectedTag
    ? `No spots with tag "${selectedTag}".`
    : "No places in this collection yet.";

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.listWrapper}
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={tagFilterHeader}
        renderItem={({ item }) => {
          const dist = nearMode ? nearMeDistances.get(item.id) : undefined;
          const subtitle =
            dist !== undefined ? `${item.city_guess} • ${dist.toFixed(1)} mi` : undefined;
          return (
            <PlaceCard
              place={item}
              subtitle={subtitle}
              onFavorite={handleFavorite}
              onVisited={handleVisited}
              onDelete={handleDelete}
              onEdit={(id) => setEditModalPlace(filteredPlaces.find((p) => p.id === id) ?? null)}
              onViewNote={(p) => setNoteModalPlace(p)}
              showExtractionMeta={false}
            />
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{emptyText}</Text>
        }
      />
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("Upload")}
      >
        <Text style={styles.primaryBtnText}>Upload a New Spot</Text>
      </TouchableOpacity>

      <EditSpotModal
        visible={editModalPlace !== null}
        place={editModalPlace}
        onSave={handleEditSave}
        onCancel={() => setEditModalPlace(null)}
      />
      <NoteViewModal
        visible={noteModalPlace !== null}
        place={noteModalPlace}
        onClose={() => setNoteModalPlace(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" },
  errorText: { fontSize: 16, color: "#c33" },
  tagFilterScroll: { marginBottom: 4 },
  tagFilterContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  listWrapper: { flex: 1 },
  tagChipAll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#e8e4f0",
    marginRight: 8,
  },
  tagChipAllSelected: { backgroundColor: "#4f46e5" },
  tagChipNearMe: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#fff5ed",
    marginRight: 8,
  },
  tagChipNearMeActive: { backgroundColor: "#f97316" },
  tagChipNearMeText: { color: "#f97316" },
  tagChipNearMeActiveText: { color: "#fff" },
  nearMeSpinner: { marginRight: 4 },
  tagChipFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
  },
  tagChipText: { fontSize: 15, lineHeight: 18, color: "#555", fontWeight: "500" },
  tagChipTextSelected: { color: "#fff", fontWeight: "600" },
  locationDeniedText: {
    marginHorizontal: 20,
    marginBottom: 8,
    fontSize: 13,
    color: "#f97316",
  },
  list: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 20 },
  emptyText: { textAlign: "center", color: "#999", marginTop: 40 },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    margin: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
