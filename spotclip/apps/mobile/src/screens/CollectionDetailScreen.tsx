import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { Collection } from "@spotclip/shared";
import { getCollection } from "../api";
import { PlaceCard } from "../PlaceCard";
import type { CollectionDetailScreenProps } from "../navigation/types";

export function CollectionDetailScreen({ route, navigation }: CollectionDetailScreenProps) {
  const { collectionId } = route.params;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

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
        data={collection.places}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlaceCard place={item} />}
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
