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

const GROESSEN = [
  { value: "klein", label: "Klein (< 10 kg)" },
  { value: "mittel", label: "Mittel (10–25 kg)" },
  { value: "gross", label: "Groß (25–45 kg)" },
  { value: "riese", label: "Riese (> 45 kg)" },
];
const GESCHLECHTER = [
  { value: "maennlich", label: "Männlich" },
  { value: "weiblich", label: "Weiblich" },
];
const ERFAHRUNG = [
  { value: "anfaenger", label: "🌱 Anfänger" },
  { value: "fortgeschritten", label: "⭐ Fortgeschrittene" },
  { value: "profi", label: "🏆 Nur Profis" },
];
const AKTIVITAET = [
  { value: "sportlich", label: "🏃 Sehr aktiv" },
  { value: "mittel", label: "🚶 Mäßig aktiv" },
  { value: "ruhig", label: "🛋 Ruhig" },
];
const KINDERFREUNDLICH = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
  { value: "ab_schulalter", label: "Ab Schulalter" },
  { value: "ab_teenager", label: "Ab Teenager" },
];
const CHARAKTER_OPTIONS = [
  "verspielt", "verschmust", "ruhig", "treu", "neugierig",
  "energetisch", "familienfreundlich", "lernfreudig",
];

const MAX_PHOTOS = 5;

export default function AddPetScreen() {
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
        Alert.alert("Maximum erreicht", `Du kannst maximal ${MAX_PHOTOS} Fotos hinzufügen.`);
        return;
      }
      const assets = await pickMultipleImages(remaining);
      if (assets.length > 0) {
        setSelectedPhotoUris((prev) => [...prev, ...assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  const removePhoto = (index: number) =>
    setSelectedPhotoUris((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Fehler", "Bitte einen Namen eingeben.");
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

      Alert.alert("Gespeichert! 🎉", `${name} wurde zur Adoption eingetragen.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Speichern fehlgeschlagen.");
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
        <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>Hund hinzufügen</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 80, gap: 20 }} keyboardShouldPersistTaps="handled">

        {/* ── Fotos ── */}
        <Section title="Fotos">
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginBottom: 10 }}>
            Bis zu {MAX_PHOTOS} Fotos · {selectedPhotoUris.length}/{MAX_PHOTOS} ausgewählt
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

        {/* Grunddaten */}
        <Section title="Grunddaten">
          <InputField label="Name *" value={name} onChangeText={setName} placeholder="z.B. Max" />
          <InputField label="Rasse" value={rasse} onChangeText={setRasse} placeholder="z.B. Labrador Retriever" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <InputField label="Alter (Jahre)" value={alterJahre} onChangeText={setAlterJahre} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Alter (Monate)" value={alterMonate} onChangeText={setAlterMonate} placeholder="0" keyboardType="numeric" />
            </View>
          </View>
        </Section>

        {/* Geschlecht */}
        <Section title="Geschlecht">
          <View style={{ flexDirection: "row", gap: 10 }}>
            {GESCHLECHTER.map((g) => (
              <Chip key={g.value} label={g.label} selected={geschlecht === g.value} onPress={() => setGeschlecht(g.value)} />
            ))}
          </View>
        </Section>

        {/* Größe */}
        <Section title="Größe">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GROESSEN.map((g) => (
              <Chip key={g.value} label={g.label} selected={groesse === g.value} onPress={() => setGroesse(g.value)} />
            ))}
          </View>
        </Section>

        {/* Charakter */}
        <Section title="Charakter-Tags">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CHARAKTER_OPTIONS.map((tag) => (
              <Chip key={tag} label={tag} selected={charakterTags.includes(tag)} onPress={() => toggleTag(tag)} />
            ))}
          </View>
        </Section>

        {/* Eigenschaften */}
        <Section title="Eigenschaften">
          <ToggleRow label="Kastriert" value={kastriert} onToggle={setKastriert} />
          <ToggleRow label="Braucht Garten" value={brauchtGarten} onToggle={setBrauchtGarten} />
          <ToggleRow label="Verträglich mit anderen Tieren" value={vertraeglich} onToggle={setVertraeglich} />
        </Section>

        {/* Kinderfreundlich */}
        <Section title="Kinderfreundlich">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {KINDERFREUNDLICH.map((k) => (
              <Chip key={k.value} label={k.label} selected={kinderfreundlich === k.value} onPress={() => setKinderfreundlich(k.value)} />
            ))}
          </View>
        </Section>

        {/* Erfahrung */}
        <Section title="Benötigte Erfahrung">
          <View style={{ gap: 8 }}>
            {ERFAHRUNG.map((e) => (
              <Chip key={e.value} label={e.label} selected={erfahrung === e.value} onPress={() => setErfahrung(e.value)} fullWidth />
            ))}
          </View>
        </Section>

        {/* Aktivität */}
        <Section title="Aktivitätslevel">
          <View style={{ gap: 8 }}>
            {AKTIVITAET.map((a) => (
              <Chip key={a.value} label={a.label} selected={aktivitaet === a.value} onPress={() => setAktivitaet(a.value)} fullWidth />
            ))}
          </View>
        </Section>

        {/* Beschreibung */}
        <Section title="Beschreibung">
          <TextInput
            value={beschreibung}
            onChangeText={setBeschreibung}
            placeholder="Erzähl etwas über den Hund…"
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
                {uploadingPhotos ? "Fotos werden hochgeladen…" : "Wird gespeichert…"}
              </Text>
            </View>
          ) : (
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
              🐾 Hund speichern
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
