import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Tabs: undefined;
  Upload: undefined;
  CollectionDetail: { collectionId: string };
  Favorites: undefined;
};

export type TabsScreenProps = NativeStackScreenProps<RootStackParamList, "Tabs">;
export type UploadScreenProps = NativeStackScreenProps<RootStackParamList, "Upload">;
export type CollectionDetailScreenProps = NativeStackScreenProps<RootStackParamList, "CollectionDetail">;
export type FavoritesScreenProps = NativeStackScreenProps<RootStackParamList, "Favorites">;
