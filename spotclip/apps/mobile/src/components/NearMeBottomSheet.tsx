import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NearbyPlace } from "../utils/nearbySpots";
import { getTagColor } from "../tagColors";

interface Props {
  visible: boolean;
  loading: boolean;
  spots: NearbyPlace[];
  onClose: () => void;
  onSpotPress: (spot: NearbyPlace) => void;
}

export function NearMeBottomSheet({ visible, loading, spots, onClose, onSpotPress }: Props) {
  const [mounted, setMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(420)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 420,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="box-none"
    >
      <View style={styles.handle} />

      <View style={styles.header}>
        <Ionicons name="location" size={16} color="#f97316" style={styles.headerIcon} />
        <Text style={styles.title}>Near Me</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#f97316" />
          <Text style={styles.stateText}>Finding nearby spots…</Text>
        </View>
      ) : spots.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="location-outline" size={36} color="#ccc" />
          <Text style={styles.stateText}>No saved spots within 5 miles</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={styles.list}
        >
          {spots.map((spot, idx) => (
            <TouchableOpacity
              key={spot.id}
              style={styles.item}
              onPress={() => onSpotPress(spot)}
              activeOpacity={0.7}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>

              <View style={styles.itemBody}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{spot.name}</Text>
                  <Text style={styles.itemDistance}>{spot.distanceMiles.toFixed(1)} mi</Text>
                </View>
                <Text style={styles.itemDesc} numberOfLines={1}>{spot.description}</Text>
                {(spot.tags ?? []).length > 0 && (
                  <View style={styles.tagRow}>
                    {(spot.tags ?? []).map((tag) => {
                      const { backgroundColor, color } = getTagColor(tag);
                      return (
                        <View key={tag} style={[styles.tag, { backgroundColor }]}>
                          <Text style={[styles.tagText, { color }]}>{tag}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
    maxHeight: 420,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  headerIcon: {
    marginRight: 6,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  stateBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: "#aaa",
  },
  list: {
    flexGrow: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff5ed",
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f97316",
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  itemDistance: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f97316",
  },
  itemDesc: {
    fontSize: 13,
    color: "#888",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
