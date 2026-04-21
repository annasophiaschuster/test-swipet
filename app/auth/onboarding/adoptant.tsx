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
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOTAL_STEPS = 5;

type Wohnsituation = "wohnung" | "wohnung_mit_garten" | "haus" | "haus_mit_garten" | "bauernhof";
type Erfahrung = "anfaenger" | "fortgeschritten" | "profi";
type Aktivitaet = "ruhig" | "mittel" | "sehr_aktiv";
type Arbeitszeit = "vollzeit" | "teilzeit" | "homeoffice" | "nicht_berufstaetig";
type Ansprache = "mann" | "frau" | "divers";
type AlleinePartner = "alleine" | "partner" | "familie";
type MieterEigentuemer = "mieter" | "eigentuemer";
type StundenAlleine = "nie" | "bis_2" | "bis_4" | "bis_6";
type TierTyp = "hund" | "katze" | "kleintiere";

export default function AdoptantOnboarding() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);

  // Step 2 — Persönliche Infos
  const [ansprache, setAnsprache] = useState<Ansprache | null>(null);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [plz, setPlz] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Step 3 — Lebenssituation
  const [wohnsituation, setWohnsituation] = useState<Wohnsituation | null>(null);
  const [sqm, setSqm] = useState("");
  const [mieterEigentuemer, setMieterEigentuemer] = useState<MieterEigentuemer | null>(null);
  const [kinder, setKinder] = useState<boolean | null>(null);
  const [kinderAlterListe, setKinderAlterListe] = useState<string[]>([""]);
  const [andereTiere, setAndereTiere] = useState<boolean | null>(null);
  const [andereTiereTypen, setAndereTiereTypen] = useState<TierTyp[]>([]);
  const [alleinePartner, setAlleinePartner] = useState<AlleinePartner | null>(null);

  // Step 4 — Erfahrung & Lifestyle
  const [erfahrung, setErfahrung] = useState<Erfahrung | null>(null);
  const [aktivitaet, setAktivitaet] = useState<Aktivitaet | null>(null);
  const [arbeitszeit, setArbeitszeit] = useState<Arbeitszeit | null>(null);
  const [stundenAlleine, setStundenAlleine] = useState<StundenAlleine | null>(null);
  const [adoptionMotivation, setAdoptionMotivation] = useState("");

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // ── Kinder-Alter helpers ──
  const updateKindAlter = (index: number, value: string) => {
    setKinderAlterListe((prev) => prev.map((v, i) => (i === index ? value : v)));
  };
  const addKind = () => setKinderAlterListe((prev) => [...prev, ""]);
  const removeKind = (index: number) =>
    setKinderAlterListe((prev) => prev.filter((_, i) => i !== index));

  // ── TierTyp toggle ──
  const toggleTierTyp = (typ: TierTyp) => {
    setAndereTiereTypen((prev) =>
      prev.includes(typ) ? prev.filter((t) => t !== typ) : [...prev, typ]
    );
  };

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
  const triggerFinish = () => setShowNewsletter(true);

  const handleFinish = async (wantsNewsletter: boolean) => {
    setShowNewsletter(false);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.onb_err_not_logged_in);

      await supabase.from("profiles").update({
        ansprache,
        vorname: vorname.trim() || null,
        nachname: nachname.trim() || null,
        geburtsdatum: geburtsdatum || null,
        plz: plz.trim() || null,
        newsletter: wantsNewsletter,
      }).eq("id", user.id);

      // Map stundenAlleine selection to number
      const stundenMap: Record<StundenAlleine, number> = { nie: 0, bis_2: 2, bis_4: 4, bis_6: 6 };

      await supabase.from("adoptant_profiles").upsert({
        id: user.id,
        wohnsituation: wohnsituation ?? undefined,
        erfahrung: erfahrung ?? undefined,
        kinder_im_haushalt: kinder ?? false,
        kinder_alter: kinder
          ? kinderAlterListe.filter((v) => v.trim()).join(", ") || null
          : null,
        andere_tiere: andereTiere ?? false,
        aktivitaetslevel: aktivitaet ?? undefined,
        arbeitszeit: arbeitszeit ?? undefined,
        quadratmeter: sqm ? parseInt(sqm) : null,
        mieter_eigentuemer: mieterEigentuemer ?? undefined,
        alleine_partner: alleinePartner ?? undefined,
        stunden_alleine: stundenAlleine ? stundenMap[stundenAlleine] : null,
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
                "Lokale Tierheime entdecken",
                "Passende Hunde finden",
                "Direkt mit Tierheimen chatten",
              ].map((label) => (
                <View key={label} style={s.featureRow}>
                  <View style={s.checkCircle}>
                    <Ionicons name="checkmark" size={13} color={Colors.PRIMARY} />
                  </View>
                  <Text style={s.featureText}>{label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.PRIMARY }]} onPress={goNext}>
              <Text style={s.primaryBtnText}>Weiter</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
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

            <Text style={s.label}>Nachname</Text>
            <TextInput style={s.input} value={nachname} onChangeText={setNachname} placeholder="z.B. Mustermann" placeholderTextColor={Colors.TEXT_MUTED} />

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

            {/* Wohnsituation */}
            <Text style={s.label}>{t.onb_housing_title}</Text>
            {([
              { key: "wohnung",          label: "Wohnung" },
              { key: "wohnung_mit_garten", label: "Wohnung mit Garten" },
              { key: "haus",             label: "Haus" },
              { key: "haus_mit_garten",  label: "Haus mit Garten" },
              { key: "bauernhof",        label: "Bauernhof" },
            ] as { key: Wohnsituation; label: string }[]).map((o) => (
              <TouchableOpacity
                key={o.key}
                style={[s.optionCard, wohnsituation === o.key && s.optionCardActive]}
                onPress={() => setWohnsituation(o.key)}
              >
                <Text style={[s.optionText, wohnsituation === o.key && s.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Quadratmeter */}
            <Text style={s.label}>{t.onb_hs_living_sqm}</Text>
            <TextInput style={s.input} value={sqm} onChangeText={setSqm} placeholder={t.onb_hs_living_sqm_placeholder} placeholderTextColor={Colors.TEXT_MUTED} keyboardType="numeric" />

            {/* Mieter / Eigentümer */}
            <Text style={s.label}>{t.profil_label_rent_own}</Text>
            <View style={s.chipRow}>
              {([["mieter", t.onb_hs_living_rent], ["eigentuemer", t.onb_hs_living_own]] as [MieterEigentuemer, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, mieterEigentuemer === k && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]} onPress={() => setMieterEigentuemer(k)}>
                  <Text style={[s.chipText, mieterEigentuemer === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kinder */}
            <Text style={s.label}>{t.onb_children_title}</Text>
            <View style={s.chipRow}>
              <TouchableOpacity
                style={[s.chip, kinder === true && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                onPress={() => setKinder(true)}
              >
                <Text style={[s.chipText, kinder === true && { color: "#FFF" }]}>{t.onb_yes}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chip, kinder === false && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                onPress={() => setKinder(false)}
              >
                <Text style={[s.chipText, kinder === false && { color: "#FFF" }]}>{t.onb_no}</Text>
              </TouchableOpacity>
            </View>
            {kinder && (
              <View style={{ marginTop: 10, gap: 8 }}>
                {kinderAlterListe.map((alter, i) => (
                  <View key={i} style={s.kinderRow}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      value={alter}
                      onChangeText={(v) => updateKindAlter(i, v)}
                      placeholder={`Kind ${i + 1} — Alter in Jahren`}
                      placeholderTextColor={Colors.TEXT_MUTED}
                      keyboardType="numeric"
                    />
                    {kinderAlterListe.length > 1 && (
                      <TouchableOpacity onPress={() => removeKind(i)} style={s.removeKindBtn}>
                        <Ionicons name="close" size={16} color={Colors.TEXT_MUTED} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={s.addKindBtn} onPress={addKind}>
                  <Ionicons name="add" size={16} color={Colors.PRIMARY} />
                  <Text style={s.addKindText}>Kind hinzufügen</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Andere Tiere */}
            <Text style={s.label}>{t.onb_other_pets_title}</Text>
            <View style={s.chipRow}>
              <TouchableOpacity
                style={[s.chip, andereTiere === true && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                onPress={() => setAndereTiere(true)}
              >
                <Text style={[s.chipText, andereTiere === true && { color: "#FFF" }]}>{t.onb_yes}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.chip, andereTiere === false && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                onPress={() => setAndereTiere(false)}
              >
                <Text style={[s.chipText, andereTiere === false && { color: "#FFF" }]}>{t.onb_no}</Text>
              </TouchableOpacity>
            </View>
            {andereTiere && (
              <View style={{ marginTop: 10, gap: 8 }}>
                {(["hund", "katze", "kleintiere"] as TierTyp[]).map((typ) => {
                  const labels: Record<TierTyp, string> = { hund: "Hund", katze: "Katze", kleintiere: "Kleintiere" };
                  const active = andereTiereTypen.includes(typ);
                  return (
                    <TouchableOpacity
                      key={typ}
                      style={[s.checkboxRow, active && s.checkboxRowActive]}
                      onPress={() => toggleTierTyp(typ)}
                    >
                      <View style={[s.checkbox, active && s.checkboxActive]}>
                        {active && <Ionicons name="checkmark" size={13} color="#FFF" />}
                      </View>
                      <Text style={[s.checkboxLabel, active && { color: Colors.PRIMARY }]}>{labels[typ]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Alleine / Partner */}
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

            {/* Erfahrung mit Hunden */}
            <Text style={s.label}>Deine Erfahrung mit Hunden</Text>
            {([
              { key: "anfaenger",      label: t.onb_exp_beginner,      sub: t.onb_exp_beginner_sub },
              { key: "fortgeschritten", label: t.onb_exp_intermediate, sub: t.onb_exp_intermediate_sub },
              { key: "profi",          label: t.onb_exp_pro,           sub: t.onb_exp_pro_sub },
            ] as { key: Erfahrung; label: string; sub: string }[]).map((o) => (
              <TouchableOpacity key={o.key} style={[s.optionCard, erfahrung === o.key && s.optionCardActive]} onPress={() => setErfahrung(o.key)}>
                <Text style={[s.optionText, erfahrung === o.key && s.optionTextActive]}>{o.label}</Text>
                <Text style={s.optionSub}>{o.sub}</Text>
              </TouchableOpacity>
            ))}

            {/* Aktivitätslevel */}
            <Text style={s.label}>Dein Aktivitätslevel</Text>
            {([
              { key: "ruhig",     label: "Ruhig",      sub: "Ich bevorzuge entspannte Spaziergänge" },
              { key: "mittel",    label: "Mittel",      sub: "Ich bin gerne aktiv, brauche aber auch Ruhe" },
              { key: "sehr_aktiv", label: "Sehr aktiv", sub: "Ich bin sportlich und liebe Bewegung" },
            ] as { key: Aktivitaet; label: string; sub: string }[]).map((o) => (
              <TouchableOpacity key={o.key} style={[s.optionCard, aktivitaet === o.key && s.optionCardActive]} onPress={() => setAktivitaet(o.key)}>
                <Text style={[s.optionText, aktivitaet === o.key && s.optionTextActive]}>{o.label}</Text>
                <Text style={s.optionSub}>{o.sub}</Text>
              </TouchableOpacity>
            ))}

            {/* Arbeitssituation */}
            <Text style={s.label}>{t.onb_work_title}</Text>
            {([
              { key: "vollzeit",           label: t.onb_work_fulltime },
              { key: "teilzeit",           label: t.onb_work_parttime },
              { key: "homeoffice",         label: t.onb_work_home },
              { key: "nicht_berufstaetig", label: t.onb_work_none },
            ] as { key: Arbeitszeit; label: string }[]).map((o) => (
              <TouchableOpacity key={o.key} style={[s.optionCard, arbeitszeit === o.key && s.optionCardActive]} onPress={() => setArbeitszeit(o.key)}>
                <Text style={[s.optionText, arbeitszeit === o.key && s.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Stunden alleine */}
            <Text style={s.label}>Wie lange ist der Hund täglich alleine?</Text>
            <View style={s.chipRow}>
              {([
                { key: "nie",   label: "Nie" },
                { key: "bis_2", label: "bis 2 Std." },
                { key: "bis_4", label: "bis 4 Std." },
                { key: "bis_6", label: "bis 6 Std." },
              ] as { key: StundenAlleine; label: string }[]).map((o) => (
                <TouchableOpacity
                  key={o.key}
                  style={[s.chip, stundenAlleine === o.key && { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }]}
                  onPress={() => setStundenAlleine(o.key)}
                >
                  <Text style={[s.chipText, stundenAlleine === o.key && { color: "#FFF" }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Motivation (Pflichtfeld) */}
            <Text style={s.label}>Warum möchtest du einen Hund adoptieren?</Text>
            <TextInput
              style={[s.input, s.textArea, adoptionMotivation.length > 0 && adoptionMotivation.length < 20 && s.inputError]}
              value={adoptionMotivation}
              onChangeText={setAdoptionMotivation}
              placeholder="Erzähl uns etwas über dich und warum du einen Hund adoptieren möchtest..."
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {adoptionMotivation.length > 0 && adoptionMotivation.length < 20 && (
              <Text style={s.errorHint}>Mindestens 20 Zeichen ({adoptionMotivation.length}/20)</Text>
            )}
            {adoptionMotivation.length === 0 && (
              <Text style={s.hint}>Pflichtfeld · mindestens 20 Zeichen</Text>
            )}
          </View>
        )}

        {/* ── Step 5: Fertig ── */}
        {step === 5 && (
          <View style={s.centerBlock}>
            <Image
              source={require("../../../assets/tab-pfote-new.png")}
              style={{ width: 80, height: 80, resizeMode: "contain", tintColor: Colors.PRIMARY, marginBottom: 20 }}
            />
            <Text style={s.welcomeTitle}>{t.onb_hs_done_title}</Text>
            <Text style={s.welcomeSub}>{t.onb_hs_done_sub}</Text>
            {loading ? (
              <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 24 }} />
            ) : (
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.PRIMARY }]} onPress={triggerFinish}>
                <Text style={s.primaryBtnText}>{t.onb_hs_done_btn}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Newsletter Modal ── */}
      <Modal visible={showNewsletter} transparent animationType="fade" onRequestClose={() => setShowNewsletter(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Image
              source={require("../../../assets/tab-pfote-new.png")}
              style={{ width: 48, height: 48, resizeMode: "contain", tintColor: Colors.PRIMARY, marginBottom: 14 }}
            />
            <Text style={s.modalTitle}>{t.onb_th_newsletter_title}</Text>
            <Text style={s.modalSub}>{t.onb_th_newsletter_sub}</Text>
            <TouchableOpacity
              onPress={() => handleFinish(true)}
              style={[s.modalBtn, { backgroundColor: Colors.PRIMARY }]}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.modalBtnText}>{t.onb_th_newsletter_yes}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFinish(false)}
              style={[s.modalBtn, { borderWidth: 1.5, borderColor: Colors.BORDER }]}
            >
              <Text style={[s.modalBtnText, { color: Colors.TEXT_MUTED }]}>{t.onb_th_newsletter_no}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Navigation Buttons ── */}
      {step > 1 && step < TOTAL_STEPS && (
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backBtnText}>{t.onb_back}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: Colors.PRIMARY }, step === 4 && adoptionMotivation.length < 20 && { opacity: 0.4 }]}
            onPress={() => {
              if (step === 4 && adoptionMotivation.length < 20) return;
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
  doneIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.PRIMARY + "15",
    borderWidth: 2, borderColor: Colors.PRIMARY + "30",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  welcomeTitle: { fontSize: 26, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 12 },
  welcomeSub: { fontSize: 16, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 24, marginBottom: 24 },
  featureList: { width: "100%", marginBottom: 32, gap: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: Colors.PRIMARY,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.PRIMARY + "12",
  },
  featureText: { fontSize: 15, color: Colors.TEXT, flex: 1, lineHeight: 21 },

  stepEmoji: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  stepTitle: { fontSize: 22, fontWeight: "700", color: Colors.TEXT, marginBottom: 8 },
  stepSub: { fontSize: 15, color: Colors.TEXT_MUTED, lineHeight: 22, marginBottom: 20 },

  label: { fontSize: 14, fontWeight: "600", color: Colors.TEXT, marginTop: 16, marginBottom: 6 },
  optionalTag: { fontSize: 12, fontWeight: "400", color: Colors.TEXT_MUTED },
  hint: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 4 },
  inputError: { borderColor: Colors.ERROR },
  errorHint: { fontSize: 12, color: Colors.ERROR, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.TEXT, backgroundColor: "#FFF",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
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

  // Kinder-Alter
  kinderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeKindBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.SURFACE,
  },
  addKindBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 99, borderWidth: 1.5, borderColor: Colors.PRIMARY,
    alignSelf: "flex-start", backgroundColor: Colors.PRIMARY + "10",
  },
  addKindText: { fontSize: 13, fontWeight: "600", color: Colors.PRIMARY },

  // Andere Tiere Checkboxes
  checkboxRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.BORDER,
    backgroundColor: "#FFF",
  },
  checkboxRowActive: { borderColor: Colors.PRIMARY, backgroundColor: "#FFF0F3" },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFF",
  },
  checkboxActive: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  checkboxLabel: { fontSize: 15, fontWeight: "500", color: Colors.TEXT },

  avatarPicker: {
    borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 10, borderStyle: "dashed",
    paddingVertical: 16, alignItems: "center", backgroundColor: Colors.SURFACE,
  },
  avatarPickerText: { fontSize: 15, color: Colors.TEXT_MUTED },

  primaryBtn: { width: "100%", paddingVertical: 16, borderRadius: 99, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 8 },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "flex-end",
    paddingBottom: 32, paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%", backgroundColor: Colors.BACKGROUND,
    borderRadius: 24, padding: 28, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: Colors.TEXT, marginBottom: 10, textAlign: "center" },
  modalSub: { fontSize: 14, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  modalBtn: {
    width: "100%", height: 50, borderRadius: 99,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  modalBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  navRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: Colors.BORDER },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.BORDER, alignItems: "center" },
  backBtnText: { fontSize: 15, color: Colors.TEXT, fontWeight: "500" },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  nextBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
