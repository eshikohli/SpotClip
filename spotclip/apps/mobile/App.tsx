import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./src/navigation/types";
import { ToastProvider } from "./src/ToastContext";
import { TabsScreen } from "./src/screens/TabsScreen";
import { UploadScreen } from "./src/screens/UploadScreen";
import { CollectionDetailScreen } from "./src/screens/CollectionDetailScreen";
import { FavoritesDetailScreen } from "./src/screens/FavoritesDetailScreen";
import { SplashOverlay } from "./src/components/SplashOverlay";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ToastProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Tabs"
          screenOptions={{
            headerStyle: { backgroundColor: "#fafafa" },
            headerTintColor: "#1a1a1a",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#fafafa" },
          }}
        >
          <Stack.Screen
            name="Tabs"
            component={TabsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Upload"
            component={UploadScreen}
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen
            name="CollectionDetail"
            component={CollectionDetailScreen}
            options={{ title: "Collection" }}
          />
          <Stack.Screen
            name="Favorites"
            component={FavoritesDetailScreen}
            options={{ title: "Favorites" }}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
      <SplashOverlay />
    </ToastProvider>
  );
}
