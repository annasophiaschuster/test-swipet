import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

/** Öffnet die Fotobibliothek — fragt Berechtigung und gibt das gewählte Asset zurück */
export async function pickSingleImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Kein Zugriff auf die Fotobibliothek. Bitte in den Einstellungen erlauben.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

/** Öffnet die Fotobibliothek für mehrere Bilder (max selectionLimit) */
export async function pickMultipleImages(
  selectionLimit = 5
): Promise<ImagePicker.ImagePickerAsset[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Kein Zugriff auf die Fotobibliothek. Bitte in den Einstellungen erlauben.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit,
    quality: 0.85,
  });
  if (result.canceled) return [];
  return result.assets;
}

/**
 * Lädt eine lokale Bild-URI in Supabase Storage hoch.
 * Gibt die öffentliche URL zurück.
 */
export async function uploadImageToStorage(
  bucket: string,
  path: string,
  uri: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
