import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Keyboard,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import type { ExtractedPlace } from "@spotclip/shared";
import { SPOT_TAGS } from "@spotclip/shared";
import { toggleFavorite, toggleVisited, updatePlace, deletePlace } from "../api";
import { useToast } from "../ToastContext";
import { getTagColor } from "../tagColors";
import type { Coords } from "../utils/geocode";

export interface PlaceWithCoords extends ExtractedPlace {
  coords: Coords;
  collectionId: string;
}

interface Props {
  place: PlaceWithCoords | null;
  onClose: () => void;
  onUpdate: (updated: ExtractedPlace) => void;
  onDelete: (placeId: string) => void;
}

const MAX_TAGS = 3;

export function PlaceBottomSheet({ place, onClose, onUpdate, onDelete }: Props) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [busy, setBusy] = useState<"favorite" | "visited" | null>(null);

  useEffect(() => {
    if (place) {
      setEditNote(place.note ?? "");
      setEditTags(place.tags ?? []);
    }
    setEditing(false);
  }, [place?.id]);

  const kbAnim = useRef(new Animated.Value(0)).current;
  const kbVisibleRef = useRef(false);
  const kbDurationRef = useRef(250);

  useEffect(() => {
    const willShow = Keyboard.addListener('keyboardWillShow', (e) => {
      kbVisibleRef.current = true;
      kbDurationRef.current = e.duration || 250;
      Animated.timing(kbAnim, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });
    const willHide = Keyboard.addListener('keyboardWillHide', (e) => {
      kbVisibleRef.current = false;
      Animated.timing(kbAnim, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });
    return () => { willShow.remove(); willHide.remove(); };
  }, []);

  if (!place) return null;

  // Dismiss edit mode only after the keyboard has fully slid away, so the
  // detail-mode sheet never animates while the keyboard is still moving.
  function exitEdit() {
    const wasVisible = kbVisibleRef.current;
    Keyboard.dismiss();
    if (wasVisible) {
      setTimeout(() => setEditing(false), kbDurationRef.current + 50);
    } else {
      setEditing(false);
    }
  }

  const isFavorite = place.isFavorite === true;
  const isVisited = place.isVisited === true;
  const hasTags = (place.tags ?? []).length > 0;
  const hasNote = (place.note ?? "").trim().length > 0;
  const hasAddress = (place.address ?? "").trim().length > 0;

  function openEdit() {
    setEditNote(place.note ?? "");
    setEditTags(place.tags ?? []);
    setEditing(true);
  }

  async function handleSaveEdit() {
    const payload = { note: editNote.trim() || null, tags: editTags };
    exitEdit();
    try {
      await updatePlace(place.collectionId, place.id, payload);
      onUpdate({ ...place, note: payload.note, tags: payload.tags });
    } catch {
      // silently revert
    }
  }

  function toggleEditTag(tag: string) {
    setEditTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }

  async function handleToggleFavorite() {
    if (busy) return;
    const next = !isFavorite;
    onUpdate({ ...place, isFavorite: next });
    setBusy("favorite");
    try {
      await toggleFavorite(place.collectionId, place.id, next);
    } catch {
      onUpdate({ ...place, isFavorite: isFavorite });
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleVisited() {
    if (busy) return;
    const next = !isVisited;
    onUpdate({ ...place, isVisited: next });
    setBusy("visited");
    try {
      await toggleVisited(place.collectionId, place.id, next);
    } catch {
      onUpdate({ ...place, isVisited: isVisited });
    } finally {
      setBusy(null);
    }
  }

  function handleDelete() {
    Alert.alert("Remove this spot?", place.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          onClose();
          try {
            await deletePlace(place.collectionId, place.id);
            onDelete(place.id);
          } catch {}
        },
      },
    ]);
  }

  async function handleCopyAddress() {
    if (place.address) {
      await Clipboard.setStringAsync(place.address);
      showToast("Copied address");
    }
  }

  return (
    <Modal visible={!!place} animationType="slide" transparent onRequestClose={onClose}>
      {/* Full-screen column: overlay tap area on top, sheet anchored to bottom */}
      <Animated.View style={[styles.container, { paddingBottom: kbAnim }]}>
        <TouchableOpacity
          style={styles.overlayTap}
          activeOpacity={1}
          onPress={editing ? undefined : onClose}
        />

        <View style={styles.sheet}>
            <View style={styles.handle} />

            {editing ? (
              /* ── Edit mode ── */
              <>
                <ScrollView
                  style={styles.editScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  <Text style={styles.editTitle}>Edit spot</Text>
                  <Text style={styles.editSubtitle}>{place.name}</Text>

                  <Text style={styles.label}>Note (optional)</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add a note…"
                    placeholderTextColor="#aaa"
                    value={editNote}
                    onChangeText={setEditNote}
                    multiline
                    numberOfLines={4}
                    autoFocus
                  />

                  <Text style={styles.label}>Tags (max {MAX_TAGS})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.tagRow}>
                      {SPOT_TAGS.map((tag) => {
                        const selected = editTags.includes(tag);
                        const { backgroundColor, color } = getTagColor(tag);
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[
                              styles.tagChip,
                              { backgroundColor: selected ? "#4f46e5" : backgroundColor },
                            ]}
                            onPress={() => toggleEditTag(tag)}
                          >
                            <Text style={[styles.tagText, { color: selected ? "#fff" : color }]}>
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </ScrollView>

                {/* Edit actions — always visible */}
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={exitEdit}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ── Detail mode ── */
              <>
                <ScrollView
                  style={styles.detailScroll}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
                  {!!place.city_guess && (
                    <Text style={styles.city}>{place.city_guess}</Text>
                  )}

                  {hasAddress && (
                    <TouchableOpacity style={styles.addressRow} onPress={handleCopyAddress}>
                      <Ionicons name="location-outline" size={14} color="#888" />
                      <Text style={styles.addressText} numberOfLines={1}>{place.address}</Text>
                      <Ionicons name="copy-outline" size={13} color="#aaa" />
                    </TouchableOpacity>
                  )}

                  {hasTags && (
                    <View style={styles.tagRow}>
                      {(place.tags ?? []).map((tag) => {
                        const { backgroundColor, color } = getTagColor(tag);
                        return (
                          <View key={tag} style={[styles.tagChip, { backgroundColor }]}>
                            <Text style={[styles.tagText, { color }]}>{tag}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {hasNote && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>{place.note}</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Action row — always visible, never in scroll */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleToggleFavorite}
                    disabled={!!busy}
                  >
                    {busy === "favorite"
                      ? <ActivityIndicator size="small" color="#e11" />
                      : <Ionicons
                          name={isFavorite ? "heart" : "heart-outline"}
                          size={28}
                          color={isFavorite ? "#e11" : "#555"}
                        />
                    }
                    <Text style={[styles.actionLabel, isFavorite && styles.actionLabelFav]}>
                      {isFavorite ? "Saved" : "Save"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleToggleVisited}
                    disabled={!!busy}
                  >
                    {busy === "visited"
                      ? <ActivityIndicator size="small" color="#22c55e" />
                      : <Ionicons
                          name={isVisited ? "checkmark-circle" : "checkmark-circle-outline"}
                          size={28}
                          color={isVisited ? "#22c55e" : "#555"}
                        />
                    }
                    <Text style={[styles.actionLabel, isVisited && styles.actionLabelVisited]}>
                      {isVisited ? "Been here" : "Mark visited"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={openEdit}>
                    <Ionicons name="create-outline" size={28} color="#555" />
                    <Text style={styles.actionLabel}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={28} color="#c33" />
                    <Text style={[styles.actionLabel, styles.actionLabelDelete]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  overlayTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },

  // Detail mode — scrollable content
  detailScroll: {
    maxHeight: 220,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  city: {
    fontSize: 14,
    color: "#777",
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: "#888",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  noteBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Action row — always visible
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    marginTop: 12,
  },
  actionBtn: {
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  actionLabel: {
    fontSize: 11,
    color: "#555",
    textAlign: "center",
  },
  actionLabelFav: { color: "#e11" },
  actionLabelVisited: { color: "#22c55e" },
  actionLabelDelete: { color: "#c33" },

  // Edit mode
  editScroll: {
    maxHeight: 260,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  editSubtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1a1a1a",
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    marginTop: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  saveBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
