import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Switch, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { pickSingleImage, uploadImageToStorage } from "../../../lib/storage";

const TIERARTEN = [{ value: "hund", label: "🐶 Hund" }, { value: "katze", label: "🐱 Katze" }];
const GROESSEN = [{ value: "klein", label: "Klein" }, { value: "mittel", label: "Mittel" }, { value: "gross", label: "Groß" }, { value: "riese", label: "Riese" }];
const AKTIVITAET = [{ value: "sportlich", label: "🏃 Sehr aktiv" }, { value: "mittel", label: "🚶 Mäßig aktiv" }, { value: "ruhig", label: "🛋 Ruhig" }];

export default function TierhalterOnboarding() {
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [tierart, setTierart] = useState<"hund" | "katze">("hund");
  const [rasse, setRasse] = useState("");
  const [groesse, setGroesse] = useState("mittel");
  const [alterJahre, setAlterJahre] = useState("");
  const [aktivitaet, setAktivitaet] = useState("mittel");
  const [kinderfreundlich, setKinderfreundlich] = useState(true);
  const [vertraeglich, setVertraeglich] = useState(true);

  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert("Fehler", "Bitte einen Namen für dein Tier eingeben.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("profiles").upsert({ id: user.id, role: "tierhalter" });

      // Foto hochladen falls vorhanden
      let fotoUrl: string | null = null;
      if (photoUri) {
        try {
          fotoUrl = await uploadImageToStorage("pet-photos", `owner-pets/${user.id}.jpg`, photoUri);
        } catch (_) { /* Foto-Upload Fehler ignorieren */ }
      }

      const { error } = await supabase.from("owner_pets").insert({
        owner_id: user.id,
        name: name.trim(),
        tierart,
        rasse: rasse.trim() || null,
        groesse_kategorie: groesse,
        alter_jahre: alterJahre ? parseInt(alterJahre) : null,
        aktivitaetslevel: aktivitaet,
        kinderfreundlich,
        vertraeglich_mit_tieren: vertraeglich,
        foto_url: fotoUrl,
        beschreibung: beschreibung.trim() || null,
      });

      if (error) throw error;
      router.replace("/gassi/feed");
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Registrierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <View style={{ paddingTop: 60, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 16, backgroundColor: Colors.SECONDARY }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.WHITE }}>Dein Haustier</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 4, lineHeight: 20 }}>
          Erzähl uns von deinem Tier — wir finden passende Gassi- und Spieldate-Partner!
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60, gap: 20 }} keyboardShouldPersistTaps="handled">

        {/* Foto */}
        <Section title="Foto deines Tieres (optional)">
          <TouchableOpacity
            onPress={async () => {
              try {
                const asset = await pickSingleImage();
                if (asset) setPhotoUri(asset.uri);
              } catch (e: any) {
                Alert.alert("Fehler", e.message);
              }
            }}
            style={{ alignItems: "center" }}
          >
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: Colors.SECONDARY }} />
                <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: Colors.SECONDARY, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: Colors.WHITE, fontSize: 14 }}>✎</Text>
                </View>
              </View>
            ) : (
              <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: Colors.BORDER, borderStyle: "dashed", backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 36 }}>📷</Text>
                <Text style={{ color: Colors.TEXT_MUTED, fontSize: 11, marginTop: 4 }}>Foto hinzufügen</Text>
              </View>
            )}
          </TouchableOpacity>
        </Section>

        <Section title="Mein Tier ist ein…">
          <View style={{ flexDirection: "row", gap: 10 }}>
            {TIERARTEN.map((t) => (
              <Chip key={t.value} label={t.label} selected={tierart === t.value} onPress={() => setTierart(t.value as "hund" | "katze")} color={Colors.SECONDARY} />
            ))}
          </View>
        </Section>

        <Section title="Name *">
          <TextInput value={name} onChangeText={setName} placeholder="z.B. Bella" placeholderTextColor={Colors.TEXT_MUTED}
            style={{ height: Sizes.INPUT_HEIGHT, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, paddingHorizontal: 14, fontSize: Sizes.FONT_MD, color: Colors.TEXT, borderWidth: 1, borderColor: Colors.BORDER }} />
        </Section>

        <Section title="Rasse & Alter">
          <TextInput value={rasse} onChangeText={setRasse} placeholder="Rasse (optional)" placeholderTextColor={Colors.TEXT_MUTED}
            style={{ height: Sizes.INPUT_HEIGHT, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, paddingHorizontal: 14, fontSize: Sizes.FONT_MD, color: Colors.TEXT, borderWidth: 1, borderColor: Colors.BORDER, marginBottom: 10 }} />
          <TextInput value={alterJahre} onChangeText={setAlterJahre} placeholder="Alter in Jahren" placeholderTextColor={Colors.TEXT_MUTED} keyboardType="numeric"
            style={{ height: Sizes.INPUT_HEIGHT, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, paddingHorizontal: 14, fontSize: Sizes.FONT_MD, color: Colors.TEXT, borderWidth: 1, borderColor: Colors.BORDER }} />
        </Section>

        <Section title="Größe">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GROESSEN.map((g) => <Chip key={g.value} label={g.label} selected={groesse === g.value} onPress={() => setGroesse(g.value)} color={Colors.SECONDARY} />)}
          </View>
        </Section>

        <Section title="Wie aktiv ist dein Tier?">
          <View style={{ gap: 8 }}>
            {AKTIVITAET.map((a) => <Chip key={a.value} label={a.label} selected={aktivitaet === a.value} onPress={() => setAktivitaet(a.value)} color={Colors.SECONDARY} fullWidth />)}
          </View>
        </Section>

        <Section title="Verhalten">
          <ToggleRow label="Kinderfreundlich" value={kinderfreundlich} onToggle={setKinderfreundlich} />
          <ToggleRow label="Verträglich mit anderen Tieren" value={vertraeglich} onToggle={setVertraeglich} />
        </Section>

        {/* Beschreibung */}
        <Section title="Beschreibung (optional)">
          <TextInput
            value={beschreibung}
            onChangeText={setBeschreibung}
            placeholder="Erzähl etwas über dein Tier — Lieblingsrouten, Besonderheiten…"
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: Colors.SURFACE, borderRadius: 12, padding: 12,
              fontSize: 15, color: Colors.TEXT, minHeight: 90, textAlignVertical: "top",
              borderWidth: 1, borderColor: Colors.BORDER,
            }}
          />
        </Section>

        <TouchableOpacity onPress={handleFinish} disabled={loading}
          style={{ height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}>
          {loading ? <ActivityIndicator color={Colors.WHITE} /> : <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>🐾 Los geht's!</Text>}
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

function Chip({ label, selected, onPress, color, fullWidth }: { label: string; selected: boolean; onPress: () => void; color: string; fullWidth?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: Sizes.RADIUS_FULL, backgroundColor: selected ? color : Colors.SURFACE, borderWidth: 1.5, borderColor: selected ? color : Colors.BORDER, ...(fullWidth ? { width: "100%" } : {}) }}>
      <Text style={{ color: selected ? Colors.WHITE : Colors.TEXT, fontWeight: selected ? "700" : "400", fontSize: 13, textAlign: fullWidth ? "center" : "left" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.BORDER }}>
      <Text style={{ fontSize: Sizes.FONT_MD, color: Colors.TEXT }}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: Colors.BORDER, true: Colors.SECONDARY }} thumbColor={Colors.WHITE} />
    </View>
  );
}
