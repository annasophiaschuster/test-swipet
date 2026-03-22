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
import { useLanguage } from "../../../contexts/LanguageContext";

export default function TierhalterOnboarding() {
  const { t } = useLanguage();

  const TIERARTEN = [{ value: "hund", label: t.onb_th_dog }, { value: "katze", label: t.onb_th_cat }];
  const GROESSEN = [
    { value: "klein", label: t.onb_th_size_small },
    { value: "mittel", label: t.onb_th_size_medium },
    { value: "gross", label: t.onb_th_size_large },
    { value: "riese", label: t.onb_th_size_giant },
  ];
  const AKTIVITAET = [
    { value: "sportlich", label: t.onb_th_activity_very },
    { value: "mittel", label: t.onb_th_activity_medium },
    { value: "ruhig", label: t.onb_th_activity_calm },
  ];

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
      Alert.alert(t.err_generic, t.onb_th_err_name);
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
      Alert.alert(t.err_generic, e.message ?? t.register_err_failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <View style={{ paddingTop: 60, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 16, backgroundColor: Colors.SECONDARY }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.WHITE }}>{t.onb_th_title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 4, lineHeight: 20 }}>
          {t.onb_th_sub}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60, gap: 20 }} keyboardShouldPersistTaps="handled">

        {/* Foto */}
        <Section title={t.onb_th_photo}>
          <TouchableOpacity
            onPress={async () => {
              try {
                const asset = await pickSingleImage();
                if (asset) setPhotoUri(asset.uri);
              } catch (e: any) {
                Alert.alert(t.err_generic, e.message);
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
                <Text style={{ color: Colors.TEXT_MUTED, fontSize: 11, marginTop: 4 }}>{t.onb_th_add_photo}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Section>

        <Section title={t.onb_th_type}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {TIERARTEN.map((t) => (
              <Chip key={t.value} label={t.label} selected={tierart === t.value} onPress={() => setTierart(t.value as "hund" | "katze")} color={Colors.SECONDARY} />
            ))}
          </View>
        </Section>

        <Section title={t.onb_th_name}>
          <TextInput value={name} onChangeText={setName} placeholder={t.onb_th_name_placeholder} placeholderTextColor={Colors.TEXT_MUTED}
            style={{ height: Sizes.INPUT_HEIGHT, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, paddingHorizontal: 14, fontSize: Sizes.FONT_MD, color: Colors.TEXT, borderWidth: 1, borderColor: Colors.BORDER }} />
        </Section>

        <Section title={t.onb_th_breed_age}>
          <TextInput value={rasse} onChangeText={setRasse} placeholder={t.onb_th_breed_placeholder} placeholderTextColor={Colors.TEXT_MUTED}
            style={{ height: Sizes.INPUT_HEIGHT, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, paddingHorizontal: 14, fontSize: Sizes.FONT_MD, color: Colors.TEXT, borderWidth: 1, borderColor: Colors.BORDER, marginBottom: 10 }} />
          <TextInput value={alterJahre} onChangeText={setAlterJahre} placeholder={t.onb_th_age_placeholder} placeholderTextColor={Colors.TEXT_MUTED} keyboardType="numeric"
            style={{ height: Sizes.INPUT_HEIGHT, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_MD, paddingHorizontal: 14, fontSize: Sizes.FONT_MD, color: Colors.TEXT, borderWidth: 1, borderColor: Colors.BORDER }} />
        </Section>

        <Section title={t.onb_th_size}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GROESSEN.map((g) => <Chip key={g.value} label={g.label} selected={groesse === g.value} onPress={() => setGroesse(g.value)} color={Colors.SECONDARY} />)}
          </View>
        </Section>

        <Section title={t.onb_th_activity}>
          <View style={{ gap: 8 }}>
            {AKTIVITAET.map((a) => <Chip key={a.value} label={a.label} selected={aktivitaet === a.value} onPress={() => setAktivitaet(a.value)} color={Colors.SECONDARY} fullWidth />)}
          </View>
        </Section>

        <Section title={t.onb_th_behavior}>
          <ToggleRow label={t.onb_th_child_friendly} value={kinderfreundlich} onToggle={setKinderfreundlich} />
          <ToggleRow label={t.onb_th_animal_friendly} value={vertraeglich} onToggle={setVertraeglich} />
        </Section>

        {/* Description */}
        <Section title={t.onb_th_desc}>
          <TextInput
            value={beschreibung}
            onChangeText={setBeschreibung}
            placeholder={t.onb_th_desc_placeholder}
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
          {loading ? <ActivityIndicator color={Colors.WHITE} /> : <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>{t.onb_th_btn}</Text>}
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
