import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Switch, Image, FlatList,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { pickMultipleImages, uploadImageToStorage } from "../../../lib/storage";
import { useLanguage } from "../../../contexts/LanguageContext";

const MAX_PHOTOS = 5;

export default function AddPetScreen() {
  const { t } = useLanguage();

  const GROESSEN = [
    { value: "klein", label: t.shelter_size_small },
    { value: "mittel", label: t.shelter_size_medium },
    { value: "gross", label: t.shelter_size_large },
    { value: "riese", label: t.shelter_size_giant },
  ];
  const GESCHLECHTER = [
    { value: "maennlich", label: t.shelter_gender_male },
    { value: "weiblich", label: t.shelter_gender_female },
  ];
  const ERFAHRUNG = [
    { value: "anfaenger", label: t.shelter_exp_beginner },
    { value: "fortgeschritten", label: t.shelter_exp_intermediate },
    { value: "profi", label: t.shelter_exp_pro },
  ];
  const AKTIVITAET = [
    { value: "sportlich", label: t.shelter_activity_very },
    { value: "mittel", label: t.shelter_activity_medium },
    { value: "ruhig", label: t.shelter_activity_calm },
  ];
  const KINDERFREUNDLICH = [
    { value: "ja", label: t.shelter_children_yes },
    { value: "nein", label: t.shelter_children_no },
    { value: "ab_schulalter", label: t.shelter_children_school },
    { value: "ab_teenager", label: t.shelter_children_teen },
  ];
  const CHARAKTER_OPTIONS = [
    t.shelter_traits_playful, t.shelter_traits_cuddly, t.shelter_traits_calm,
    t.shelter_traits_loyal, t.shelter_traits_curious, t.shelter_traits_energetic,
    t.shelter_traits_family, t.shelter_traits_eager,
  ];

  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Photos
  const [selectedPhotoUris, setSelectedPhotoUris] = useState<string[]>([]);

  // Basic info
  const [name, setName]               = useState("");
  const [rasse, setRasse]             = useState("");
  const [groesse, setGroesse]         = useState("mittel");
  const [alterJahre, setAlterJahre]   = useState("");
  const [alterMonate, setAlterMonate] = useState("");
  const [geschlecht, setGeschlecht]   = useState("maennlich");
  const [beschreibung, setBeschreibung] = useState("");

  // Eigenschaften
  const [kastriert, setKastriert]         = useState(false);
  const [brauchtGarten, setBrauchtGarten] = useState(false);
  const [vertraeglich, setVertraeglich]   = useState(true);
  const [kinderfreundlich, setKinderfreundlich] = useState("ja");
  const [erfahrung, setErfahrung]         = useState("anfaenger");
  const [aktivitaet, setAktivitaet]       = useState("mittel");
  const [charakterTags, setCharakterTags] = useState<string[]>([]);

  const toggleTag = (tag: string) =>
    setCharakterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handlePickPhotos = async () => {
    try {
      const remaining = MAX_PHOTOS - selectedPhotoUris.length;
      if (remaining <= 0) {
        Alert.alert(t.shelter_max_photos, t.shelter_max_photos_msg(MAX_PHOTOS));
        return;
      }
      const assets = await pickMultipleImages(remaining);
      if (assets.length > 0) {
        setSelectedPhotoUris((prev) => [...prev, ...assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
      }
    } catch (e: any) {
      Alert.alert(t.err_generic, e.message);
    }
  };

  const removePhoto = (index: number) =>
    setSelectedPhotoUris((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t.err_generic, t.shelter_add_err_name);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Pet einfügen
      const { data: pet, error: petErr } = await supabase
        .from("pets")
        .insert({
          shelter_id: user.id,
          name: name.trim(),
          tierart: "hund",
          rasse: rasse.trim() || null,
          groesse_kategorie: groesse,
          alter_jahre: alterJahre ? parseInt(alterJahre) : 0,
          alter_monate: alterMonate ? parseInt(alterMonate) : 0,
          geschlecht,
          beschreibung: beschreibung.trim() || null,
          kastriert,
          braucht_garten: brauchtGarten,
          vertraeglich_mit_tieren: vertraeglich,
          kinderfreundlich,
          erfahrung_benoetigt: erfahrung,
          aktivitaetslevel: aktivitaet,
          charakter_tags: charakterTags,
          status: "verfuegbar",
        })
        .select("id")
        .single();

      if (petErr) throw petErr;

      // 2. Fotos hochladen
      if (selectedPhotoUris.length > 0) {
        setUploadingPhotos(true);
        const photoRows: { pet_id: string; url: string; position: number }[] = [];

        for (let i = 0; i < selectedPhotoUris.length; i++) {
          try {
            const path = `${pet.id}/${i}.jpg`;
            const publicUrl = await uploadImageToStorage("pet-photos", path, selectedPhotoUris[i]);
            photoRows.push({ pet_id: pet.id, url: publicUrl, position: i });
          } catch (uploadErr: any) {
            console.warn(`Foto ${i + 1} Upload fehlgeschlagen:`, uploadErr.message);
          }
        }

        if (photoRows.length > 0) {
          await supabase.from("pet_photos").insert(photoRows);
        }
        setUploadingPhotos(false);
      }

      Alert.alert(t.shelter_add_saved_title, t.shelter_add_saved_msg(name), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(t.err_generic, e.message ?? t.gassi_profil_save_failed);
    } finally {
      setLoading(false);
      setUploadingPhotos(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.BORDER, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 20, color: Colors.PRIMARY }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>{t.shelter_add_title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 80, gap: 20 }} keyboardShouldPersistTaps="handled">

        {/* ── Photos ── */}
        <Section title={t.shelter_add_section_photos}>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginBottom: 10 }}>
            {t.shelter_add_photos_count(selectedPhotoUris.length, MAX_PHOTOS)}
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            {selectedPhotoUris.map((uri, idx) => (
              <View key={idx} style={{ position: "relative" }}>
                <Image
                  source={{ uri }}
                  style={{ width: 80, height: 80, borderRadius: Sizes.RADIUS_MD, backgroundColor: Colors.SURFACE }}
                />
                <TouchableOpacity
                  onPress={() => removePhoto(idx)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: Colors.ERROR,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ color: Colors.WHITE, fontSize: 12, fontWeight: "700" }}>✕</Text>
                </TouchableOpacity>
                {idx === 0 && (
                  <View style={{ position: "absolute", bottom: 4, left: 4, backgroundColor: Colors.PRIMARY, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: Colors.WHITE, fontSize: 9, fontWeight: "700" }}>COVER</Text>
                  </View>
                )}
              </View>
            ))}

            {selectedPhotoUris.length < MAX_PHOTOS && (
              <TouchableOpacity
                onPress={handlePickPhotos}
                style={{
                  width: 80, height: 80,
                  borderRadius: Sizes.RADIUS_MD,
                  borderWidth: 2, borderColor: Colors.BORDER,
                  borderStyle: "dashed",
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: Colors.SURFACE,
                }}
              >
                <Text style={{ fontSize: 28, color: Colors.TEXT_MUTED }}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </Section>

        {/* Basic Info */}
        <Section title={t.shelter_add_section_basics}>
          <InputField label={t.shelter_add_label_name} value={name} onChangeText={setName} placeholder={t.shelter_add_placeholder_name} />
          <InputField label={t.shelter_add_label_breed} value={rasse} onChangeText={setRasse} placeholder={t.shelter_add_placeholder_breed} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <InputField label={t.shelter_add_label_age_years} value={alterJahre} onChangeText={setAlterJahre} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label={t.shelter_add_label_age_months} value={alterMonate} onChangeText={setAlterMonate} placeholder="0" keyboardType="numeric" />
            </View>
          </View>
        </Section>

        {/* Gender */}
        <Section title={t.shelter_add_section_gender}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {GESCHLECHTER.map((g) => (
              <Chip key={g.value} label={g.label} selected={geschlecht === g.value} onPress={() => setGeschlecht(g.value)} />
            ))}
          </View>
        </Section>

        {/* Size */}
        <Section title={t.shelter_add_section_size}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GROESSEN.map((g) => (
              <Chip key={g.value} label={g.label} selected={groesse === g.value} onPress={() => setGroesse(g.value)} />
            ))}
          </View>
        </Section>

        {/* Character Tags */}
        <Section title={t.shelter_add_section_char}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CHARAKTER_OPTIONS.map((tag) => (
              <Chip key={tag} label={tag} selected={charakterTags.includes(tag)} onPress={() => toggleTag(tag)} />
            ))}
          </View>
        </Section>

        {/* Properties */}
        <Section title={t.shelter_add_section_props}>
          <ToggleRow label={t.shelter_neutered} value={kastriert} onToggle={setKastriert} />
          <ToggleRow label={t.shelter_add_label_garden} value={brauchtGarten} onToggle={setBrauchtGarten} />
          <ToggleRow label={t.shelter_add_label_animals} value={vertraeglich} onToggle={setVertraeglich} />
        </Section>

        {/* Child-friendly */}
        <Section title={t.shelter_add_section_children}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {KINDERFREUNDLICH.map((k) => (
              <Chip key={k.value} label={k.label} selected={kinderfreundlich === k.value} onPress={() => setKinderfreundlich(k.value)} />
            ))}
          </View>
        </Section>

        {/* Required Experience */}
        <Section title={t.shelter_add_section_exp}>
          <View style={{ gap: 8 }}>
            {ERFAHRUNG.map((e) => (
              <Chip key={e.value} label={e.label} selected={erfahrung === e.value} onPress={() => setErfahrung(e.value)} fullWidth />
            ))}
          </View>
        </Section>

        {/* Activity Level */}
        <Section title={t.shelter_add_section_activity}>
          <View style={{ gap: 8 }}>
            {AKTIVITAET.map((a) => (
              <Chip key={a.value} label={a.label} selected={aktivitaet === a.value} onPress={() => setAktivitaet(a.value)} fullWidth />
            ))}
          </View>
        </Section>

        {/* Description */}
        <Section title={t.shelter_add_section_desc}>
          <TextInput
            value={beschreibung}
            onChangeText={setBeschreibung}
            placeholder={t.shelter_add_placeholder_desc}
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline
            numberOfLines={4}
            style={{ backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, padding: 12, fontSize: Sizes.FONT_MD, color: Colors.TEXT, minHeight: 100, textAlignVertical: "top", borderWidth: 1, borderColor: Colors.BORDER }}
          />
        </Section>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{ height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center", marginTop: 4 }}
        >
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={Colors.WHITE} />
              <Text style={{ color: Colors.WHITE, fontWeight: "600" }}>
                {uploadingPhotos ? t.shelter_add_uploading : t.shelter_add_saving}
              </Text>
            </View>
          ) : (
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
              {t.shelter_add_save_btn}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.TEXT, marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}

function InputField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.TEXT_MUTED}
        keyboardType={keyboardType}
        style={{ height: Sizes.INPUT_HEIGHT, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, paddingHorizontal: 14, fontSize: Sizes.FONT_MD, color: Colors.TEXT, borderWidth: 1, borderColor: Colors.BORDER }}
      />
    </View>
  );
}

function Chip({ label, selected, onPress, fullWidth }: { label: string; selected: boolean; onPress: () => void; fullWidth?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: Sizes.RADIUS_FULL,
        backgroundColor: selected ? Colors.PRIMARY : Colors.SURFACE,
        borderWidth: 1.5,
        borderColor: selected ? Colors.PRIMARY : Colors.BORDER,
        ...(fullWidth ? { width: "100%" } : {}),
      }}
    >
      <Text style={{ color: selected ? Colors.WHITE : Colors.TEXT, fontWeight: selected ? "700" : "400", fontSize: 13, textAlign: fullWidth ? "center" : "left" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.BORDER }}>
      <Text style={{ fontSize: Sizes.FONT_MD, color: Colors.TEXT }}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: Colors.BORDER, true: Colors.PRIMARY }} thumbColor={Colors.WHITE} />
    </View>
  );
}
