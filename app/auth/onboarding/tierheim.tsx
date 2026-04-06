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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

const ACCENT = Colors.PRIMARY;
const TOTAL_STEPS = 7;

// ─── ORG TYPE OPTIONS ──────────────────────────────────────────────────────────
const ORG_TYPES = [
  { key: "eingetragener_verein", labelKey: "onb_th_org_type_ev" },
  { key: "gemeinnuetzig", labelKey: "onb_th_org_type_gemeinn" },
  { key: "staatlich", labelKey: "onb_th_org_type_staatlich" },
  { key: "privat", labelKey: "onb_th_org_type_privat" },
] as const;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function TierheimOnboarding() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 3 – Datenschutz
  const [datenschutz, setDatenschutz] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  // Step 4 – Organisations-Profil
  const [orgName, setOrgName] = useState("");
  const [orgTyp, setOrgTyp] = useState<string>("");
  const [ansprechpartner, setAnsprechpartner] = useState("");
  const [kontaktEmail, setKontaktEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [adresse, setAdresse] = useState("");
  const [plz, setPlz] = useState("");
  const [stadt, setStadt] = useState("");

  // Step 5 – Verifizierung
  const [verifyUri, setVerifyUri] = useState<string | null>(null);

  // Step 6 – Optional
  const [beschreibung, setBeschreibung] = useState("");
  const [website, setWebsite] = useState("");
  const [oeffnungszeiten, setOeffnungszeiten] = useState("");
  const [richtlinien, setRichtlinien] = useState("");

  // ── Navigation ──────────────────────────────────────────────────────────────

  const next = () => {
    if (step === 3 && !datenschutz) {
      Alert.alert(t.err_generic, t.onb_hs_privacy_required);
      return;
    }
    if (step === 4 && !orgName.trim()) {
      Alert.alert(t.err_generic, t.onb_shelter_err_name);
      return;
    }
    if (step === 5 && !verifyUri) {
      Alert.alert(t.err_generic, t.onb_th_new_step5_required);
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  // ── Finish ──────────────────────────────────────────────────────────────────

  const handleFinish = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t.err_not_logged_in);

      // Update profiles
      const { error: profErr } = await supabase.from("profiles").upsert({
        id: user.id,
        newsletter,
        datenschutz,
        updated_at: new Date().toISOString(),
      });
      if (profErr) throw profErr;

      // Upsert shelter_profiles
      const { error: shelterErr } = await supabase
        .from("shelter_profiles")
        .upsert({
          id: user.id,
          org_name: orgName.trim(),
          org_typ: orgTyp || null,
          ansprechpartner: ansprechpartner.trim() || null,
          kontakt_email: kontaktEmail.trim() || null,
          telefon: telefon.trim() || null,
          adresse: adresse.trim() || null,
          plz: plz.trim() || null,
          stadt: stadt.trim() || null,
          beschreibung: beschreibung.trim() || null,
          website: website.trim() || null,
          oeffnungszeiten: oeffnungszeiten.trim() || null,
          vermittlungsrichtlinien: richtlinien.trim() || null,
          updated_at: new Date().toISOString(),
        });
      if (shelterErr) throw shelterErr;

      router.replace("/tierheim/dashboard");
    } catch (err: any) {
      Alert.alert(t.err_generic, err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Progress Bar ─────────────────────────────────────────────────────────────

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            {
              backgroundColor:
                i < step ? ACCENT : Colors.BORDER,
              flex: 1,
            },
          ]}
        />
      ))}
    </View>
  );

  // ── Step Renders ─────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Step 1: Welcome ────────────────────────────────────────────────────
      case 1:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>🏠</Text>
            <Text style={styles.heroTitle}>{t.onb_th_new_step1_title}</Text>
            <Text style={styles.heroSub}>{t.onb_th_new_step1_sub}</Text>

            <View style={styles.featureList}>
              {([
                "onb_th_new_feat1",
                "onb_th_new_feat2",
                "onb_th_new_feat3",
                "onb_th_new_feat4",
              ] as const).map((key) => (
                <View key={key} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={styles.featureText}>{String(t[key])}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      // ── Step 2: E-Mail ─────────────────────────────────────────────────────
      case 2:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>📧</Text>
            <Text style={styles.stepTitle}>{t.onb_th_new_step2_title}</Text>
            <View style={[styles.infoCard, { borderLeftColor: ACCENT }]}>
              <Text style={styles.infoCardText}>{t.onb_th_new_step2_info}</Text>
            </View>
            <Text style={styles.stepSub}>{t.onb_th_new_step2_sub}</Text>
          </View>
        );

      // ── Step 3: Datenschutz ────────────────────────────────────────────────
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>{t.onb_hs_privacy_title}</Text>
            <Text style={styles.stepSub}>{t.onb_hs_privacy_sub}</Text>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setDatenschutz((v) => !v)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  datenschutz && { backgroundColor: ACCENT, borderColor: ACCENT },
                ]}
              >
                {datenschutz && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>{t.onb_hs_privacy_accept}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setNewsletter((v) => !v)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  newsletter && { backgroundColor: ACCENT, borderColor: ACCENT },
                ]}
              >
                {newsletter && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>{t.onb_hs_privacy_newsletter}</Text>
            </TouchableOpacity>
          </View>
        );

      // ── Step 4: Organisations-Profil ───────────────────────────────────────
      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>{t.onb_th_new_step4_title}</Text>
            <Text style={styles.stepSub}>{t.onb_th_new_step4_sub}</Text>

            {/* Org Type Pills */}
            <Text style={styles.fieldLabel}>{t.onb_th_new_org_type}</Text>
            <View style={styles.pillRow}>
              {ORG_TYPES.map(({ key, labelKey }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setOrgTyp(key)}
                  style={[
                    styles.pill,
                    orgTyp === key && { backgroundColor: ACCENT, borderColor: ACCENT },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      orgTyp === key && { color: "#FFF" },
                    ]}
                  >
                    {String(t[labelKey as keyof typeof t])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fields */}
            {[
              { label: t.onb_shelter_name, value: orgName, setter: setOrgName, placeholder: t.onb_shelter_name_placeholder, required: true },
              { label: t.onb_th_new_ansprechpartner, value: ansprechpartner, setter: setAnsprechpartner, placeholder: t.onb_th_new_ansprechpartner_ph },
              { label: t.onb_th_new_kontakt_email, value: kontaktEmail, setter: setKontaktEmail, placeholder: "info@tierheim.de", keyboardType: "email-address" as const },
              { label: t.onb_shelter_phone, value: telefon, setter: setTelefon, placeholder: t.onb_shelter_phone_placeholder, keyboardType: "phone-pad" as const },
              { label: t.onb_shelter_address, value: adresse, setter: setAdresse, placeholder: t.onb_shelter_address_placeholder },
            ].map((f) => (
              <View key={f.label} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={f.value}
                  onChangeText={f.setter}
                  keyboardType={f.keyboardType ?? "default"}
                  autoCapitalize="sentences"
                />
              </View>
            ))}

            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>{t.onb_th_new_plz}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={plz}
                  onChangeText={setPlz}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 2 }]}>
                <Text style={styles.fieldLabel}>{t.onb_th_new_stadt}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.onb_th_new_stadt_ph}
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={stadt}
                  onChangeText={setStadt}
                />
              </View>
            </View>
          </View>
        );

      // ── Step 5: Verifizierung ──────────────────────────────────────────────
      case 5:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>🔐</Text>
            <Text style={styles.stepTitle}>{t.onb_th_new_step5_title}</Text>
            <Text style={styles.stepSub}>{t.onb_th_new_step5_sub}</Text>

            {verifyUri ? (
              <View style={[styles.infoCard, { borderLeftColor: "#00C853" }]}>
                <Text style={[styles.infoCardTitle, { color: "#00C853" }]}>
                  ✓ {t.onb_th_new_step5_in_progress}
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.infoCard, { borderLeftColor: ACCENT }]}>
                  <Text style={styles.infoCardText}>{t.onb_th_new_step5_doc_hint}</Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: false,
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setVerifyUri(result.assets[0].uri);
                    }
                  }}
                  style={[styles.nextBtn, { backgroundColor: ACCENT, width: "100%", marginBottom: 20 }]}
                >
                  <Text style={styles.nextBtnText}>{t.onb_th_new_step5_upload_btn}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.verifyStepsList}>
              {([
                "onb_th_new_vstep1",
                "onb_th_new_vstep2",
                "onb_th_new_vstep3",
              ] as const).map((key, i) => (
                <View key={key} style={styles.verifyStepRow}>
                  <View style={[styles.verifyStepNum, { backgroundColor: ACCENT + "22" }]}>
                    <Text style={[styles.verifyStepNumText, { color: ACCENT }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.verifyStepText}>{String(t[key])}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      // ── Step 6: Optional ───────────────────────────────────────────────────
      case 6:
        return (
          <View>
            <Text style={styles.stepTitle}>{t.onb_th_new_step6_title}</Text>
            <Text style={styles.stepSub}>{t.onb_th_new_step6_sub}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.onb_th_new_beschreibung}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t.onb_th_new_beschreibung_ph}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={beschreibung}
                onChangeText={setBeschreibung}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.onb_th_new_website}</Text>
              <TextInput
                style={styles.input}
                placeholder="https://mein-tierheim.de"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.onb_th_new_oeffnungszeiten}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t.onb_th_new_oeffnungszeiten_ph}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={oeffnungszeiten}
                onChangeText={setOeffnungszeiten}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.onb_th_new_richtlinien}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t.onb_th_new_richtlinien_ph}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={richtlinien}
                onChangeText={setRichtlinien}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        );

      // ── Step 7: Fertig ─────────────────────────────────────────────────────
      case 7:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.bigEmoji}>🎉</Text>
            <Text style={styles.heroTitle}>{t.onb_th_new_step7_title}</Text>
            <Text style={styles.heroSub}>{t.onb_th_new_step7_sub}</Text>

            <View style={[styles.summaryCard, { borderColor: ACCENT + "33" }]}>
              <Text style={[styles.summaryOrg, { color: ACCENT }]}>{orgName}</Text>
              {stadt ? (
                <Text style={styles.summaryDetail}>📍 {plz} {stadt}</Text>
              ) : null}
              {orgTyp ? (
                <Text style={styles.summaryDetail}>
                  🏷 {String(t[`onb_th_org_type_${orgTyp.replace("eingetragener_verein", "ev").replace("gemeinnuetzig", "gemeinn").replace("staatlich", "staatlich").replace("privat", "privat")}` as keyof typeof t] ?? orgTyp)}
                </Text>
              ) : null}
            </View>

            <Text style={styles.stepSub}>{t.onb_th_new_step7_hint}</Text>
          </View>
        );
    }
  };

  // ── Bottom Nav ────────────────────────────────────────────────────────────

  const isLastStep = step === TOTAL_STEPS;
  const isFirstStep = step === 1;

  return (
    <SafeAreaView style={styles.safe}>
      <ProgressBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {!isFirstStep ? (
          <TouchableOpacity onPress={back} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {t.onb_back}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Skip button for step 6 */}
        {step === 6 && (
          <TouchableOpacity
            onPress={() => setStep(7)}
            style={styles.skipBtn}
          >
            <Text style={styles.skipBtnText}>{t.onb_skip}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={isLastStep ? handleFinish : next}
          disabled={loading}
          style={[styles.nextBtn, { backgroundColor: ACCENT }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.nextBtnText}>
              {isLastStep ? t.onb_th_new_step7_btn : t.onb_next} {isLastStep ? "" : "→"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },

  progressContainer: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  progressSegment: {
    height: 4,
    borderRadius: 2,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingBottom: 12,
  },

  // Center layout (welcome / email / verify / done)
  centerContent: {
    alignItems: "center",
    paddingTop: 16,
  },
  bigEmoji: { fontSize: 64, marginBottom: 16 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.TEXT,
    textAlign: "center",
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 15,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 8,
  },
  stepSub: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 20,
  },

  // Feature list
  featureList: { width: "100%", gap: 10, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureCheck: { fontSize: 16, color: Colors.PRIMARY, fontWeight: "700", marginTop: 1 },
  featureText: { fontSize: 15, color: Colors.TEXT, flex: 1, lineHeight: 21 },

  // Info card
  infoCard: {
    backgroundColor: Colors.SURFACE,
    borderRadius: Sizes.RADIUS_L,
    padding: 16,
    borderLeftWidth: 4,
    width: "100%",
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoCardText: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    lineHeight: 20,
  },

  // Checkboxes
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.SURFACE,
    borderRadius: Sizes.RADIUS_L,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkmark: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.TEXT, lineHeight: 20 },

  // Pills (org type)
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.SURFACE,
  },
  pillText: { fontSize: 13, color: Colors.TEXT, fontWeight: "500" },

  // Fields
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
    marginBottom: 6,
  },
  input: {
    height: Sizes.INPUT_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: Sizes.RADIUS_M,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.SURFACE,
  },
  textArea: {
    height: undefined,
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
  },
  rowFields: { flexDirection: "row" },

  // Verify steps
  verifyStepsList: { width: "100%", gap: 12, marginTop: 8 },
  verifyStepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  verifyStepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyStepNumText: { fontWeight: "700", fontSize: 14 },
  verifyStepText: { flex: 1, fontSize: 14, color: Colors.TEXT, lineHeight: 20 },

  // Summary card (step 7)
  summaryCard: {
    width: "100%",
    backgroundColor: Colors.SURFACE,
    borderRadius: Sizes.RADIUS_L,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    gap: 6,
  },
  summaryOrg: { fontSize: 20, fontWeight: "700" },
  summaryDetail: { fontSize: 14, color: Colors.TEXT_MUTED },

  // Bottom nav
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    backgroundColor: Colors.BACKGROUND,
    gap: 10,
  },
  backBtn: {
    flex: 1,
    height: 50,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 15, color: Colors.TEXT, fontWeight: "500" },
  skipBtn: {
    height: 50,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: { fontSize: 14, color: Colors.TEXT_MUTED, fontWeight: "500" },
  nextBtn: {
    flex: 2,
    height: 50,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
