import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { pickMultipleImages, uploadImageToStorage } from "../../../lib/storage";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const BRAND   = Colors.PRIMARY;   // #CC96C1
const GREEN   = "#3B6D11";        // for Erfahrung active state
const MAX_PHOTOS = 10;

const CHARAKTER_TAGS = [
  "verspielt", "verschmust", "ruhig", "treu", "neugierig",
  "energetisch", "lernfreudig", "familienfreundlich",
  "anhänglich", "selbstständig", "ängstlich", "dominant",
  "vorsichtig mit Fremden",
];

const GROESSEN      = ["Klein", "Mittel", "Groß", "Riese"];
const GROESSEN_VAL  = ["klein", "mittel", "gross", "riese"];

const HERKUNFT      = ["Abgabetier", "Fundtier", "Auslandsrettung", "Beschlagnahmt"];
const HERKUNFT_VAL  = ["abgabetier", "fundtier", "auslandsrettung", "beschlagnahmt"];

const KINDERFREUNDLICH     = ["Ja", "Nein", "Ab Schulalter", "Ab Teenager"];
const KINDERFREUNDLICH_VAL = ["ja", "nein", "ab_schulalter", "ab_teenager"];

const AKTIVITAET     = ["Gemütlich", "Mittel", "Sehr aktiv"];
const AKTIVITAET_VAL = ["ruhig", "mittel", "sportlich"];

const ERFAHRUNG     = ["Anfänger", "Fortgeschrittene", "Nur Profis"];
const ERFAHRUNG_VAL = ["anfaenger", "fortgeschritten", "profi"];

