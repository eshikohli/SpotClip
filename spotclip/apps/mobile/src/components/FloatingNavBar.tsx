import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActiveTab = "collections" | "map";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onUploadPress: () => void;
}

export function FloatingNavBar({ activeTab, onTabChange, onUploadPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: 32 + insets.bottom }]}>
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onTabChange("collections")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "collections" ? "library" : "library-outline"}
          size={24}
          color={activeTab === "collections" ? "#4f46e5" : "#999"}
        />
        <Text style={[styles.tabLabel, activeTab === "collections" && styles.tabLabelActive]}>
          Collections
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.uploadBtn} onPress={onUploadPress} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onTabChange("map")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "map" ? "map" : "map-outline"}
          size={24}
          color={activeTab === "map" ? "#4f46e5" : "#999"}
        />
        <Text style={[styles.tabLabel, activeTab === "map" && styles.tabLabelActive]}>
          Map
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 36,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: "500",
    color: "#999",
  },
  tabLabelActive: {
    color: "#4f46e5",
  },
  uploadBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -12,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
