import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { Collection } from "@spotclip/shared";
import { getCollections, getFavorites } from "../api";
import type { CollectionsScreenProps } from "../navigation/types";

const PASTEL_COLORS = [
  "#fde68a", "#a7f3d0", "#bfdbfe", "#c4b5fd",
  "#fbcfe8", "#fed7aa", "#99f6e4", "#fca5a5",
];

const COLUMN_GAP = 12;
const CARD_WIDTH = (Dimensions.get("window").width - 20 * 2 - COLUMN_GAP) / 2;

export function CollectionsScreen({ navigation }: CollectionsScreenProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([getCollections(), getFavorites()])
        .then(([colData, favData]) => {
          if (active) {
            setCollections(colData.collections);
            setFavoritesCount(favData.favorites.length);
          }
        })
        .catch(() => {
          if (active) {
            setCollections([]);
            setFavoritesCount(0);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const showEmpty = collections.length === 0 && favoritesCount === 0;
  if (showEmpty) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No collections yet</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("Upload")}
        >
          <Text style={styles.primaryBtnText}>Upload Your First Spot</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const favoritesHeader =
    favoritesCount > 0 ? (
      <TouchableOpacity
        style={styles.favoritesCard}
        onPress={() => navigation.navigate("Favorites")}
        activeOpacity={0.8}
      >
        <Ionicons name="heart" size={28} color="#e11" />
        <View style={styles.favoritesCardText}>
          <Text style={styles.favoritesCardName}>Favorites</Text>
          <Text style={styles.favoritesCardCount}>
            {favoritesCount} spot{favoritesCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#666" />
      </TouchableOpacity>
    ) : null;

  return (
    <FlatList
      data={collections}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
      ListHeaderComponent={favoritesHeader}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: PASTEL_COLORS[index % PASTEL_COLORS.length] }]}
          onPress={() => navigation.navigate("CollectionDetail", { collectionId: item.id })}
        >
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.cardCount}>
            {item.places.length} place{item.places.length !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fafafa" },
  emptyText: { fontSize: 18, color: "#999", marginBottom: 16 },
  grid: { padding: 20 },
  favoritesCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: COLUMN_GAP,
    borderWidth: 1,
    borderColor: "#fecaca",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  favoritesCardText: { flex: 1, marginLeft: 12 },
  favoritesCardName: { fontSize: 17, fontWeight: "600", color: "#1a1a1a" },
  favoritesCardCount: { fontSize: 13, color: "#666", marginTop: 2 },
  row: { justifyContent: "space-between", marginBottom: COLUMN_GAP },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    padding: 16,
    minHeight: 100,
    justifyContent: "space-between",
  },
  cardName: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  cardCount: { fontSize: 13, color: "#555", marginTop: 8 },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