const ALLEINE     = ["Nicht möglich", "bis 2 Std.", "bis 4 Std.", "bis 6 Std."];
const ALLEINE_VAL = ["nicht_moeglich", "bis_2h", "bis_4h", "bis_6h"];

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function AddPetScreen() {
  const [loading, setLoading]               = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Photos
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  // Basisdaten
  const [name, setName]             = useState("");
  const [geschlecht, setGeschlecht] = useState("maennlich");
  const [alterWert, setAlterWert]   = useState("");
  const [alterEinheit, setAlterEinheit] = useState<"jahre" | "monate">("jahre");
  const [rasse, setRasse]           = useState("");
  const [gewicht, setGewicht]       = useState("");
  const [groesse, setGroesse]       = useState("mittel");
  const [herkunft, setHerkunft]     = useState("");
  const [fellFarbe, setFellFarbe]   = useState("");

  // Charakter
  const [charakterTags, setCharakterTags]   = useState<string[]>([]);
  const [kinderfreundlich, setKinderfreundlich] = useState("ja");
  const [aktivitaet, setAktivitaet]         = useState("mittel");
  const [erfahrung, setErfahrung]           = useState("anfaenger");

  // Verträglichkeit & Haltung
  const [hundVertraeglich, setHundVertraeglich]   = useState(false);
  const [katzeVertraeglich, setKatzeVertraeglich] = useState(false);
  const [kleintierVertraeglich, setKleintierVertraeglich] = useState(false);
  const [stubenrein, setStubenrein]         = useState(false);
  const [leinenführig, setLeinenführig]     = useState(false);
  const [maulkorbpflicht, setMaulkorbpflicht] = useState(false);
  const [brauchtGarten, setBrauchtGarten]   = useState(false);
  const [alleineBleibt, setAlleineBleibt]   = useState("bis_4h");

  // Gesundheit
  const [geimpft, setGeimpft]     = useState(false);
  const [gechipt, setGechipt]     = useState(false);
  const [kastriert, setKastriert] = useState(false);
  const [entwurmt, setEntwurmt]   = useState(false);
  const [hatErkrankungen, setHatErkrankungen] = useState(false);
  const [erkrankungenText, setErkrankungenText] = useState("");

  // Beschreibung
  const [beschreibung, setBeschreibung]         = useState("");
  const [interneNotizen, setInterneNotizen]     = useState("");

  // ── helpers ──────────────────────────────
  const toggleTag = (tag: string) =>
    setCharakterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handlePickPhotos = async () => {
    try {
      const remaining = MAX_PHOTOS - photoUris.length;
      if (remaining <= 0) {
        Alert.alert("Maximale Anzahl erreicht", `Du kannst maximal ${MAX_PHOTOS} Fotos hinzufügen.`);
        return;
      }
      const assets = await pickMultipleImages(remaining);
      if (assets.length > 0) {
        setPhotoUris((prev) => [...prev, ...assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    }
  };

  const removePhoto = (idx: number) =>
    setPhotoUris((prev) => prev.filter((_, i) => i !== idx));

  // ── save ────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Pflichtfeld fehlt", "Bitte gib einen Namen für den Hund ein.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const jahre  = alterEinheit === "jahre"  ? parseInt(alterWert) || 0 : 0;
      const monate = alterEinheit === "monate" ? parseInt(alterWert) || 0 : 0;

      const { data: pet, error: petErr } = await supabase
        .from("pets")
        .insert({
          shelter_id: user.id,
          name: name.trim(),
          tierart: "hund",
          rasse: rasse.trim() || null,
          groesse_kategorie: groesse,
          alter_jahre: jahre,
          alter_monate: monate,
          geschlecht,
          beschreibung: beschreibung.trim() || null,
          kastriert,
          braucht_garten: brauchtGarten,
          vertraeglich_mit_tieren: hundVertraeglich || katzeVertraeglich || kleintierVertraeglich,
          kinderfreundlich,
          erfahrung_benoetigt: erfahrung,
          aktivitaetslevel: aktivitaet,
          charakter_tags: charakterTags,
          status: "verfuegbar",
          // extended fields
          herkunft: herkunft || null,
          gewicht: gewicht.trim() || null,
          fell_typ: null,
          fell_farbe: fellFarbe.trim() || null,
          hund_vertraeglich: hundVertraeglich,
          katze_vertraeglich: katzeVertraeglich,
          kleintier_vertraeglich: kleintierVertraeglich,
          stubenrein,
          leinenfuehrig: leinenführig,
          maulkorbpflicht,
          alleine_bleiben: alleineBleibt,
          geimpft,
          gechipt,
          entwurmt,
          erkrankungen: hatErkrankungen ? (erkrankungenText.trim() || "Ja") : null,
        } as any)
        .select("id")
        .single();

      if (petErr) throw petErr;

      if (photoUris.length > 0) {
        setUploadingPhotos(true);
        const rows: { pet_id: string; url: string; position: number }[] = [];
        for (let i = 0; i < photoUris.length; i++) {
          try {
            const path = `${pet.id}/${i}.jpg`;
            const url  = await uploadImageToStorage("pet-photos", path, photoUris[i]);
            rows.push({ pet_id: pet.id, url, position: i });
          } catch (e: any) {
            console.warn(`Foto ${i + 1} Upload fehlgeschlagen:`, e.message);
          }
        }
        if (rows.length > 0) await supabase.from("pet_photos").insert(rows);
        setUploadingPhotos(false);
      }

      Alert.alert("Gespeichert! 🎉", `${name} wurde erfolgreich veröffentlicht.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Speichern fehlgeschlagen.");
    } finally {
      setLoading(false);
      setUploadingPhotos(false);
    }
  };

  // ── render ──────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>

      {/* ── Pink Header ── */}
      <View style={{
        backgroundColor: BRAND,
        paddingTop: Platform.OS === "ios" ? 56 : 36,
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: "rgba(255,255,255,0.22)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20, color: "#fff", marginTop: -1 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 19, fontWeight: "800", color: "#fff", flex: 1 }}>
          Neues Hundeprofil
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Photo Upload Zone ── */}
        <TouchableOpacity
          onPress={handlePickPhotos}
          activeOpacity={0.75}
          style={{
            margin: 20, borderRadius: 16,
            backgroundColor: "#FFF0F3",
            borderWidth: 2, borderColor: BRAND + "44", borderStyle: "dashed",
            paddingVertical: photoUris.length > 0 ? 16 : 36,
            paddingHorizontal: 16,
            alignItems: photoUris.length > 0 ? "flex-start" : "center",
          }}
        >
          {photoUris.length === 0 ? (
            <>
              <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND, marginBottom: 4 }}>
                Fotos hinzufügen
              </Text>
              <Text style={{ fontSize: 13, color: BRAND + "99" }}>
                Bis zu 10 Bilder · 1 Video
              </Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {photoUris.map((uri, idx) => (
                  <View key={idx} style={{ position: "relative" }}>
                    <Image
                      source={{ uri }}
                      style={{ width: 76, height: 76, borderRadius: 10, backgroundColor: "#F5E6EA" }}
                    />
                    <TouchableOpacity
                      onPress={() => removePhoto(idx)}
                      style={{
                        position: "absolute", top: -6, right: -6,
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: Colors.ERROR,
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✕</Text>
                    </TouchableOpacity>
                    {idx === 0 && (
                      <View style={{
                        position: "absolute", bottom: 4, left: 4,
                        backgroundColor: BRAND, paddingHorizontal: 5,
                        paddingVertical: 2, borderRadius: 4,
                      }}>
                        <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800" }}>COVER</Text>
                      </View>
                    )}
                  </View>
                ))}
                {photoUris.length < MAX_PHOTOS && (
                  <View style={{
                    width: 76, height: 76, borderRadius: 10,
                    borderWidth: 2, borderColor: BRAND + "55", borderStyle: "dashed",
                    backgroundColor: "#FFF5F8",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 24, color: BRAND }}>＋</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: BRAND + "99" }}>
                {photoUris.length}/{MAX_PHOTOS} Fotos · Tippe zum Hinzufügen
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ══════════════════════════════════════
            BASISDATEN
        ══════════════════════════════════════ */}
        <SectionDivider />
        <SectionLabel>Basisdaten</SectionLabel>

        <View style={{ paddingHorizontal: 20, gap: 18 }}>

          {/* Name */}
          <View>
            <FieldLabel>Name</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="z.B. Luna"
              placeholderTextColor="#C5A8B0"
              style={inputStyle}
            />
          </View>

          {/* Geschlecht */}
          <View>
            <FieldLabel>Geschlecht</FieldLabel>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {["Männlich", "Weiblich"].map((label, i) => {
                const val = i === 0 ? "maennlich" : "weiblich";
                return (
                  <PillChip
                    key={val}
                    label={label}
                    selected={geschlecht === val}
                    onPress={() => setGeschlecht(val)}
                    flex
                  />
                );
              })}
            </View>
          </View>

          {/* Alter */}
          <View>
            <FieldLabel>Alter</FieldLabel>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TextInput
                value={alterWert}
                onChangeText={setAlterWert}
                placeholder="0"
                placeholderTextColor="#C5A8B0"
                keyboardType="numeric"
                style={[inputStyle, { flex: 1 }]}
              />
              {(["Jahre", "Monate"] as const).map((label) => {
                const val = label.toLowerCase() as "jahre" | "monate";
                return (
                  <PillChip
                    key={val}
                    label={label}
                    selected={alterEinheit === val}
                    onPress={() => setAlterEinheit(val)}
                  />
                );
              })}
            </View>
          </View>

          {/* Rasse + Gewicht */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 2 }}>
              <FieldLabel>Rasse</FieldLabel>
              <TextInput
                value={rasse}
                onChangeText={setRasse}
                placeholder="z.B. Labrador"
                placeholderTextColor="#C5A8B0"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Gewicht (kg)</FieldLabel>
              <TextInput
                value={gewicht}
                onChangeText={setGewicht}
                placeholder="0"
                placeholderTextColor="#C5A8B0"
                keyboardType="decimal-pad"
                style={inputStyle}
              />
            </View>
          </View>

          {/* Größe */}
          <View>
            <FieldLabel>Größe</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {GROESSEN.map((label, i) => (
                <PillChip
                  key={GROESSEN_VAL[i]}
                  label={label}
                  selected={groesse === GROESSEN_VAL[i]}
                  onPress={() => setGroesse(GROESSEN_VAL[i])}
                />
              ))}
            </View>
          </View>

          {/* Herkunft */}
          <View>
            <FieldLabel>Herkunft</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {HERKUNFT.map((label, i) => (
                <PillChip
                  key={HERKUNFT_VAL[i]}
                  label={label}
                  selected={herkunft === HERKUNFT_VAL[i]}
                  onPress={() => setHerkunft(herkunft === HERKUNFT_VAL[i] ? "" : HERKUNFT_VAL[i])}
                />
              ))}
            </View>
          </View>

          {/* Fell & Farbe */}
          <View>
            <FieldLabel>Fell & Farbe</FieldLabel>
            <TextInput
              value={fellFarbe}
              onChangeText={setFellFarbe}
              placeholder="z.B. kurz, schwarz-weiß"
              placeholderTextColor="#C5A8B0"
              style={inputStyle}
            />
          </View>

        </View>

        {/* ══════════════════════════════════════
            CHARAKTER
        ══════════════════════════════════════ */}
        <SectionDivider />
        <SectionLabel>Charakter</SectionLabel>

        <View style={{ paddingHorizontal: 20, gap: 18 }}>

          {/* Charakter Tags */}
          <View>
            <FieldLabel>Wesenseigenschaften</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CHARAKTER_TAGS.map((tag) => (
                <PillChip
                  key={tag}
                  label={tag}
                  selected={charakterTags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                />
              ))}
            </View>
          </View>

          {/* Kinderfreundlich */}
          <View>
            <FieldLabel>Kinderfreundlich</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {KINDERFREUNDLICH.map((label, i) => (
                <PillChip
                  key={KINDERFREUNDLICH_VAL[i]}
                  label={label}
                  selected={kinderfreundlich === KINDERFREUNDLICH_VAL[i]}
                  onPress={() => setKinderfreundlich(KINDERFREUNDLICH_VAL[i])}
                />
              ))}
            </View>
          </View>

          {/* Aktivitätsbedarf */}
          <View>
            <FieldLabel>Aktivitätsbedarf</FieldLabel>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {AKTIVITAET.map((label, i) => (
                <PillChip
                  key={AKTIVITAET_VAL[i]}
                  label={label}
                  selected={aktivitaet === AKTIVITAET_VAL[i]}
                  onPress={() => setAktivitaet(AKTIVITAET_VAL[i])}
                  flex
                />
              ))}
            </View>
          </View>

          {/* Benötigte Erfahrung */}
          <View>
            <FieldLabel>Benötigte Erfahrung</FieldLabel>
            <View style={{ gap: 8 }}>
              {ERFAHRUNG.map((label, i) => (
                <PillChip
                  key={ERFAHRUNG_VAL[i]}
                  label={label}
                  selected={erfahrung === ERFAHRUNG_VAL[i]}
                  onPress={() => setErfahrung(ERFAHRUNG_VAL[i])}
                  fullWidth
                />
              ))}
            </View>
          </View>

        </View>

        {/* ══════════════════════════════════════
            VERTRÄGLICHKEIT & HALTUNG
        ══════════════════════════════════════ */}
        <SectionDivider />
        <SectionLabel>Verträglichkeit & Haltung</SectionLabel>

        <View style={{ paddingHorizontal: 20, gap: 0 }}>
          <ToggleRow label="Verträglich mit Hunden"     value={hundVertraeglich}    onToggle={setHundVertraeglich} />
          <ToggleRow label="Verträglich mit Katzen"      value={katzeVertraeglich}   onToggle={setKatzeVertraeglich} />
          <ToggleRow label="Verträglich mit Kleintieren" value={kleintierVertraeglich} onToggle={setKleintierVertraeglich} />
          <ToggleRow label="Stubenrein"                  value={stubenrein}          onToggle={setStubenrein} />
          <ToggleRow label="Leinenführig"                value={leinenführig}        onToggle={setLeinenführig} />
          <ToggleRow label="Maulkorbpflicht"             value={maulkorbpflicht}     onToggle={setMaulkorbpflicht} />
          <ToggleRow label="Braucht Garten"              value={brauchtGarten}       onToggle={setBrauchtGarten} last />
        </View>

        {/* Alleine bleiben */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <FieldLabel>Alleine bleiben</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ALLEINE.map((label, i) => (
              <PillChip
                key={ALLEINE_VAL[i]}
                label={label}
                selected={alleineBleibt === ALLEINE_VAL[i]}
                onPress={() => setAlleineBleibt(ALLEINE_VAL[i])}
              />
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════
            GESUNDHEIT
        ══════════════════════════════════════ */}
        <SectionDivider />
        <SectionLabel>Gesundheit</SectionLabel>

        <View style={{ paddingHorizontal: 20 }}>
          <ToggleRow label="Geimpft"                    value={geimpft}    onToggle={setGeimpft} />
          <ToggleRow label="Gechipt"                    value={gechipt}    onToggle={setGechipt} />
          <ToggleRow label="Kastriert / sterilisiert"   value={kastriert}  onToggle={setKastriert} />
          <ToggleRow label="Entwurmt"                   value={entwurmt}   onToggle={setEntwurmt} />
          <ToggleRow
            label="Bekannte Erkrankungen"
            value={hatErkrankungen}
            onToggle={setHatErkrankungen}
            last={!hatErkrankungen}
          />
          {hatErkrankungen && (
            <TextInput
              value={erkrankungenText}
              onChangeText={setErkrankungenText}
              placeholder="Bitte Erkrankungen beschreiben…"
              placeholderTextColor="#C5A8B0"
              multiline
              numberOfLines={3}
              style={[textAreaStyle, { marginTop: 10, marginBottom: 4 }]}
            />
          )}
        </View>

        {/* ══════════════════════════════════════
            GESCHICHTE & BESCHREIBUNG
        ══════════════════════════════════════ */}
        <SectionDivider />
        <SectionLabel>Geschichte & Beschreibung</SectionLabel>

        <View style={{ paddingHorizontal: 20, gap: 16 }}>

          <View>
            <FieldLabel>Über den Hund</FieldLabel>
            <Text style={{ fontSize: 12, color: "#C5A8B0", marginBottom: 6 }}>
              80–200 Wörter empfohlen · Wird im Profil angezeigt
            </Text>
            <TextInput
              value={beschreibung}
              onChangeText={setBeschreibung}
              placeholder="Erzähle uns etwas über den Charakter, die Geschichte und was den Hund besonders macht…"
              placeholderTextColor="#C5A8B0"
              multiline
              numberOfLines={6}
              style={[textAreaStyle, { minHeight: 130 }]}
            />
          </View>

          <View>
            <FieldLabel>Interne Notizen</FieldLabel>
            <Text style={{ fontSize: 12, color: "#C5A8B0", marginBottom: 6 }}>
              Nur für Tierheim-Mitarbeiter sichtbar
            </Text>
            <TextInput
              value={interneNotizen}
              onChangeText={setInterneNotizen}
              placeholder="z.B. Besonderheiten bei der Übergabe, Medikamente, Kontakte…"
              placeholderTextColor="#C5A8B0"
              multiline
              numberOfLines={4}
              style={[textAreaStyle, { minHeight: 100 }]}
            />
          </View>

        </View>

        {/* ══════════════════════════════════════
            SUBMIT
        ══════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              backgroundColor: BRAND,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: BRAND,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                  {uploadingPhotos ? "Fotos werden hochgeladen…" : "Wird gespeichert…"}
                </Text>
              </View>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                Profil speichern & veröffentlichen
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Shared Styles
// ─────────────────────────────────────────────
const inputStyle = {
  height: 48,
  backgroundColor: "#FFF8FA",
  borderRadius: 12,
  paddingHorizontal: 14,
  fontSize: 15,
  color: "#2C2C2A",
  borderWidth: 1.5,
  borderColor: "#EAE0EA",
};

const textAreaStyle = {
  backgroundColor: "#FFF8FA",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingTop: 12,
  paddingBottom: 12,
  fontSize: 15,
  color: "#2C2C2A",
  borderWidth: 1.5,
  borderColor: "#EAE0EA",
  textAlignVertical: "top" as const,
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionDivider() {
  return <View style={{ height: 1, backgroundColor: "#EAE0EA", marginTop: 28, marginBottom: 0 }} />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{
      fontSize: 12,
      fontWeight: "700",
      color: BRAND,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 14,
    }}>
      {children}
    </Text>
  );
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "600", color: "#5A4048", marginBottom: 8 }}>
      {children}
      {required && <Text style={{ color: BRAND }}> *</Text>}
    </Text>
  );
}

function PillChip({
  label, selected, onPress, flex, fullWidth, activeColor,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  flex?: boolean;
  fullWidth?: boolean;
  activeColor?: string;
}) {
  const color = activeColor ?? BRAND;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? color : "#EAE0EA",
        backgroundColor: selected ? color : "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        ...(flex ? { flex: 1 } : {}),
        ...(fullWidth ? { width: "100%" } : {}),
      }}
    >
      <Text style={{
        fontSize: 13,
        fontWeight: selected ? "700" : "500",
        color: selected ? "#FFFFFF" : "#5A4048",
        textAlign: "center",
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label, value, onToggle, last,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: "#EAE0EA",
    }}>
      <Text style={{ fontSize: 15, color: "#2C2C2A", flex: 1, marginRight: 12 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#E8D8DC", true: BRAND }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E8D8DC"
      />
    </View>
  );
}
