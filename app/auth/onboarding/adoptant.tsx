import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOTAL_STEPS = 5;

type Wohnsituation = "wohnung" | "haus" | "haus_mit_garten" | "bauernhof";
type Erfahrung = "anfaenger" | "fortgeschritten" | "profi";
type Aktivitaet = "sportlich" | "mittel" | "ruhig";
type Arbeitszeit = "vollzeit" | "teilzeit" | "homeoffice" | "nicht_berufstaetig";
type Ansprache = "mann" | "frau" | "divers";
type AlleinePartner = "alleine" | "partner" | "familie";
type MieterEigentuemer = "mieter" | "eigentuemer";

export default function AdoptantOnboarding() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 2 — Persönliche Infos
  const [ansprache, setAnsprache] = useState<Ansprache | null>(null);
  const [vorname, setVorname] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [plz, setPlz] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Step 3 — Lebenssituation
  const [wohnsituation, setWohnsituation] = useState<Wohnsituation | null>(null);
  const [sqm, setSqm] = useState("");
  const [mieterEigentuemer, setMieterEigentuemer] = useState<MieterEigentuemer | null>(null);
  const [kinder, setKinder] = useState<boolean | null>(null);
  const [kinderAlter, setKinderAlter] = useState("");
  const [andereTiere, setAndereTiere] = useState<boolean | null>(null);
  const [alleinePartner, setAlleinePartner] = useState<AlleinePartner | null>(null);

  // Step 4 — Erfahrung & Lifestyle
  const [erfahrung, setErfahrung] = useState<Erfahrung | null>(null);
  const [aktivitaet, setAktivitaet] = useState<Aktivitaet | null>(null);
  const [arbeitszeit, setArbeitszeit] = useState<Arbeitszeit | null>(null);
  const [stundenAlleine, setStundenAlleine] = useState("");

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // ── Step 2: Validate personal info ──
  const validateStep2 = () => true;

  // ── Pick avatar ──
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  // ── Save to Supabase ──
  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.onb_err_not_logged_in);

      await supabase.from("profiles").update({
        ansprache,
        vorname: vorname.trim() || null,
        geburtsdatum: geburtsdatum || null,
        plz: plz.trim() || null,
      }).eq("id", user.id);

      await supabase.from("adoptant_profiles").upsert({
        id: user.id,
        wohnsituation: wohnsituation ?? undefined,
        erfahrung: erfahrung ?? undefined,
        kinder_im_haushalt: kinder ?? false,
        kinder_alter: kinderAlter.trim() || null,
        andere_tiere: andereTiere ?? false,
        aktivitaetslevel: aktivitaet ?? undefined,
        arbeitszeit: arbeitszeit ?? undefined,
        quadratmeter: sqm ? parseInt(sqm) : null,
        mieter_eigentuemer: mieterEigentuemer ?? undefined,
        alleine_partner: alleinePartner ?? undefined,
        stunden_alleine: stundenAlleine ? parseInt(stundenAlleine) : null,
      });

      // Flag so feed.tsx shows the newsletter popup
      await AsyncStorage.setItem("show_newsletter_popup", "true");

      router.replace("/adoption/feed");
    } catch (e: any) {
      Alert.alert(t.err_generic, e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      {/* Progress Bar */}
      {step > 1 && step < TOTAL_STEPS && (
        <View style={s.progressWrap}>
          <View style={s.progressBg}>
            <View
              style={[s.progressFill, { width: `${((step - 1) / (TOTAL_STEPS - 2)) * 100}%` }]}
            />
          </View>
          <Text style={s.progressText}>
            {t.onb_step} {step - 1} {t.onb_of} {TOTAL_STEPS - 2}
          </Text>
        </View>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <View style={s.centerBlock}>
            <Image source={require("../../../assets/onb-welcome.png")} style={{ width: 64, height: 64, resizeMode: "contain", tintColor: Colors.PRIMARY, marginBottom: 12 }} />
            <Text style={s.welcomeTitle}>{t.onb_hs_welcome_title}</Text>
            <Text style={s.welcomeSub}>{t.onb_hs_welcome_sub}</Text>
            <View style={s.featureList}>
              {[
                { icon: require("../../../assets/tab-haus.png"), label: "Lokale Tierheime entdecken" },
                { icon: require("../../../assets/onb-swipen.png"), label: "Passende Hunde finden" },
                { icon: require("../../../assets/tab-chat.png"), label: "Direkt chatten" },
              ].map((f) => (
                <View key={f.label} style={s.featureRow}>
                  <Image source={f.icon} style={{ width: 24, height: 24, resizeMode: "contain", tintColor: Colors.PRIMARY, marginRight: 10 }} />
                  <Text style={s.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.PRIMARY }]} onPress={goNext}>
              <Text style={s.primaryBtnText}>{t.onb_hs_welcome_btn}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Persönliche Infos ── */}
        {step === 2 && (
          <View>
            <Text style={s.stepTitle}>{t.onb_hs_info_title}</Text>

            <Text style={s.label}>{t.onb_hs_info_salutation}</Text>
            <View style={s.chipRow}>
              {(["mann", "frau", "divers"] as Ansprache[]).map((a) => {
                const labels = { mann: t.onb_hs_info_salutation_male, frau: t.onb_hs_info_salutation_female, divers: t.onb_hs_info_salutation_diverse };
                return (
                  <TouchableOpacity
                    key={a}
                    style={[s.chip, ansprache === a && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                    onPress={() => setAnsprache(a)}
                  >
                    <Text style={[s.chipText, ansprache === a && { color: "#FFF" }]}>{labels[a]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>{t.onb_hs_info_firstname}</Text>
            <TextInput style={s.input} value={vorname} onChangeText={setVorname} placeholder="z.B. Max" placeholderTextColor={Colors.TEXT_MUTED} />

            <Text style={s.label}>{t.onb_hs_info_dob}</Text>
            <TextInput style={s.input} value={geburtsdatum} onChangeText={setGeburtsdatum} placeholder="TT.MM.JJJJ" placeholderTextColor={Colors.TEXT_MUTED} keyboardType="numbers-and-punctuation" />
            <Text style={s.hint}>{t.onb_hs_info_dob_hint}</Text>

            <Text style={s.label}>{t.onb_hs_info_plz}</Text>
            <TextInput style={s.input} value={plz} onChangeText={setPlz} placeholder="z.B. 80331" placeholderTextColor={Colors.TEXT_MUTED} keyboardType="numeric" />

            <Text style={s.label}>{t.onb_hs_info_avatar}</Text>
            <TouchableOpacity style={s.avatarPicker} onPress={pickAvatar}>
              <Text style={s.avatarPickerText}>
                {avatarUri ? "✅ Foto ausgewählt" : "📷 Foto auswählen"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Lebenssituation ── */}
        {step === 3 && (
          <View>
            <Text style={s.stepTitle}>{t.onb_hs_living_title}</Text>
            <Text style={s.stepSub}>{t.onb_hs_living_sub}</Text>

            <Text style={s.label}>{t.onb_housing_title}</Text>
            {([
              { key: "wohnung", label: t.onb_housing_apartment },
              { key: "haus", label: t.onb_housing_house },
              { key: "haus_mit_garten", label: t.onb_housing_garden },
              { key: "bauernhof", label: t.onb_housing_farm },
            ] as { key: Wohnsituation; label: string }[]).map((o) => (
              <TouchableOpacity
                key={o.key}
                style={[s.optionCard, wohnsituation === o.key && s.optionCardActive]}
                onPress={() => setWohnsituation(o.key)}
              >
                <Text style={[s.optionText, wohnsituation === o.key && s.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.label}>{t.onb_hs_living_sqm}</Text>
            <TextInput style={s.input} value={sqm} onChangeText={setSqm} placeholder={t.onb_hs_living_sqm_placeholder} placeholderTextColor={Colors.TEXT_MUTED} keyboardType="numeric" />

            <Text style={s.label}>{t.profil_label_rent_own}</Text>
            <View style={s.chipRow}>
              {([["mieter", t.onb_hs_living_rent], ["eigentuemer", t.onb_hs_living_own]] as [MieterEigentuemer, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, mieterEigentuemer === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]} onPress={() => setMieterEigentuemer(k)}>
                  <Text style={[s.chipText, mieterEigentuemer === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>{t.onb_children_title}</Text>
            <View style={s.chipRow}>
              <TouchableOpacity style={[s.chip, kinder === true && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]} onPress={() => setKinder(true)}>
                <Text style={[s.chipText, kinder === true && { color: "#FFF" }]}>{t.onb_yes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.chip, kinder === false && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]} onPress={() => setKinder(false)}>
                <Text style={[s.chipText, kinder === false && { color: "#FFF" }]}>{t.onb_no}</Text>
              </TouchableOpacity>
            </View>
            {kinder && (
              <TextInput style={s.input} value={kinderAlter} onChangeText={setKinderAlter} placeholder="Alter der Kinder (z.B. 5, 8)" placeholderTextColor={Colors.TEXT_MUTED} />
            )}

            <Text style={s.label}>{t.onb_other_pets_title}</Text>
            <View style={s.chipRow}>
              <TouchableOpacity style={[s.chip, andereTiere === true && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]} onPress={() => setAndereTiere(true)}>
                <Text style={[s.chipText, andereTiere === true && { color: "#FFF" }]}>{t.onb_yes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.chip, andereTiere === false && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]} onPress={() => setAndereTiere(false)}>
                <Text style={[s.chipText, andereTiere === false && { color: "#FFF" }]}>{t.onb_no}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>{t.profil_label_alone_partner}</Text>
            <View style={s.chipRow}>
              {([["alleine", t.onb_hs_living_alone], ["partner", t.onb_hs_living_partner], ["familie", t.onb_hs_living_family]] as [AlleinePartner, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, alleinePartner === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]} onPress={() => setAlleinePartner(k)}>
                  <Text style={[s.chipText, alleinePartner === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step 4: Erfahrung & Lifestyle ── */}
        {step === 4 && (
          <View>
            <Text style={s.stepTitle}>{t.onb_hs_lifestyle_title}</Text>
            <Text style={s.stepSub}>{t.onb_hs_lifestyle_sub}</Text>

            <Text style={s.label}>{t.onb_exp_title}</Text>
            {([
              { key: "anfaenger", label: t.onb_exp_beginner, sub: t.onb_exp_beginner_sub },
              { key: "fortgeschritten", label: t.onb_exp_intermediate, sub: t.onb_exp_intermediate_sub },
              { key: "profi", label: t.onb_exp_pro, sub: t.onb_exp_pro_sub },
            ] as { key: Erfahrung; label: string; sub: string }[]).map((o) => (
              <TouchableOpacity key={o.key} style={[s.optionCard, erfahrung === o.key && s.optionCardActive]} onPress={() => setErfahrung(o.key)}>
                <Text style={[s.optionText, erfahrung === o.key && s.optionTextActive]}>{o.label}</Text>
                <Text style={s.optionSub}>{o.sub}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.label}>{t.onb_activity_title}</Text>
            {([
              { key: "sportlich", label: t.onb_activity_athletic, sub: t.onb_activity_athletic_sub },
              { key: "mittel", label: t.onb_activity_medium, sub: t.onb_activity_medium_sub },
              { key: "ruhig", label: t.onb_activity_calm, sub: t.onb_activity_calm_sub },
            ] as { key: Aktivitaet; label: string; sub: string }[]).map((o) => (
              <TouchableOpacity key={o.key} style={[s.optionCard, aktivitaet === o.key && s.optionCardActive]} onPress={() => setAktivitaet(o.key)}>
                <Text style={[s.optionText, aktivitaet === o.key && s.optionTextActive]}>{o.label}</Text>
                <Text style={s.optionSub}>{o.sub}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.label}>{t.onb_work_title}</Text>
            {([
              { key: "vollzeit", label: t.onb_work_fulltime },
              { key: "teilzeit", label: t.onb_work_parttime },
              { key: "homeoffice", label: t.onb_work_home },
              { key: "nicht_berufstaetig", label: t.onb_work_none },
            ] as { key: Arbeitszeit; label: string }[]).map((o) => (
              <TouchableOpacity key={o.key} style={[s.optionCard, arbeitszeit === o.key && s.optionCardActive]} onPress={() => setArbeitszeit(o.key)}>
                <Text style={[s.optionText, arbeitszeit === o.key && s.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.label}>{t.onb_hs_lifestyle_hours_alone}</Text>
            <TextInput
              style={s.input}
              value={stundenAlleine}
              onChangeText={setStundenAlleine}
              placeholder={t.onb_hs_lifestyle_hours_placeholder}
              placeholderTextColor={Colors.TEXT_MUTED}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* ── Step 5: Fertig ── */}
        {step === 5 && (
          <View style={s.centerBlock}>
            <Text style={s.welcomeEmoji}>🐾</Text>
            <Text style={s.welcomeTitle}>{t.onb_hs_done_title}</Text>
            <Text style={s.welcomeSub}>{t.onb_hs_done_sub}</Text>
            {loading ? (
              <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 24 }} />
            ) : (
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.PRIMARY }]} onPress={handleFinish}>
                <Text style={s.primaryBtnText}>{t.onb_hs_done_btn}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Navigation Buttons ── */}
      {step > 1 && step < TOTAL_STEPS && (
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backBtnText}>{t.onb_back}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: Colors.PRIMARY }]}
            onPress={() => {
              if (step === 2 && !validateStep2()) return;
              goNext();
            }}
          >
            <Text style={s.nextBtnText}>{t.onb_next}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },
  progressWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  progressBg: { height: 4, backgroundColor: Colors.BORDER, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.PRIMARY, borderRadius: 2 },
  progressText: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 4, textAlign: "right" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },

  centerBlock: { alignItems: "center", paddingTop: 20 },
  welcomeEmoji: { fontSize: 64, marginBottom: 16 },
  welcomeTitle: { fontSize: 26, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 12 },
  welcomeSub: { fontSize: 16, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 24, marginBottom: 24 },
  featureList: { width: "100%", marginBottom: 32 },
  featureRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, backgroundColor: Colors.SURFACE, borderRadius: 12, marginBottom: 8 },
  featureText: { fontSize: 15, color: Colors.TEXT },

  stepEmoji: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  stepTitle: { fontSize: 22, fontWeight: "700", color: Colors.TEXT, marginBottom: 8 },
  stepSub: { fontSize: 15, color: Colors.TEXT_MUTED, lineHeight: 22, marginBottom: 20 },

  label: { fontSize: 14, fontWeight: "600", color: Colors.TEXT, marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.TEXT, backgroundColor: "#FFF",
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99,
    borderWidth: 1.5, borderColor: Colors.BORDER, backgroundColor: "#FFF",
  },
  chipText: { fontSize: 14, color: Colors.TEXT },

  optionCard: {
    borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 12,
    padding: 14, marginBottom: 8, backgroundColor: "#FFF",
  },
  optionCardActive: { borderColor: Colors.PRIMARY, backgroundColor: "#FFF0F3" },
  optionText: { fontSize: 15, fontWeight: "600", color: Colors.TEXT },
  optionTextActive: { color: Colors.PRIMARY },
  optionSub: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },

  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.TEXT, lineHeight: 20 },

  avatarPicker: {
    borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 10, borderStyle: "dashed",
    paddingVertical: 16, alignItems: "center", backgroundColor: Colors.SURFACE,
  },
  avatarPickerText: { fontSize: 15, color: Colors.TEXT_MUTED },

  primaryBtn: { width: "100%", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  navRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: Colors.BORDER },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.BORDER, alignItems: "center" },
  backBtnText: { fontSize: 15, color: Colors.TEXT, fontWeight: "500" },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  nextBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
