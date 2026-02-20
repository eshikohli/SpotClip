import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ExtractedPlace } from "@spotclip/shared";

interface Props {
  place: ExtractedPlace;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function PlaceCard({ place, onDelete, onEdit }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.city}>{place.city_guess}</Text>
        <Text style={styles.confidence}>
          {Math.round(place.confidence * 100)}% confidence &middot;{" "}
          {place.evidence.source === "frame"
            ? `frame #${place.evidence.index}`
            : `audio @${place.evidence.timestamp_s}s`}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onEdit(place.id)} style={styles.btn}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(place.id)}
          style={[styles.btn, styles.deleteBtn]}
        >
          <Text style={[styles.btnText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  city: { fontSize: 13, color: "#666", marginTop: 2 },
  confidence: { fontSize: 12, color: "#999", marginTop: 4 },
  actions: { gap: 6 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },
  deleteBtn: { backgroundColor: "#fee" },
  btnText: { fontSize: 13, fontWeight: "500", color: "#333" },
  deleteText: { color: "#c33" },
});
