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
import { useFocusEffect } from "@react-navigation/native";
import type { Collection } from "@spotclip/shared";
import { getCollections } from "../api";
import type { CollectionsScreenProps } from "../navigation/types";

const PASTEL_COLORS = [
  "#fde68a", "#a7f3d0", "#bfdbfe", "#c4b5fd",
  "#fbcfe8", "#fed7aa", "#99f6e4", "#fca5a5",
];

const COLUMN_GAP = 12;
const CARD_WIDTH = (Dimensions.get("window").width - 20 * 2 - COLUMN_GAP) / 2;

export function CollectionsScreen({ navigation }: CollectionsScreenProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getCollections()
        .then((data) => {
          if (active) setCollections(data.collections);
        })
        .catch(() => {})
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

  if (collections.length === 0) {
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

  return (
    <FlatList
      data={collections}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
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
