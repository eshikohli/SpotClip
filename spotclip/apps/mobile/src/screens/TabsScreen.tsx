import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CollectionsScreen } from "./CollectionsScreen";
import { MapScreen } from "./MapScreen";
import { FloatingNavBar } from "../components/FloatingNavBar";
import type { TabsScreenProps } from "../navigation/types";

type ActiveTab = "collections" | "map";

export function TabsScreen({ navigation }: TabsScreenProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("collections");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const insets = useSafeAreaInsets();

  // Bump reloadTrigger whenever TabsScreen regains focus (returning from
  // CollectionDetail, Favorites, or after dismissing the Upload modal)
  useFocusEffect(
    useCallback(() => {
      setReloadTrigger((n) => n + 1);
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={[styles.pane, activeTab === "collections" && styles.paneVisible, { paddingTop: insets.top }]}>
        <CollectionsScreen
          reloadTrigger={reloadTrigger}
          onUpload={() => navigation.navigate("Upload")}
          onOpenCollection={(id) => navigation.navigate("CollectionDetail", { collectionId: id })}
          onOpenFavorites={() => navigation.navigate("Favorites")}
        />
      </View>
      <View style={[styles.pane, activeTab === "map" && styles.paneVisible]}>
        <MapScreen isActive={activeTab === "map"} />
      </View>
      <FloatingNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUploadPress={() => navigation.navigate("Upload")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  pane: { ...StyleSheet.absoluteFillObject, display: "none" },
  paneVisible: { display: "flex" },
});
