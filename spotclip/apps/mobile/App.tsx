import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./src/navigation/types";
import { MainScreen } from "./src/screens/MainScreen";
import { UploadScreen } from "./src/screens/UploadScreen";
import { CollectionsScreen } from "./src/screens/CollectionsScreen";
import { CollectionDetailScreen } from "./src/screens/CollectionDetailScreen";
import { FavoritesDetailScreen } from "./src/screens/FavoritesDetailScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerStyle: { backgroundColor: "#fafafa" },
          headerTintColor: "#1a1a1a",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#fafafa" },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Upload"
          component={UploadScreen}
          options={{ title: "Upload a Spot" }}
        />
        <Stack.Screen
          name="Collections"
          component={CollectionsScreen}
          options={{ title: "Collections" }}
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
  );
}
