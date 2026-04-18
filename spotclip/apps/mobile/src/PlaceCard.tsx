import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import type { ExtractedPlace } from "@spotclip/shared";
import { getTagColor } from "./tagColors";
import { useToast } from "./ToastContext";

interface Props {
  place: ExtractedPlace;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onFavorite?: (id: string, isFavorite: boolean) => void;
  onVisited?: (id: string, isVisited: boolean) => void;
  /** Optional subtitle (e.g. "From: Collection Name" for favorites list) */
  subtitle?: string;
  /** When provided and place has a note, tapping the row opens note view */
  onViewNote?: (place: ExtractedPlace) => void;
  /** Show extraction metadata (confidence · frame). Default true (e.g. upload/review). Set false in collection/favorites. */
  showExtractionMeta?: boolean;
}

export function PlaceCard({
  place,
  onDelete,
  onEdit,
  onFavorite,
  onVisited,
  subtitle,
  onViewNote,
  showExtractionMeta = true,
}: Props) {
  const { showToast } = useToast();
  const isVisited = place.isVisited === true;
  const isFavorite = place.isFavorite === true;
  const showIconRow = onFavorite !== undefined || onVisited !== undefined;
  const hasNote = (place.note ?? "").trim().length > 0;
  const tags = place.tags ?? [];
  const showNoteTap = hasNote && onViewNote !== undefined;
  const formatTag = (tag: string) =>
    tag.replace(/\b\w/g, (c) => c.toUpperCase());
  const handleShare = async () => {
    const parts: string[] = [`📍 ${place.name}`];
    if ((place.address ?? "").trim().length > 0) parts.push(place.address!);
    if ((place.note ?? "").trim().length > 0) parts.push(place.note!);
    await Share.share({ message: parts.join("\n") });
  };
  const hasAddress = (place.address ?? "").trim().length > 0;

  const InfoBlock = (
    <View style={styles.info}>
      <View style={styles.nameRow}>
        <Text style={[styles.name, isVisited && styles.textVisited]} numberOfLines={1}>
          {place.name}
        </Text>
        {hasNote && (
          <Text style={styles.noteIndicator} numberOfLines={1}>
            📝
          </Text>
        )}
      </View>
      {(subtitle ?? place.city_guess) ? (
        <Text style={[styles.city, isVisited && styles.textVisited]}>
          {subtitle ?? place.city_guess}
        </Text>
      ) : null}
      {hasAddress && (
        <View style={styles.addressRow}>
          <Text
            style={[styles.address, isVisited && styles.textVisited]}
            numberOfLines={2}
          >
            {place.address}
          </Text>
          <TouchableOpacity
            onPress={() => {
              Clipboard.setStringAsync(place.address!);
              showToast("Copied address");
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.copyBtn}
          >
            <Ionicons name="copy-outline" size={15} color="#999" />
          </TouchableOpacity>
        </View>
      )}
      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((tag) => {
            const { backgroundColor, color } = getTagColor(tag);
            return (
              <View key={tag} style={[styles.tagChip, { backgroundColor }]}>
                <Text style={[styles.tagChipText, { color }, isVisited && styles.textVisited]}>
                  {formatTag(tag)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      {showExtractionMeta && place.evidence != null && (
        <Text style={[styles.confidence, isVisited && styles.textVisited]}>
          {Math.round((place.confidence ?? 0) * 100)}% confidence ·{" "}
          {place.evidence.source === "frame"
            ? `frame #${place.evidence.index}`
            : `audio @${(place.evidence as { timestamp_s: number }).timestamp_s}s`}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.card, isVisited && styles.cardVisited]}>
      {showNoteTap ? (
        <TouchableOpacity
          style={styles.infoTouchable}
          onPress={() => onViewNote(place)}
          activeOpacity={0.7}
        >
          {InfoBlock}
        </TouchableOpacity>
      ) : (
        InfoBlock
      )}
      {showIconRow && (
        <View style={styles.iconRow}>
          {onEdit !== undefined && (
            <TouchableOpacity
              onPress={() => onEdit(place.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconBtn}
            >
              <Ionicons name="pencil-outline" size={22} color="#999" />
            </TouchableOpacity>
          )}
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
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconBtn}
          >
            <Ionicons name="share-outline" size={22} color="#999" />
          </TouchableOpacity>
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
    flexDirection: "column",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardVisited: { backgroundColor: "#f0f0f0", opacity: 0.85 },
  info: { flex: 1 },
  infoTouchable: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", flex: 1 },
  noteIndicator: { fontSize: 14 },
  textVisited: { color: "#888" },
  city: { fontSize: 13, color: "#666", marginTop: 2 },
  addressRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
  address: { fontSize: 13, color: "#888", flex: 1 },
  copyBtn: { padding: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagChipText: { fontSize: 11 },
  confidence: { fontSize: 12, color: "#999", marginTop: 4 },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  iconBtn: { padding: 4 },
  actions: { gap: 6, marginTop: 10 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: { backgroundColor: "#fee" },
  btnText: { fontSize: 13, fontWeight: "500", color: "#333" },
  deleteText: { color: "#c33" },
});
