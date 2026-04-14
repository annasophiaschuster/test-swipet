import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

const ACCENT = Colors.PRIMARY;
const TOTAL_STEPS = 5;

// ─── ORG TYPE OPTIONS ──────────────────────────────────────────────────────────
const ORG_TYPES = [
  { key: "tierheim",               labelKey: "onb_th_org_type_tierheim"    },
  { key: "tierschutzorganisation", labelKey: "onb_th_org_type_schutzorg"   },
  { key: "tierschutzverein",       labelKey: "onb_th_org_type_schutzverein"},
  { key: "auffangstation",         labelKey: "onb_th_org_type_auffang"     },
] as const;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function TierheimOnboarding() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);

  // Step 2 – Organisations-Profil
  const [orgTyp, setOrgTyp]                   = useState<string>("");
  const [orgName, setOrgName]                 = useState("");
  const [ansprechpartner, setAnsprechpartner] = useState("");
  const [kontaktEmail, setKontaktEmail]       = useState("");
  const [telefon, setTelefon]                 = useState("");
  const [adresse, setAdresse]                 = useState("");
  const [plz, setPlz]                         = useState("");
  const [stadt, setStadt]                     = useState("");

  // Step 3 – Verifizierung
  const [verifyUri, setVerifyUri] = useState<string | null>(null);

  // Step 4 – Optional
  const [beschreibung, setBeschreibung] = useState("");
  const [website, setWebsite]           = useState("");
  const [oeffnungszeiten, setOeffnungszeiten] = useState("");
  const [richtlinien, setRichtlinien]   = useState("");
  const [instagram, setInstagram]       = useState("");

  // Newsletter (set via modal)
  const [newsletter, setNewsletter] = useState(false);

  // ── Pulse animation for "Weiter" button ─────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const next = () => {
    if (step === 2) {
      if (!orgTyp)                  { Alert.alert(t.err_generic, t.onb_th_err_orgtyp);       return; }
      if (!orgName.trim())          { Alert.alert(t.err_generic, t.onb_th_err_orgname);      return; }
      if (!ansprechpartner.trim())  { Alert.alert(t.err_generic, t.onb_th_err_contact);      return; }
      if (!kontaktEmail.trim())     { Alert.alert(t.err_generic, t.onb_th_err_kontaktemail); return; }
      if (!telefon.trim())          { Alert.alert(t.err_generic, t.onb_th_err_phone);        return; }
      if (!adresse.trim())          { Alert.alert(t.err_generic, t.onb_th_err_address);      return; }
      if (!plz.trim())              { Alert.alert(t.err_generic, t.onb_th_err_plz);          return; }
      if (!stadt.trim())            { Alert.alert(t.err_generic, t.onb_th_err_city);         return; }
    }
    if (step === 3 && !verifyUri) {
      Alert.alert(t.err_generic, t.onb_th_new_step5_required);
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  // ── Finish (shows newsletter modal first) ────────────────────────────────────

  const triggerFinish = () => setShowNewsletter(true);

  const handleFinish = async (wantsNewsletter: boolean) => {
    setShowNewsletter(false);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.err_not_logged_in);

      await supabase.from("profiles").upsert({
        id: user.id,
        newsletter: wantsNewsletter,
        datenschutz: true,
        updated_at: new Date().toISOString(),
      });

      await supabase.from("shelter_profiles").upsert({
        id: user.id,
        org_name:              orgName.trim(),
        org_typ:               orgTyp || null,
        ansprechpartner:       ansprechpartner.trim() || null,
        kontakt_email:         kontaktEmail.trim() || null,
        telefon:               telefon.trim() || null,
        adresse:               adresse.trim() || null,
        plz:                   plz.trim() || null,
        stadt:                 stadt.trim() || null,
        beschreibung:          beschreibung.trim() || null,
        website:               website.trim() || null,
        oeffnungszeiten:       oeffnungszeiten.trim() || null,
        vermittlungsrichtlinien: richtlinien.trim() || null,
        instagram:             instagram.trim() || null,
        updated_at:            new Date().toISOString(),
      });

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
            { backgroundColor: i < step ? ACCENT : Colors.BORDER },
          ]}
        />
      ))}
    </View>
  );

  // ── Step Header Icon ─────────────────────────────────────────────────────────

  const StepIcon = ({ name }: { name: React.ComponentProps<typeof Ionicons>["name"] }) => (
    <View style={styles.iconCircle}>
      <Ionicons name={name} size={44} color={ACCENT} />
    </View>
  );

  // ── Step Renders ─────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      // ── Step 1: Welcome ──────────────────────────────────────────────────────
      case 1:
        return (
          <View style={styles.centerContent}>
            <StepIcon name="home-outline" />
            <Text style={styles.heroTitle}>{t.onb_th_new_step1_title}</Text>
            <Text style={styles.heroSub}>{t.onb_th_new_step1_sub}</Text>
            <View style={styles.featureList}>
              {(["onb_th_new_feat1","onb_th_new_feat2","onb_th_new_feat3","onb_th_new_feat4"] as const).map((key) => (
                <View key={key} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                  <Text style={styles.featureText}>{String(t[key])}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      // ── Step 2: Eure Organisation ────────────────────────────────────────────
      case 2:
        return (
          <View>
            <StepIcon name="business-outline" />
            <Text style={styles.stepTitle}>{t.onb_th_new_step4_title}</Text>
            <Text style={styles.stepSub}>{t.onb_th_new_step4_sub}</Text>

            {/* Org Type Pills */}
            <Text style={styles.fieldLabel}>{t.onb_th_new_org_type} *</Text>
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
                  <Text style={[styles.pillText, orgTyp === key && { color: "#FFF" }]}>
                    {String(t[labelKey as keyof typeof t])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name der Organisation */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.onb_th_new_org_name}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.onb_th_new_org_name_ph}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={orgName}
                onChangeText={setOrgName}
              />
            </View>

            {/* Remaining mandatory fields */}
            {[
              { label: `${t.onb_th_new_ansprechpartner} *`, value: ansprechpartner, setter: setAnsprechpartner, placeholder: t.onb_th_new_ansprechpartner_ph },
              { label: `${t.onb_th_new_kontakt_email} *`,   value: kontaktEmail,    setter: setKontaktEmail,    placeholder: "info@organisation.de", keyboard: "email-address" as const },
              { label: `${t.onb_shelter_phone} *`,          value: telefon,         setter: setTelefon,         placeholder: t.onb_shelter_phone_placeholder, keyboard: "phone-pad" as const },
              { label: `${t.onb_shelter_address} *`,        value: adresse,         setter: setAdresse,         placeholder: t.onb_shelter_address_placeholder },
            ].map((f) => (
              <View key={f.label} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={f.value}
                  onChangeText={f.setter}
                  keyboardType={f.keyboard ?? "default"}
                  autoCapitalize="sentences"
                />
              </View>
            ))}

            {/* PLZ + Stadt row */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>{t.onb_th_new_plz} *</Text>
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
                <Text style={styles.fieldLabel}>{t.onb_th_new_stadt} *</Text>
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

      // ── Step 3: Verifizierung ────────────────────────────────────────────────
      case 3:
        return (
          <View style={styles.centerContent}>
            <StepIcon name="shield-checkmark-outline" />
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
                  style={[styles.uploadBtn]}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                  <Text style={styles.uploadBtnText}>{t.onb_th_new_step5_upload_btn}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.verifyStepsList}>
              {(["onb_th_new_vstep1","onb_th_new_vstep2","onb_th_new_vstep3"] as const).map((key, i) => (
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

      // ── Step 4: Optionale Details ────────────────────────────────────────────
      case 4:
        return (
          <View>
            <StepIcon name="create-outline" />
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
                multiline numberOfLines={4} textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.onb_th_new_website}</Text>
              <TextInput
                style={styles.input}
                placeholder="https://eure-organisation.de"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={website}
                onChangeText={setWebsite}
                keyboardType="url" autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t.onb_th_new_instagram}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.onb_th_new_instagram_ph}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none" autoCorrect={false}
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
                multiline numberOfLines={3} textAlignVertical="top"
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
                multiline numberOfLines={3} textAlignVertical="top"
              />
            </View>
          </View>
        );

      // ── Step 5: Fertig ───────────────────────────────────────────────────────
      case 5:
        return (
          <View style={styles.centerContent}>
            <StepIcon name="checkmark-circle-outline" />
            <Text style={styles.heroTitle}>{t.onb_th_new_step7_title}</Text>
            <Text style={styles.heroSub}>{t.onb_th_new_step7_sub}</Text>

            <View style={[styles.summaryCard, { borderColor: ACCENT + "33" }]}>
              <Text style={[styles.summaryOrg, { color: ACCENT }]}>{orgName}</Text>
              {stadt ? <Text style={styles.summaryDetail}>📍 {plz} {stadt}</Text> : null}
              {orgTyp ? (
                <Text style={styles.summaryDetail}>
                  🏷 {String(t[`onb_th_org_type_${
                    orgTyp === "tierheim" ? "tierheim" :
                    orgTyp === "tierschutzorganisation" ? "schutzorg" :
                    orgTyp === "tierschutzverein" ? "schutzverein" : "auffang"
                  }` as keyof typeof t] ?? orgTyp)}
                </Text>
              ) : null}
            </View>

            <Text style={styles.stepSub}>{t.onb_th_new_step7_hint}</Text>
          </View>
        );
    }
  };

  // ── Bottom Nav ────────────────────────────────────────────────────────────
  const isLastStep  = step === TOTAL_STEPS;
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
            <Ionicons name="arrow-back" size={18} color={Colors.TEXT} />
            <Text style={styles.backBtnText}>{t.onb_back}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Skip button for step 4 (optional details) */}
        {step === 4 && (
          <TouchableOpacity onPress={() => setStep(5)} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>{t.onb_skip}</Text>
          </TouchableOpacity>
        )}

        <Animated.View style={{ flex: 2, transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={isLastStep ? triggerFinish : next}
            disabled={loading}
            style={[styles.nextBtn, { backgroundColor: ACCENT }, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isLastStep ? t.onb_th_new_step7_btn : t.onb_next}
                </Text>
                {!isLastStep && <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />}
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Newsletter Modal */}
      <Modal
        visible={showNewsletter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewsletter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="mail-outline" size={40} color={ACCENT} style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>{t.onb_th_newsletter_title}</Text>
            <Text style={styles.modalSub}>{t.onb_th_newsletter_sub}</Text>

            <TouchableOpacity
              onPress={() => handleFinish(true)}
              style={[styles.modalBtn, { backgroundColor: ACCENT }]}
            >
              <Text style={styles.modalBtnText}>{t.onb_th_newsletter_yes}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleFinish(false)}
              style={[styles.modalBtn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: Colors.BORDER }]}
            >
              <Text style={[styles.modalBtnText, { color: Colors.TEXT_MUTED }]}>
                {t.onb_th_newsletter_no}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  progressSegment: { height: 4, borderRadius: 2, flex: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 12 },

  // Center layout
  centerContent: { alignItems: "center", paddingTop: 8 },

  // Step icon circle
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.BORDER,
  },

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
    textAlign: "center",
  },
  stepSub: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },

  // Feature list
  featureList: { width: "100%", gap: 10, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
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
  infoCardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  infoCardText: { fontSize: 14, color: Colors.TEXT_MUTED, lineHeight: 20 },

  // Upload button (step 3)
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 99,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 20,
    width: "100%",
    justifyContent: "center",
  },
  uploadBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  // Pills (org type)
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
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
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  verifyStepNumText: { fontWeight: "700", fontSize: 14 },
  verifyStepText: { flex: 1, fontSize: 14, color: Colors.TEXT, lineHeight: 20 },

  // Summary card (step 5)
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
    flexDirection: "row",
    gap: 6,
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
    flex: 1,
    height: 50,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  nextBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Newsletter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.TEXT,
    marginBottom: 10,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  modalBtn: {
    width: "100%",
    height: 50,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
