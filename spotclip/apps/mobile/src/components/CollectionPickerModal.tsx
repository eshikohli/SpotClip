import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import type { Collection, ExtractedPlace } from "@spotclip/shared";
import { getCollections, addPlacesToCollection } from "../api";

interface Props {
  visible: boolean;
  places: ExtractedPlace[];
  onSaved: (collectionId: string) => void;
  onCancel: () => void;
}

export function CollectionPickerModal({ visible, places, onSaved, onCancel }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getCollections()
        .then((data) => setCollections(data.collections))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  async function handlePick(collection: Collection) {
    setSaving(true);
    try {
      await addPlacesToCollection(collection.id, places);
      onSaved(collection.id);
    } catch {
      // stay open on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Save to Collection</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.spinner} />
          ) : collections.length === 0 ? (
            <Text style={styles.empty}>No collections yet. Create one instead.</Text>
          ) : (
            <FlatList
              data={collections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handlePick(item)}
                  disabled={saving}
                >
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCount}>
                    {item.places.length} place{item.places.length !== 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
  spinner: { marginVertical: 40 },
  empty: { color: "#999", textAlign: "center", marginVertical: 30 },
  list: { marginBottom: 12 },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: { fontSize: 16, fontWeight: "500", color: "#1a1a1a" },
  itemCount: { fontSize: 13, color: "#666" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 16, color: "#666", fontWeight: "500" },
});
