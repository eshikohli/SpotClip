import React, { useState, useCallback } from "react";
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
import type { FavoriteItem } from "@spotclip/shared";
import { getFavorites, toggleFavorite, toggleVisited, deletePlace, updatePlace } from "../api";
import { PlaceCard } from "../PlaceCard";
import { EditSpotModal } from "../components/EditSpotModal";
import { NoteViewModal } from "../components/NoteViewModal";

export function FavoritesDetailScreen() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalPlace, setEditModalPlace] = useState<FavoriteItem | null>(null);
  const [noteModalPlace, setNoteModalPlace] = useState<FavoriteItem | null>(null);

  const refresh = useCallback(() => {
    getFavorites()
      .then((data) => setFavorites(data.favorites))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh();
    }, [refresh]),
  );

  const handleUnfavorite = useCallback(
    async (placeId: string, isFavorite: boolean) => {
      const item = favorites.find((f) => f.id === placeId);
      if (!item || isFavorite) return;
      const previous = [...favorites];
      setFavorites((prev) => prev.filter((p) => p.id !== placeId));
      try {
        await toggleFavorite(item.collectionId, placeId, false);
      } catch {
        setFavorites(previous);
        Alert.alert("Error", "Failed to update favorite");
      }
    },
    [favorites],
  );

  const handleVisited = useCallback(
    async (placeId: string, isVisited: boolean) => {
      const item = favorites.find((f) => f.id === placeId);
      if (!item) return;
      const previous = item.isVisited;
      setFavorites((prev) =>
        prev.map((p) =>
          p.id === placeId ? { ...p, isVisited } : p,
        ),
      );
      try {
        await toggleVisited(item.collectionId, placeId, isVisited);
      } catch {
        setFavorites((prev) =>
          prev.map((p) =>
            p.id === placeId ? { ...p, isVisited: previous } : p,
          ),
        );
        Alert.alert("Error", "Failed to update visited");
      }
    },
    [favorites],
  );

  const handleDelete = useCallback((placeId: string) => {
    const item = favorites.find((f) => f.id === placeId);
    if (!item) return;
    Alert.alert(
      "Remove this spot?",
      `"${item.name}" will be removed from "${item.collectionName}" and from Favorites.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const previous = [...favorites];
            setFavorites((prev) => prev.filter((p) => p.id !== placeId));
            try {
              await deletePlace(item.collectionId, placeId);
            } catch {
              setFavorites(previous);
              Alert.alert("Error", "Failed to remove spot");
            }
          },
        },
      ]);
  }, [favorites]);

  const handleEditSave = useCallback(
    async (placeId: string, payload: { note: string | null; tags: string[] }) => {
      const item = favorites.find((f) => f.id === placeId);
      if (!item) return;
      const previous = { note: item.note, tags: item.tags };
      setFavorites((prev) =>
        prev.map((p) =>
          p.id === placeId ? { ...p, note: payload.note, tags: payload.tags } : p,
        ),
      );
      setEditModalPlace(null);
      try {
        await updatePlace(item.collectionId, placeId, payload);
      } catch {
        setFavorites((prev) =>
          prev.map((p) =>
            p.id === placeId ? { ...p, note: previous.note, tags: previous.tags } : p,
          ),
        );
        Alert.alert("Error", "Failed to update spot");
      }
    },
    [favorites],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No favorites yet</Text>
        <Text style={styles.emptySubtext}>
          Tap the heart on any spot in a collection to add it here.
        </Text>
      </View>
    );
  }

  const sorted = [...favorites].sort((a, b) => {
    const aV = a.isVisited === true ? 1 : 0;
    const bV = b.isVisited === true ? 1 : 0;
    return aV - bV;
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => `${item.collectionId}-${item.id}`}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            subtitle={
              item.city_guess
                ? `${item.city_guess} · From: ${item.collectionName}`
                : `From: ${item.collectionName}`
            }
            onFavorite={handleUnfavorite}
            onVisited={handleVisited}
            onDelete={handleDelete}
            onEdit={(id) => setEditModalPlace(sorted.find((p) => p.id === id) ?? null)}
            onViewNote={(p) => setNoteModalPlace(p as FavoriteItem)}
          />
        )}
        contentContainerStyle={styles.list}
      />

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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fafafa" },
  emptyText: { fontSize: 18, color: "#999", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#bbb", textAlign: "center" },
  list: { padding: 20 },
});
