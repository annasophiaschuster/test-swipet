import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { uploadImageToStorage } from "../../../lib/storage";

const { width: W } = Dimensions.get("window");
const PHOTO_SIZE = (W - 48 - 16) / 3; // 3 per row with padding + gaps

const TOTAL_STEPS = 4;

// Same character tags as shelter pet add screen
const CHARAKTER_TAGS = [
  "verspielt", "verschmust", "ruhig", "treu", "neugierig",
  "energetisch", "lernfreudig", "familienfreundlich",
  "anhänglich", "selbstständig", "ängstlich", "dominant",
  "vorsichtig mit Fremden",
];

const INTERESSEN_LIST = [
  "Wandern", "Joggen", "Radfahren", "Schwimmen", "Yoga", "Fitness",
  "Klettern", "Surfen", "Skifahren", "Tanzen", "Kampfsport", "Reiten",
  "Tennis", "Fußball", "Basketball", "Volleyball", "Golf", "Segeln",
  "Tauchen", "Camping", "Kochen", "Backen", "Grillen", "Kaffee trinken",
  "Wein trinken", "Craft Beer", "Restaurants entdecken", "Vegane Küche",
  "Reisen", "Roadtrips", "Städtetrips", "Backpacking", "Musik",
  "Konzerte", "Festivals", "Gitarre", "Piano", "Singen", "DJ",
  "Theater", "Kino", "Serien", "Gaming", "Lesen", "Podcasts",
  "Fotografie", "Zeichnen", "Malen", "Design", "Mode", "Shopping",
  "Kunst", "Museen", "Nachhaltigkeit", "Ehrenamt", "Tiere", "Natur",
  "Gartenarbeit", "Meditation", "Selbstentwicklung", "Sprachen lernen",
  "Technik", "Programmieren", "Unternehmertum",
];

type DogSize       = "klein" | "mittel" | "gross";
type DogGender     = "maennlich" | "weiblich";
type EnergyLevel   = "ruhig" | "mittel" | "sportlich";
type DogFriendly   = "ja" | "nein" | "kommt_drauf_an";
type AlterEinheit  = "monate" | "jahre";

