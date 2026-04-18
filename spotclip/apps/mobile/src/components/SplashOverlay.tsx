import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

export function SplashOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <Text style={styles.title}>SpotClip</Text>
      <Text style={styles.subtitle}>Save places from social media videos</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fafafa",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9998,
  },
  title: { fontSize: 36, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 16, color: "#666", marginTop: 8 },
});
