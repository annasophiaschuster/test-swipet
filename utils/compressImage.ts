import * as ImageManipulator from "expo-image-manipulator";

/**
 * Komprimiert ein lokales Bild auf eine Ziel-Breite und JPEG-Qualität.
 * Gibt die URI des komprimierten Bildes zurück.
 *
 * Empfohlene Werte:
 *   Avatar:     maxWidth=400,  quality=0.80  → ~30–80 KB
 *   Pet-Fotos:  maxWidth=1200, quality=0.82  → ~150–400 KB
 */
export async function compressImage(
  uri: string,
  maxWidth: number,
  quality: number
): Promise<string> {
  const before = await getFileSizeKB(uri);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );

  const after = await getFileSizeKB(result.uri);
  const reduction = before > 0 ? Math.round((1 - after / before) * 100) : 0;

  console.log(
    `[compress] ${before} KB → ${after} KB (−${reduction}%, maxWidth=${maxWidth})`
  );

  return result.uri;
}

/**
 * Schätzt die Dateigröße einer lokalen URI in KB via fetch + blob.
 * Gibt 0 zurück wenn nicht ermittelbar (kein Blocking des Upload-Flows).
 */
async function getFileSizeKB(uri: string): Promise<number> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return Math.round(blob.size / 1024);
  } catch {
    return 0;
  }
}
