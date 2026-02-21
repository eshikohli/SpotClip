import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { ExtractedPlace } from "@spotclip/shared";
import { SPOT_TAGS } from "@spotclip/shared";
import { getTagColor } from "../tagColors";

interface Props {
  visible: boolean;
  place: ExtractedPlace | null;
  onSave: (placeId: string, payload: { note: string | null; tags: string[] }) => void;
  onCancel: () => void;
}

const MAX_TAGS = 3;

export function EditSpotModal({ visible, place, onSave, onCancel }: Props) {
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (place) {
      setNote(place.note ?? "");
      setSelectedTags(place.tags ?? []);
    }
  }, [place, visible]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const handleSave = () => {
    if (!place) return;
    onSave(place.id, {
      note: note.trim() || null,
      tags: selectedTags,
    });
  };

  if (!place) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Edit spot</Text>
          <Text style={styles.placeName}>{place.name}</Text>

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a note..."
            placeholderTextColor="#aaa"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Tags (max {MAX_TAGS})</Text>
          <ScrollView style={styles.tagScroll} horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagRow}>
              {SPOT_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                const { backgroundColor, color } = getTagColor(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      { backgroundColor: selected ? undefined : backgroundColor },
                      selected && styles.tagChipSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: selected ? undefined : color },
                        selected && styles.tagChipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  placeName: { fontSize: 15, color: "#666", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#1a1a1a",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  tagScroll: { marginBottom: 16 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagChipSelected: { backgroundColor: "#4f46e5" },
  tagChipText: { fontSize: 13 },
  tagChipTextSelected: { color: "#fff", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { fontSize: 16, color: "#666", fontWeight: "500" },
  saveBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