export default function TierhalterOnboarding() {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);

  // ── Step 2: Hundeprofil ──────────────────────────────────────────────────
  const [dogName, setDogName]                   = useState("");
  const [dogRasse, setDogRasse]                 = useState("");
  const [dogAlterZahl, setDogAlterZahl]         = useState("");
  const [dogAlterEinheit, setDogAlterEinheit]   = useState<AlterEinheit>("jahre");
  const [dogGroesse, setDogGroesse]             = useState<DogSize | null>(null);
  const [dogGeschlecht, setDogGeschlecht]       = useState<DogGender | null>(null);
  const [dogEnergie, setDogEnergie]             = useState<EnergyLevel | null>(null);
  const [dogAnimalFriendly, setDogAnimalFriendly] = useState<DogFriendly | null>(null);
  const [dogKinderlieb, setDogKinderlieb]       = useState<boolean | null>(null);
  const [dogKastriert, setDogKastriert]         = useState<boolean | null>(null);
  const [dogTags, setDogTags]                   = useState<string[]>([]);
  const [dogDesc, setDogDesc]                   = useState("");
  const [dogPhotoUris, setDogPhotoUris]         = useState<(string | null)[]>([null, null, null, null, null, null]);

  // ── Step 3: Menschenprofil ───────────────────────────────────────────────
  const [vorname, setVorname]       = useState("");
  const [alter, setAlter]           = useState("");
  const [stadtteil, setStadtteil]   = useState("");
  const [avatarUri, setAvatarUri]   = useState<string | null>(null);
  const [interessen, setInteressen] = useState<string[]>([]);
  const [bio, setBio]               = useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────
  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const toggleTag = (tag: string) => {
    setDogTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleInteresse = (item: string) => {
    setInteressen((prev) => {
      if (prev.includes(item)) return prev.filter((i) => i !== item);
      if (prev.length >= 5) {
        Alert.alert("Maximum erreicht", "Du kannst maximal 5 Interessen auswählen.");
        return prev;
      }
      return [...prev, item];
    });
  };

  const pickDogPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setDogPhotoUris((prev) => {
        const next = [...prev];
        next[index] = result.assets[0].uri;
        return next;
      });
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const validateStep2 = () => {
    if (!dogName.trim()) {
      Alert.alert("Pflichtfeld fehlt", "Bitte gib deinem Hund einen Namen.");
      return false;
    }
    if (!dogPhotoUris[0]) {
      Alert.alert("Foto fehlt", "Bitte lade mindestens 1 Foto hoch.");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!vorname.trim()) {
      Alert.alert("Pflichtfeld fehlt", "Bitte gib deinen Vornamen ein.");
      return false;
    }
    if (!stadtteil.trim()) {
      Alert.alert("Pflichtfeld fehlt", "Bitte gib deinen Stadtteil ein.");
      return false;
    }
    if (!avatarUri) {
      Alert.alert("Foto fehlt", "Bitte lade ein Profilfoto hoch.");
      return false;
    }
    return true;
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      // Upload avatar
      let avatarUrl: string | null = null;
      if (avatarUri) {
        avatarUrl = await uploadImageToStorage("avatars", `${user.id}_avatar.jpg`, avatarUri);
      }

      // Upload dog photos
      const validPhotoUris = dogPhotoUris.filter(Boolean) as string[];
      const fotoUrls: string[] = [];
      for (let i = 0; i < validPhotoUris.length; i++) {
        const url = await uploadImageToStorage("pet-photos", `${user.id}_dog_${i}.jpg`, validPhotoUris[i]);
        if (url) fotoUrls.push(url);
      }

      // Alter in Jahre umrechnen
      const dogAlterJahre = dogAlterZahl
        ? dogAlterEinheit === "jahre"
          ? parseInt(dogAlterZahl)
          : Math.round(parseInt(dogAlterZahl) / 12)
        : null;

      // Hund in owner_pets speichern (für Gassi-Feed)
      const { error: dogError } = await supabase.from("owner_pets").insert({
        owner_id:             user.id,
        name:                 dogName.trim(),
        tierart:              "hund",
        rasse:                dogRasse.trim() || null,
        groesse_kategorie:    dogGroesse,
        alter_jahre:          dogAlterJahre,
        geschlecht:           dogGeschlecht,
        aktivitaetslevel:     dogEnergie,
        vertraeglich_mit_tieren: dogAnimalFriendly === "ja",
        kinderfreundlich:     dogKinderlieb ?? false,
        kastriert:            dogKastriert ?? false,
        charakter_tags:       dogTags,
        beschreibung:         dogDesc.trim() || null,
        foto_url:             fotoUrls[0] ?? null,
        modus:                "gassi",
      });
      if (dogError) throw dogError;

      // Menschenprofil in profiles speichern
      const { error: profileError } = await supabase.from("profiles").upsert({
        id:         user.id,
        role:       "tierhalter",
        name:       vorname.trim(),
        city:       stadtteil.trim(),
        avatar_url: avatarUrl,
        bio:        bio.trim() || null,
      });
      if (profileError) throw profileError;

      router.replace("/gassi/feed");
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>

      {/* Progress bar (Steps 2 + 3) */}
      {step >= 2 && step <= 3 && (
        <View style={s.progressWrap}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${((step - 1) / 2) * 100}%` }]} />
          </View>
          <Text style={s.progressText}>Schritt {step - 1} von 2</Text>
        </View>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ─────────────────────────── STEP 1: WILLKOMMEN ─────────────────────────── */}
        {step === 1 && (
          <View style={s.centerBlock}>
            {/* Hundepfoten in rosa */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 24 }}>
              <Ionicons name="paw" size={28} color={Colors.PRIMARY} style={{ opacity: 0.6 }} />
              <Ionicons name="paw" size={44} color={Colors.PRIMARY} />
              <Ionicons name="paw" size={28} color={Colors.PRIMARY} style={{ opacity: 0.6 }} />
            </View>

            <Text style={s.welcomeTitle}>Finde deine{"\n"}Gassi Community</Text>
            <Text style={s.welcomeSub}>
              Vernetze dich mit anderen Hundebesitzern in deiner Nähe.
            </Text>

            {/* Bullet Points mit Checkmarks */}
            <View style={s.featureList}>
              {[
                "Hundeprofile anlegen",
                "Gassibegleitung finden",
                "Direkt verabreden",
              ].map((label) => (
                <View key={label} style={s.featureRow}>
                  <View style={s.checkCircle}>
                    <Ionicons name="checkmark" size={14} color={Colors.PRIMARY} />
                  </View>
                  <Text style={s.featureText}>{label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: Colors.PRIMARY }]}
              onPress={goNext}
            >
              <Text style={s.primaryBtnText}>Los geht's</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─────────────────────────── STEP 2: HUNDEPROFIL ─────────────────────────── */}
        {step === 2 && (
          <View>
            <Text style={s.stepTitle}>Hundeprofil anlegen</Text>
            <Text style={s.stepSub}>Erzähl uns von deinem Vierbeiner.</Text>

            {/* Name */}
            <Text style={s.label}>
              Name <Text style={s.required}>*</Text>
            </Text>
            <TextInput
              style={s.input} value={dogName} onChangeText={setDogName}
              placeholder="z.B. Luna" placeholderTextColor={Colors.TEXT_MUTED}
            />

            {/* Rasse */}
            <Text style={s.label}>Rasse</Text>
            <TextInput
              style={s.input} value={dogRasse} onChangeText={setDogRasse}
              placeholder="z.B. Golden Retriever" placeholderTextColor={Colors.TEXT_MUTED}
            />

            {/* Alter + Einheit */}
            <Text style={s.label}>Alter</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={dogAlterZahl} onChangeText={setDogAlterZahl}
                placeholder="z.B. 3" keyboardType="numeric"
                placeholderTextColor={Colors.TEXT_MUTED}
              />
              <View style={{ flexDirection: "row", gap: 6 }}>
                {([["monate", "Monate"], ["jahre", "Jahre"]] as [AlterEinheit, string][]).map(([k, label]) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setDogAlterEinheit(k)}
                    style={[s.chip, dogAlterEinheit === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  >
                    <Text style={[s.chipText, dogAlterEinheit === k && { color: "#FFF" }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Größe */}
            <Text style={s.label}>Größe</Text>
            <View style={s.chipRow}>
              {([["klein", "Klein"], ["mittel", "Mittel"], ["gross", "Groß"]] as [DogSize, string][]).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  style={[s.chip, dogGroesse === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => setDogGroesse(k)}
                >
                  <Text style={[s.chipText, dogGroesse === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Geschlecht */}
            <Text style={s.label}>Geschlecht</Text>
            <View style={s.chipRow}>
              {([["maennlich", "♂ Männlich"], ["weiblich", "♀ Weiblich"]] as [DogGender, string][]).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  style={[s.chip, dogGeschlecht === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => setDogGeschlecht(k)}
                >
                  <Text style={[s.chipText, dogGeschlecht === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Energielevel */}
            <Text style={s.label}>Energielevel</Text>
            <View style={s.chipRow}>
              {([["ruhig", "Ruhig"], ["mittel", "Mittel"], ["sportlich", "Sehr aktiv"]] as [EnergyLevel, string][]).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  style={[s.chip, dogEnergie === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => setDogEnergie(k)}
                >
                  <Text style={[s.chipText, dogEnergie === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Verträglich mit anderen Hunden */}
            <Text style={s.label}>Verträglich mit anderen Hunden</Text>
            <View style={s.chipRow}>
              {([["ja", "Ja"], ["nein", "Nein"], ["kommt_drauf_an", "Kommt drauf an"]] as [DogFriendly, string][]).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  style={[s.chip, dogAnimalFriendly === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => setDogAnimalFriendly(k)}
                >
                  <Text style={[s.chipText, dogAnimalFriendly === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kinderlieb */}
            <Text style={s.label}>Kinderlieb</Text>
            <View style={s.chipRow}>
              {([true, false]).map((v) => (
                <TouchableOpacity
                  key={String(v)}
                  style={[s.chip, dogKinderlieb === v && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => setDogKinderlieb(v)}
                >
                  <Text style={[s.chipText, dogKinderlieb === v && { color: "#FFF" }]}>{v ? "Ja" : "Nein"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kastriert */}
            <Text style={s.label}>Kastriert</Text>
            <View style={s.chipRow}>
              {([true, false]).map((v) => (
                <TouchableOpacity
                  key={String(v)}
                  style={[s.chip, dogKastriert === v && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => setDogKastriert(v)}
                >
                  <Text style={[s.chipText, dogKastriert === v && { color: "#FFF" }]}>{v ? "Ja" : "Nein"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Charakter-Tags */}
            <Text style={s.label}>Charakter</Text>
            <View style={s.chipRow}>
              {CHARAKTER_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[s.chip, dogTags.includes(tag) && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[s.chipText, dogTags.includes(tag) && { color: "#FFF" }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Beschreibung */}
            <Text style={s.label}>
              Kurze Beschreibung{" "}
              <Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.input, { minHeight: 88, textAlignVertical: "top", paddingTop: 12 }]}
              value={dogDesc}
              onChangeText={(t) => setDogDesc(t.slice(0, 150))}
              placeholder="Was macht deinen Hund besonders?"
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline maxLength={150}
            />
            <Text style={s.charCount}>{dogDesc.length} / 150</Text>

            {/* Fotos */}
            <Text style={s.label}>
              Fotos{" "}
              <Text style={s.required}>*</Text>
              <Text style={s.optional}> (min. 1, bis zu 6)</Text>
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => pickDogPhoto(i)}
                  style={[
                    s.photoSlot,
                    dogPhotoUris[i] && { borderStyle: "solid", borderColor: Colors.PRIMARY },
                  ]}
                >
                  {dogPhotoUris[i] ? (
                    <Image source={{ uri: dogPhotoUris[i]! }} style={s.photoImg} />
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <Ionicons name="camera-outline" size={26} color={Colors.TEXT_MUTED} />
                      {i === 0 && (
                        <Text style={{ fontSize: 10, color: Colors.PRIMARY, marginTop: 4, fontWeight: "600" }}>
                          Pflicht
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─────────────────────────── STEP 3: MENSCHENPROFIL ─────────────────────────── */}
        {step === 3 && (
          <View>
            <Text style={s.stepTitle}>Dein Profil</Text>
            <Text style={s.stepSub}>Damit andere wissen, wer du bist.</Text>

            {/* Vorname */}
            <Text style={s.label}>
              Vorname <Text style={s.required}>*</Text>
            </Text>
            <TextInput
              style={s.input} value={vorname} onChangeText={setVorname}
              placeholder="z.B. Lisa" placeholderTextColor={Colors.TEXT_MUTED}
              autoCapitalize="words"
            />

            {/* Alter */}
            <Text style={s.label}>Alter</Text>
            <TextInput
              style={s.input} value={alter} onChangeText={setAlter}
              placeholder="z.B. 28" keyboardType="numeric"
              placeholderTextColor={Colors.TEXT_MUTED}
            />

            {/* Stadtteil */}
            <Text style={s.label}>
              Stadtteil / Ort <Text style={s.required}>*</Text>
            </Text>
            <TextInput
              style={s.input} value={stadtteil} onChangeText={setStadtteil}
              placeholder="z.B. München, Schwabing"
              placeholderTextColor={Colors.TEXT_MUTED}
            />

            {/* Profilfoto */}
            <Text style={s.label}>
              Profilfoto <Text style={s.required}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={pickAvatar}
              style={[s.avatarPicker, avatarUri && { borderColor: Colors.PRIMARY, borderStyle: "solid" }]}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%", borderRadius: 14 }} />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="person-circle-outline" size={52} color={Colors.TEXT_MUTED} />
                  <Text style={{ color: Colors.TEXT_MUTED, fontSize: 13, marginTop: 6 }}>Foto auswählen</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Interessen */}
            <Text style={s.label}>
              Interessen{" "}
              <Text style={s.optional}>(max. 5 auswählbar)</Text>
            </Text>
            <Text style={s.hint}>{interessen.length} / 5 ausgewählt</Text>
            <View style={[s.chipRow, { marginTop: 10 }]}>
              {INTERESSEN_LIST.map((item) => {
                const selected = interessen.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => toggleInteresse(item)}
                    style={[s.chip, selected && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  >
                    <Text style={[s.chipText, selected && { color: "#FFF" }]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bio */}
            <Text style={[s.label, { marginTop: 22 }]}>
              Ein Satz über dich{" "}
              <Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.input, { minHeight: 78, textAlignVertical: "top", paddingTop: 12 }]}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, 150))}
              placeholder="z.B. Immer auf der Suche nach neuen Lieblingsrouten..."
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline maxLength={150}
            />
            <Text style={s.charCount}>{bio.length} / 150</Text>
          </View>
        )}

        {/* ─────────────────────────── STEP 4: FERTIG ─────────────────────────── */}
        {step === 4 && (
          <View style={s.centerBlock}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 24 }}>
              <Ionicons name="paw" size={28} color={Colors.PRIMARY} style={{ opacity: 0.6 }} />
              <Ionicons name="paw" size={44} color={Colors.PRIMARY} />
              <Ionicons name="paw" size={28} color={Colors.PRIMARY} style={{ opacity: 0.6 }} />
            </View>
            <Text style={s.welcomeTitle}>Alles bereit!</Text>
            <Text style={s.welcomeSub}>
              Dein Profil ist angelegt. Jetzt kannst du Gassi-Partner in deiner Nähe finden.
            </Text>
            {loading ? (
              <ActivityIndicator color={Colors.PRIMARY} size="large" style={{ marginTop: 24 }} />
            ) : (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: Colors.PRIMARY }]}
                onPress={handleFinish}
              >
                <Text style={s.primaryBtnText}>Gassi Community entdecken</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>

      {/* Nav-Buttons (Steps 2 + 3) */}
      {step >= 2 && step <= 3 && (
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backBtnText}>Zurück</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: Colors.PRIMARY }]}
            onPress={() => {
              if (step === 2 && !validateStep2()) return;
              if (step === 3 && !validateStep3()) return;
              goNext();
            }}
          >
            <Text style={s.nextBtnText}>Weiter</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.BACKGROUND },
  scroll:        { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },

  // Progress
  progressWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 2 },
  progressBg:   { height: 4, backgroundColor: Colors.BORDER, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.PRIMARY, borderRadius: 2 },
  progressText: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 5, textAlign: "right" },

  // Welcome / Done
  centerBlock:  { alignItems: "center", paddingTop: 24 },
  welcomeTitle: {
    fontSize: 28, fontWeight: "800", color: Colors.TEXT,
    textAlign: "center", marginBottom: 12, lineHeight: 36,
  },
  welcomeSub: {
    fontSize: 15, color: Colors.TEXT_MUTED,
    textAlign: "center", lineHeight: 23, marginBottom: 32,
  },
  featureList: { width: "100%", marginBottom: 36, gap: 18 },
  featureRow:  { flexDirection: "row", alignItems: "center", gap: 14 },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.PRIMARY,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.PRIMARY + "12",
  },
  featureText: { fontSize: 16, color: Colors.TEXT, flex: 1, fontWeight: "500" },

  // Form steps
  stepTitle: { fontSize: 24, fontWeight: "800", color: Colors.TEXT, marginBottom: 6 },
  stepSub:   { fontSize: 15, color: Colors.TEXT_MUTED, lineHeight: 22, marginBottom: 20 },

  label:    { fontSize: 14, fontWeight: "600", color: Colors.TEXT, marginTop: 20, marginBottom: 8 },
  required: { color: Colors.PRIMARY, fontWeight: "700" },
  optional: { fontSize: 12, fontWeight: "400", color: Colors.TEXT_MUTED },
  hint:     { fontSize: 12, color: Colors.TEXT_MUTED },
  charCount:{ fontSize: 12, color: Colors.TEXT_MUTED, textAlign: "right", marginTop: 4 },

  input: {
    borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.TEXT, backgroundColor: Colors.BACKGROUND,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99,
    borderWidth: 1.5, borderColor: Colors.BORDER, backgroundColor: Colors.BACKGROUND,
  },
  chipText: { fontSize: 13, color: Colors.TEXT, fontWeight: "500" },

  // Photo grid
  photoSlot: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.BORDER, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.SURFACE, overflow: "hidden",
  },
  photoImg: { width: "100%", height: "100%" },

  // Avatar picker
  avatarPicker: {
    height: 148, borderWidth: 1.5, borderColor: Colors.BORDER,
    borderStyle: "dashed", borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.SURFACE, overflow: "hidden",
  },

  // Primary button
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    width: "100%", paddingVertical: 16, borderRadius: 14, marginTop: 8,
    shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Nav row
  navRow: {
    flexDirection: "row", paddingHorizontal: 20,
    paddingVertical: 14, gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.BORDER,
    backgroundColor: Colors.BACKGROUND,
  },
  backBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.BORDER, alignItems: "center" },
  backBtnText: { fontSize: 15, color: Colors.TEXT, fontWeight: "500" },
  nextBtn:     { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  nextBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
