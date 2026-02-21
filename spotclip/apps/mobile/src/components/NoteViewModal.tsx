import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { ExtractedPlace } from "@spotclip/shared";

interface Props {
  visible: boolean;
  place: ExtractedPlace | null;
  onClose: () => void;
}

export function NoteViewModal({ visible, place, onClose }: Props) {
  if (!place) return null;
  const hasNote = (place.note ?? "").trim().length > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheet}>
            <Text style={styles.placeName}>{place.name}</Text>
            {(place.tags ?? []).length > 0 && (
              <View style={styles.tagRow}>
                {(place.tags ?? []).map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            {hasNote ? (
              <Text style={styles.noteText}>{place.note!.trim()}</Text>
            ) : (
              <Text style={styles.noNote}>No note yet</Text>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  placeName: { fontSize: 18, fontWeight: "600", color: "#1a1a1a", marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#e0e7ff",
  },
  tagChipText: { fontSize: 12, color: "#4338ca" },
  noteText: { fontSize: 15, color: "#333", lineHeight: 22, marginBottom: 16 },
  noNote: { fontSize: 14, color: "#999", marginBottom: 16 },
  closeBtn: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeBtnText: { fontSize: 16, color: "#4f46e5", fontWeight: "600" },
});
