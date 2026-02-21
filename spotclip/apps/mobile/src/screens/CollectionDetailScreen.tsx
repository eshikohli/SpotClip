import React, { useState, useCallback, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { Collection, ExtractedPlace } from "@spotclip/shared";
import { getCollection, toggleFavorite, toggleVisited, deletePlace, updatePlace } from "../api";
import { PlaceCard } from "../PlaceCard";
import { EditSpotModal } from "../components/EditSpotModal";
import { NoteViewModal } from "../components/NoteViewModal";
import type { CollectionDetailScreenProps } from "../navigation/types";

export function CollectionDetailScreen({ route, navigation }: CollectionDetailScreenProps) {
  const { collectionId } = route.params;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalPlace, setEditModalPlace] = useState<ExtractedPlace | null>(null);
  const [noteModalPlace, setNoteModalPlace] = useState<ExtractedPlace | null>(null);

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

  const handleFavorite = useCallback(
    async (placeId: string, isFavorite: boolean) => {
      if (!collection) return;
      const prev = collection.places.find((p) => p.id === placeId);
      if (!prev) return;
      const previous = prev.isFavorite;
      setCollection((c) =>
        c
          ? {
              ...c,
              places: c.places.map((p) =>
                p.id === placeId ? { ...p, isFavorite } : p,
              ),
            }
          : null,
      );
      try {
        await toggleFavorite(collectionId, placeId, isFavorite);
      } catch {
        setCollection((c) =>
          c
            ? {
                ...c,
                places: c.places.map((p) =>
                  p.id === placeId ? { ...p, isFavorite: previous } : p,
                ),
              }
            : null,
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
        c
          ? {
              ...c,
              places: c.places.map((p) =>
                p.id === placeId ? { ...p, isVisited } : p,
              ),
            }
          : null,
      );
      try {
        await toggleVisited(collectionId, placeId, isVisited);
      } catch {
        setCollection((c) =>
          c
            ? {
                ...c,
                places: c.places.map((p) =>
                  p.id === placeId ? { ...p, isVisited: previous } : p,
                ),
              }
            : null,
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
                p.id === placeId
                  ? { ...p, note: payload.note, tags: payload.tags }
                  : p,
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

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedPlaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            onFavorite={handleFavorite}
            onVisited={handleVisited}
            onDelete={handleDelete}
            onEdit={(id) => setEditModalPlace(sortedPlaces.find((p) => p.id === id) ?? null)}
            onViewNote={(p) => setNoteModalPlace(p)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No places in this collection yet.</Text>
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
  list: { padding: 20 },
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
