import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Main: undefined;
  Upload: undefined;
  Collections: undefined;
  CollectionDetail: { collectionId: string };
  Favorites: undefined;
};

export type MainScreenProps = NativeStackScreenProps<RootStackParamList, "Main">;
export type UploadScreenProps = NativeStackScreenProps<RootStackParamList, "Upload">;
export type CollectionsScreenProps = NativeStackScreenProps<RootStackParamList, "Collections">;
export type CollectionDetailScreenProps = NativeStackScreenProps<RootStackParamList, "CollectionDetail">;
export type FavoritesScreenProps = NativeStackScreenProps<RootStackParamList, "Favorites">;
