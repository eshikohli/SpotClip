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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
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
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [places, setPlaces] = useState<ExtractedPlace[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

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

  // ── Pick video ───────────────────────────────────────────────────
  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
    });

    if (!result.canceled) {
      const a = result.assets[0];
      setMediaFiles((prev) => [
        ...prev,
        {
          uri: a.uri,
          name: a.fileName ?? `video-${Date.now()}.mp4`,
          type: a.mimeType ?? "video/mp4",
        },
      ]);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!tiktokUrl.trim()) {
      Alert.alert("Error", "Please enter a TikTok URL");
      return;
    }
    if (mediaFiles.length === 0) {
      Alert.alert("Error", "Please attach at least one media file");
      return;
    }

    setStep("loading");
    try {
      const response = await ingestClip(tiktokUrl, mediaFiles);
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

  // ── Reset ────────────────────────────────────────────────────────
  function handleReset() {
    setStep("input");
    setTiktokUrl("");
    setMediaFiles([]);
    setPlaces([]);
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
      {step === "input" && (
        <View style={styles.section}>
          <Text style={styles.label}>TikTok URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://tiktok.com/@user/video/..."
            placeholderTextColor="#aaa"
            value={tiktokUrl}
            onChangeText={setTiktokUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Media</Text>
          <View style={styles.mediaButtons}>
            <TouchableOpacity style={styles.mediaPick} onPress={pickImages}>
              <Text style={styles.mediaPickText}>+ Images</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaPick} onPress={pickVideo}>
              <Text style={styles.mediaPickText}>+ Video</Text>
            </TouchableOpacity>
          </View>
          {mediaFiles.length > 0 && (
            <Text style={styles.fileCount}>
              {mediaFiles.length} file{mediaFiles.length > 1 ? "s" : ""} selected
            </Text>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit}>
            <Text style={styles.primaryBtnText}>Extract Places</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Analyzing clip...</Text>
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
  fileCount: { fontSize: 13, color: "#666", marginBottom: 8 },
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
});
