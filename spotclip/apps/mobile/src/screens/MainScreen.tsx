import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { MainScreenProps } from "../navigation/types";

export function MainScreen({ navigation }: MainScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpotClip</Text>
      <Text style={styles.subtitle}>Save places from your favorite clips</Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("Upload")}
        >
          <Text style={styles.primaryBtnText}>Upload a New Spot</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, styles.secondaryBtn]}
          onPress={() => navigation.navigate("Collections")}
        >
          <Text style={styles.secondaryBtnText}>View Collections</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa", justifyContent: "center", padding: 20 },
  title: { fontSize: 36, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginTop: 8, marginBottom: 40 },
  buttons: { gap: 12 },
  primaryBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  secondaryBtn: { backgroundColor: "#e5e7eb" },
  secondaryBtnText: { color: "#333", fontSize: 17, fontWeight: "600" },
});
