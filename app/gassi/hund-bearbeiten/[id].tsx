import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { pickMultipleImages, uploadImageToStorage } from "../../../lib/storage";
import { useLanguage } from "../../../contexts/LanguageContext";

const MAX_PHOTOS = 3;

export default function HundBearbeitenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();

  const GROESSE_OPTIONS = [
    { key: "klein",  label: t.filter_size_small },
    { key: "mittel", label: t.filter_size_medium },
    { key: "gross",  label: t.filter_size_large },
    { key: "riese",  label: t.filter_size_giant },
  ];
  const AKTIV_OPTIONS = [
    { key: "ruhig",     label: t.gassi_profil_activity_calm },
    { key: "mittel",    label: t.gassi_profil_activity_medium },
    { key: "sportlich", label: t.gassi_profil_activity_athletic },
  ];
  const GESCHLECHT_OPTIONS = [
    { key: "maennlich", label: t.shelter_gender_male },
    { key: "weiblich",  label: t.shelter_gender_female },
  ];
  const CHARAKTER_OPTIONS = [
    t.shelter_traits_playful,
    t.shelter_traits_cuddly,
    t.shelter_traits_calm,
    t.shelter_traits_loyal,
    t.shelter_traits_curious,
    t.shelter_traits_energetic,
    t.shelter_traits_family,
    t.shelter_traits_eager,
  ];

  // Form state
  const [name, setName]                   = useState("");
  const [rasse, setRasse]                 = useState("");
  const [alterJahre, setAlterJahre]       = useState("");
  const [groesse, setGroesse]             = useState<string>("");
  const [geschlecht, setGeschlecht]       = useState<string>("");
  const [aktivitaet, setAktivitaet]       = useState<string>("");
  const [kastriert, setKastriert]         = useState<boolean | null>(null);
  const [vertraeglich, setVertraeglich]   = useState<boolean | null>(null);
  const [charakterTags, setCharakterTags] = useState<string[]>([]);
  const [beschreibung, setBeschreibung]   = useState("");
  const [photos, setPhotos]               = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => { loadDog(); }, [id]);

  const loadDog = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("owner_pets")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (!data) return;

      setName(data.name ?? "");
      setRasse(data.rasse ?? "");
      setAlterJahre(data.alter_jahre != null ? String(data.alter_jahre) : "");
      setGroesse(data.groesse_kategorie ?? "");
      setGeschlecht(data.geschlecht ?? "");
      setAktivitaet(data.aktivitaetslevel ?? "");
      setKastriert(data.kastriert ?? null);
      setVertraeglich(data.vertraeglich_mit_tieren ?? null);
      setCharakterTags(data.charakter_tags ?? []);
      setBeschreibung(data.beschreibung ?? "");
      // Load photos: use foto_urls array if available, else foto_url
      const urls: string[] = data.foto_urls ?? (data.foto_url ? [data.foto_url] : []);
      setPhotos(urls);
    } catch (e) {
      console.error("HundBearbeiten.loadDog", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhotos = async () => {
    try {
      const assets = await pickMultipleImages(MAX_PHOTOS);
      if (!assets || assets.length === 0) return;
      setPhotos((prev) => {
        const combined = [...prev, ...assets.map((a) => a.uri)];
        return combined.slice(0, MAX_PHOTOS);
      });
    } catch (e: any) {
      Alert.alert(t.err_generic, e.message);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleChar = (tag: string) => {
    setCharakterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t.err_generic, t.shelter_add_err_name);
      return;
    }
    if (!id) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.err_not_logged_in);

      // Upload any new (local) photos
      setUploadingPhotos(true);
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i];
        if (uri.startsWith("http")) {
          uploadedUrls.push(uri);
        } else {
          const fileName = `${user.id}_${Date.now()}_${i}.jpg`;
          const url = await uploadImageToStorage("pet-photos", fileName, uri);
          uploadedUrls.push(url);
        }
      }
      setUploadingPhotos(false);

      const { error } = await supabase
        .from("owner_pets")
        .update({
          name:             name.trim(),
          rasse:            rasse.trim() || null,
          alter_jahre:      alterJahre ? parseInt(alterJahre) : null,
          groesse_kategorie: groesse || null,
          geschlecht:       geschlecht || null,
          kastriert:        kastriert,
          aktivitaetslevel: aktivitaet || null,
          vertraeglich_mit_tieren: vertraeglich,
          charakter_tags:   charakterTags.length > 0 ? charakterTags : null,
          beschreibung:     beschreibung.trim() || null,
          foto_url:         uploadedUrls[0] ?? null,
          foto_urls:        uploadedUrls,
        })
        .eq("id", id);

      if (error) throw error;
      router.back();
    } catch (err: any) {
      Alert.alert(t.err_generic, err.message);
    } finally {
      setSaving(false);
      setUploadingPhotos(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t.gassi_dog_delete_title ?? "Hund löschen",
      t.gassi_dog_delete_confirm ?? "Möchtest du dieses Profil wirklich löschen?",
      [
        { text: t.profil_cancel, style: "cancel" },
        {
          text: t.gassi_dog_delete_btn ?? "Löschen",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("owner_pets")
                .delete()
                .eq("id", id);
              if (error) throw error;
              router.back();
            } catch (e: any) {
              Alert.alert(t.err_generic, e.message);
            }
          },
        },
      ]
    );
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const Pill = ({
    label,
    selected,
    onPress,
    color = Colors.SECONDARY,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        selected && { backgroundColor: color + "18", borderColor: color },
      ]}
    >
      <Text style={[styles.pillText, selected && { color, fontWeight: "600" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.SECONDARY} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerCancel}>{t.profil_cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🐶 {t.gassi_dog_edit_title ?? "Hund bearbeiten"}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.SECONDARY} size="small" />
          ) : (
            <Text style={[styles.headerSave, { color: Colors.SECONDARY }]}>
              {t.gassi_profil_save}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photos */}
        <Text style={styles.fieldLabel}>{t.shelter_add_section_photos}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {photos.map((uri, idx) => (
            <View key={idx} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.photoImg} />
              <TouchableOpacity
                onPress={() => removePhoto(idx)}
                style={styles.photoRemove}
              >
                <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity onPress={handlePickPhotos} style={styles.photoAdd}>
              {uploadingPhotos
                ? <ActivityIndicator color={Colors.SECONDARY} />
                : <Text style={{ fontSize: 28, color: Colors.SECONDARY }}>+</Text>
              }
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Name */}
        <Text style={styles.fieldLabel}>{t.shelter_add_label_name}</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. Bello"
          placeholderTextColor={Colors.TEXT_MUTED}
          value={name}
          onChangeText={setName}
        />

        {/* Rasse */}
        <Text style={styles.fieldLabel}>{t.shelter_add_label_breed}</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. Labrador Mix"
          placeholderTextColor={Colors.TEXT_MUTED}
          value={rasse}
          onChangeText={setRasse}
        />

        {/* Alter */}
        <Text style={styles.fieldLabel}>{t.shelter_add_label_age_years}</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. 3"
          placeholderTextColor={Colors.TEXT_MUTED}
          value={alterJahre}
          onChangeText={setAlterJahre}
          keyboardType="number-pad"
        />

        {/* Größe */}
        <Text style={styles.fieldLabel}>{t.filter_size}</Text>
        <View style={styles.pillRow}>
          {GROESSE_OPTIONS.map((o) => (
            <Pill
              key={o.key}
              label={o.label}
              selected={groesse === o.key}
              onPress={() => setGroesse(o.key)}
            />
          ))}
        </View>

        {/* Geschlecht */}
        <Text style={styles.fieldLabel}>{t.filter_gender}</Text>
        <View style={styles.pillRow}>
          {GESCHLECHT_OPTIONS.map((o) => (
            <Pill
              key={o.key}
              label={o.label}
              selected={geschlecht === o.key}
              onPress={() => setGeschlecht(o.key)}
            />
          ))}
        </View>

        {/* Aktivitätslevel */}
        <Text style={styles.fieldLabel}>{t.filter_activity}</Text>
        <View style={styles.pillRow}>
          {AKTIV_OPTIONS.map((o) => (
            <Pill
              key={o.key}
              label={o.label}
              selected={aktivitaet === o.key}
              onPress={() => setAktivitaet(o.key)}
            />
          ))}
        </View>

        {/* Kastriert */}
        <Text style={styles.fieldLabel}>{t.shelter_neutered}</Text>
        <View style={[styles.pillRow, { gap: 10 }]}>
          {[{ v: true, l: t.adoption_profil_yes }, { v: false, l: t.adoption_profil_no }].map(
            ({ v, l }) => (
              <TouchableOpacity
                key={String(v)}
                onPress={() => setKastriert(v)}
                style={[
                  styles.boolBtn,
                  kastriert === v && {
                    borderColor: Colors.SECONDARY,
                    backgroundColor: Colors.SECONDARY + "15",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.boolBtnText,
                    kastriert === v && { color: Colors.SECONDARY, fontWeight: "600" },
                  ]}
                >
                  {l}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Verträglich mit anderen Hunden */}
        <Text style={styles.fieldLabel}>{t.filter_other_animals}</Text>
        <View style={[styles.pillRow, { gap: 10 }]}>
          {[{ v: true, l: "✅ " + t.filter_yes }, { v: false, l: "✕ " + t.filter_doesnt_matter }].map(
            ({ v, l }) => (
              <TouchableOpacity
                key={String(v)}
                onPress={() => setVertraeglich(v)}
                style={[
                  styles.boolBtn,
                  vertraeglich === v && {
                    borderColor: Colors.SECONDARY,
                    backgroundColor: Colors.SECONDARY + "15",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.boolBtnText,
                    vertraeglich === v && { color: Colors.SECONDARY, fontWeight: "600" },
                  ]}
                >
                  {l}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Charakter */}
        <Text style={styles.fieldLabel}>{t.shelter_add_section_char}</Text>
        <View style={styles.pillRow}>
          {CHARAKTER_OPTIONS.map((tag) => (
            <Pill
              key={tag}
              label={tag}
              selected={charakterTags.includes(tag)}
              onPress={() => toggleChar(tag)}
            />
          ))}
        </View>

        {/* Beschreibung */}
        <Text style={styles.fieldLabel}>{t.shelter_add_section_desc}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t.shelter_add_placeholder_desc}
          placeholderTextColor={Colors.TEXT_MUTED}
          value={beschreibung}
          onChangeText={setBeschreibung}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          style={{
            marginTop: 8,
            height: Sizes.BUTTON_HEIGHT,
            borderWidth: 1.5,
            borderColor: Colors.ERROR,
            borderRadius: Sizes.RADIUS_FULL,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
            {t.gassi_dog_delete_btn ?? "Profil löschen"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerCancel: { fontSize: 15, color: Colors.TEXT_MUTED },
  headerTitle:  { fontSize: 17, fontWeight: "700", color: Colors.TEXT },
  headerSave:   { fontSize: 15, fontWeight: "700" },

  scroll: { padding: 20, paddingBottom: 60 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: Sizes.RADIUS_MD,
    paddingHorizontal: 14,
    height: Sizes.INPUT_HEIGHT,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.SURFACE,
    marginBottom: 18,
  },
  textArea: {
    height: undefined,
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Sizes.RADIUS_FULL,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.SURFACE,
  },
  pillText: { fontSize: 13, color: Colors.TEXT_MUTED },

  boolBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    alignItems: "center",
    backgroundColor: Colors.SURFACE,
  },
  boolBtnText: { fontSize: 13, color: Colors.TEXT_MUTED },

  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 10,
    position: "relative",
    backgroundColor: Colors.SURFACE,
  },
  photoImg: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.SECONDARY,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.SECONDARY + "08",
  },
});
