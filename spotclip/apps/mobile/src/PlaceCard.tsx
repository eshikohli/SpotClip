import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ExtractedPlace } from "@spotclip/shared";

interface Props {
  place: ExtractedPlace;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onFavorite?: (id: string, isFavorite: boolean) => void;
  onVisited?: (id: string, isVisited: boolean) => void;
  /** Optional subtitle (e.g. "From: Collection Name" for favorites list) */
  subtitle?: string;
}

export function PlaceCard({
  place,
  onDelete,
  onEdit,
  onFavorite,
  onVisited,
  subtitle,
}: Props) {
  const isVisited = place.isVisited === true;
  const isFavorite = place.isFavorite === true;
  const showIconRow = onFavorite !== undefined || onVisited !== undefined;

  return (
    <View style={[styles.card, isVisited && styles.cardVisited]}>
      <View style={styles.info}>
        <Text style={[styles.name, isVisited && styles.textVisited]}>{place.name}</Text>
        {(subtitle ?? place.city_guess) ? (
          <Text style={[styles.city, isVisited && styles.textVisited]}>
            {subtitle ?? place.city_guess}
          </Text>
        ) : null}
        {place.evidence != null && (
          <Text style={[styles.confidence, isVisited && styles.textVisited]}>
            {Math.round((place.confidence ?? 0) * 100)}% confidence ·{" "}
            {place.evidence.source === "frame"
              ? `frame #${place.evidence.index}`
              : `audio @${(place.evidence as { timestamp_s: number }).timestamp_s}s`}
          </Text>
        )}
      </View>
      {showIconRow && (
        <View style={styles.iconRow}>
          {onFavorite !== undefined && (
            <TouchableOpacity
              onPress={() => onFavorite(place.id, !isFavorite)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconBtn}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#e11" : "#999"}
              />
            </TouchableOpacity>
          )}
          {onVisited !== undefined && (
            <TouchableOpacity
              onPress={() => onVisited(place.id, !isVisited)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconBtn}
            >
              <Ionicons
                name={isVisited ? "checkmark-circle" : "checkmark-circle-outline"}
                size={22}
                color={isVisited ? "#22c55e" : "#999"}
              />
            </TouchableOpacity>
          )}
          {onDelete !== undefined && (
            <TouchableOpacity
              onPress={() => onDelete(place.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconBtn}
            >
              <Ionicons name="trash-outline" size={22} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}
      {!showIconRow && (onEdit || onDelete) && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(place.id)} style={styles.btn}>
              <Text style={styles.btnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(place.id)}
              style={[styles.btn, styles.deleteBtn]}
            >
              <Text style={[styles.btnText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  cardVisited: { backgroundColor: "#f0f0f0", opacity: 0.85 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  textVisited: { color: "#888" },
  city: { fontSize: 13, color: "#666", marginTop: 2 },
  confidence: { fontSize: 12, color: "#999", marginTop: 4 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { padding: 4 },
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
