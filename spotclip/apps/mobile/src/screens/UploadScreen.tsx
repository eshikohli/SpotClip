import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import type { ExtractedPlace } from "@spotclip/shared";
import { ingestClip } from "../api";
import { PlaceCard } from "../PlaceCard";
import { CollectionPickerModal } from "../components/CollectionPickerModal";
import { CreateCollectionModal } from "../components/CreateCollectionModal";
import type { UploadScreenProps } from "../navigation/types";

type Step = "input" | "loading" | "review";

interface MediaFile {
  uri: string;
  name: string;
  type: string;
}

export function UploadScreen({ navigation }: UploadScreenProps) {
  const [step, setStep] = useState<Step>("input");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [places, setPlaces] = useState<ExtractedPlace[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualNote, setManualNote] = useState("");

  // ── Pick images ──────────────────────────────────────────────────
  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const files: MediaFile[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? `image-${Date.now()}.jpg`,
        type: a.mimeType ?? "image/jpeg",
      }));
      setMediaFiles((prev) => [...prev, ...files]);
    }
  }

  // ── Remove a file from the upload list ───────────────────────────
  function removeMediaFile(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (mediaFiles.length === 0) {
      Alert.alert("Error", "Please attach at least one media file");
      return;
    }

    setStep("loading");
    try {
      const response = await ingestClip(mediaFiles);
      setPlaces(response.places);
      setStep("review");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
      setStep("input");
    }
  }

  // ── Edit / delete places ─────────────────────────────────────────
  function handleDelete(id: string) {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  }

  function handleEditStart(id: string) {
    const place = places.find((p) => p.id === id);
    if (place) {
      setEditingId(id);
      setEditName(place.name);
    }
  }

  function handleEditSave() {
    if (!editingId) return;
    setPlaces((prev) =>
      prev.map((p) => (p.id === editingId ? { ...p, name: editName } : p)),
    );
    setEditingId(null);
    setEditName("");
  }

  // ── Manual entry ─────────────────────────────────────────────────
  function handleManualSubmit() {
    if (!manualName.trim() || !manualCity.trim()) {
      Alert.alert("Required", "Place name and city are required.");
      return;
    }
    const place: ExtractedPlace = {
      id: Crypto.randomUUID(),
      name: manualName.trim(),
      city_guess: manualCity.trim(),
      address: manualAddress.trim() || null,
      note: manualNote.trim() || null,
      confidence: 1,
      evidence: { source: "frame", index: 0 },
    };
    setPlaces([place]);
    setStep("review");
  }

  // ── Reset ────────────────────────────────────────────────────────
  function handleReset() {
    setStep("input");
    setMediaFiles([]);
    setPlaces([]);
    setManualMode(false);
    setManualName("");
    setManualCity("");
    setManualAddress("");
    setManualNote("");
  }

  // ── On saved from modals ─────────────────────────────────────────
  function handleSaved(collectionId: string) {
    setShowPicker(false);
    setShowCreate(false);
    navigation.replace("CollectionDetail", { collectionId });
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add a Spot</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {step === "input" && (
        <ScrollView style={styles.section} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Media</Text>
          <View style={styles.mediaButtons}>
            <TouchableOpacity style={styles.mediaPick} onPress={pickImages}>
              <Text style={styles.mediaPickText}>+ Images</Text>
            </TouchableOpacity>
          </View>
          {mediaFiles.length > 0 && (
            <View style={styles.thumbnailsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsContent}
              >
                {mediaFiles.map((file, index) => (
                  <View key={`${file.uri}-${index}`} style={styles.thumbnailWrap}>
                    <Image
                      source={{ uri: file.uri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.thumbnailRemove}
                      onPress={() => removeMediaFile(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.thumbnailRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit}>
            <Text style={styles.primaryBtnText}>Extract Places</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.manualToggleBtn}
            onPress={() => setManualMode((v) => !v)}
          >
            <Text style={styles.manualToggleText}>
              {manualMode ? "Hide Manual Entry" : "Add Manually"}
            </Text>
          </TouchableOpacity>

          {manualMode && (
            <View style={styles.manualForm}>
              <Text style={styles.label}>Place Name *</Text>
              <TextInput
                style={styles.input}
                value={manualName}
                onChangeText={setManualName}
                placeholder="e.g. Blue Bottle Coffee"
                placeholderTextColor="#aaa"
              />
              <Text style={[styles.label, { marginTop: 12 }]}>City *</Text>
              <TextInput
                style={styles.input}
                value={manualCity}
                onChangeText={setManualCity}
                placeholder="e.g. San Francisco, CA"
                placeholderTextColor="#aaa"
              />
              <Text style={[styles.label, { marginTop: 12 }]}>Address</Text>
              <TextInput
                style={styles.input}
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder="e.g. 315 Linden St"
                placeholderTextColor="#aaa"
              />
              <Text style={[styles.label, { marginTop: 12 }]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={manualNote}
                onChangeText={setManualNote}
                placeholder="Anything you want to remember…"
                placeholderTextColor="#aaa"
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!manualName.trim() || !manualCity.trim()) && styles.primaryBtnDisabled,
                ]}
                onPress={handleManualSubmit}
                disabled={!manualName.trim() || !manualCity.trim()}
              >
                <Text style={styles.primaryBtnText}>Add Spot</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {step === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>
            {mediaFiles.length > 1
              ? `Analyzing ${mediaFiles.length} images…`
              : "Analyzing clip…"}
          </Text>
        </View>
      )}

      {step === "review" && (
        <View style={styles.section}>
          {editingId && (
            <View style={styles.editBar}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
              <TouchableOpacity
                style={styles.saveEditBtn}
                onPress={handleEditSave}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={places}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PlaceCard
                place={item}
                onDelete={handleDelete}
                onEdit={handleEditStart}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                All places removed. Start over to try again.
              </Text>
            }
            style={styles.list}
          />

          <View style={styles.reviewActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.actionBtnOutlineText}>Save to Collection</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => setShowCreate(true)}
            >
              <Text style={styles.primaryBtnText}>Create New Collection</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.startOverText}>Start Over</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CollectionPickerModal
        visible={showPicker}
        places={places}
        onSaved={handleSaved}
        onCancel={() => setShowPicker(false)}
      />

      <CreateCollectionModal
        visible={showCreate}
        places={places}
        onSaved={handleSaved}
        onCancel={() => setShowCreate(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa", padding: 20 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  closeBtn: { padding: 4 },
  section: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    fontSize: 15,
    color: "#1a1a1a",
  },
  mediaButtons: { flexDirection: "row", gap: 10, marginBottom: 8 },
  mediaPick: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    paddingVertical: 18,
    alignItems: "center",
  },
  mediaPickText: { fontSize: 15, color: "#4f46e5", fontWeight: "600" },
  thumbnailsRow: { marginBottom: 12 },
  thumbnailsContent: { flexDirection: "row", gap: 10, paddingVertical: 4 },
  thumbnailWrap: { width: 72, height: 72, position: "relative" },
  thumbnail: { width: 72, height: 72, borderRadius: 8 },
  thumbnailRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailRemoveText: { color: "#fff", fontSize: 18, fontWeight: "600", lineHeight: 20 },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "#666" },
  editBar: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  saveEditBtn: { backgroundColor: "#4f46e5", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  list: { flex: 1, marginBottom: 12 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  reviewActions: { gap: 10, paddingBottom: 10 },
  actionBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  actionBtnPrimary: { backgroundColor: "#4f46e5" },
  actionBtnOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#4f46e5" },
  actionBtnOutlineText: { color: "#4f46e5", fontSize: 16, fontWeight: "600" },
  startOverText: { textAlign: "center", color: "#999", fontSize: 15, paddingVertical: 8 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dividerText: { fontSize: 13, color: "#aaa", fontWeight: "500" },
  manualToggleBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4f46e5",
    paddingVertical: 12,
    alignItems: "center",
  },
  manualToggleText: { color: "#4f46e5", fontSize: 15, fontWeight: "600" },
  manualForm: { marginTop: 16 },
  notesInput: { minHeight: 80, textAlignVertical: "top" },
  primaryBtnDisabled: { backgroundColor: "#a5b4fc" },
});
