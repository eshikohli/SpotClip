import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import * as Crypto from "expo-crypto";
import type { ExtractedPlace } from "@spotclip/shared";
import { addPlacesToCollection } from "../api";

interface Props {
  visible: boolean;
  places: ExtractedPlace[];
  onSaved: (collectionId: string) => void;
  onCancel: () => void;
}

export function CreateCollectionModal({ visible, places, onSaved, onCancel }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Use expo-crypto: uuid package uses crypto.getRandomValues(), which RN doesn't provide.
      const newId = Crypto.randomUUID();
      await addPlacesToCollection(newId, places, name.trim());
      setName("");
      setSaving(false);
      onSaved(newId);
    } catch (err) {
      setSaving(false);
      const message = err instanceof Error ? err.message : "Create failed";
      console.error("CreateCollectionModal create failed:", err);
      Alert.alert("Create failed", message);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Create New Collection</Text>

          <TextInput
            style={styles.input}
            placeholder="Collection name"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
            autoFocus
            editable={!saving}
          />

          {saving ? (
            <ActivityIndicator size="small" color="#4f46e5" style={styles.spinner} />
          ) : (
            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.disabledBtn]}
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <Text style={styles.createBtnText}>Create</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 16,
  },
  spinner: { marginVertical: 14 },
  createBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.5 },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 16, color: "#666", fontWeight: "500" },
});
