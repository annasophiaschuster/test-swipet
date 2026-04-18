import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { pickSingleImage, pickMultipleImages, uploadImageToStorage } from "../../../lib/storage";
import { useLanguage } from "../../../contexts/LanguageContext";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

const TOTAL_STEPS = 7;

type Groesse = "klein" | "mittel" | "gross" | "riese";
type Aktivitaet = "sportlich" | "mittel" | "ruhig";
type Treffpunkt = "park" | "wald" | "egal";
type Ansprache = "mann" | "frau" | "divers";

const ALL_TAGS = ["verspielt", "verschmust", "ruhig", "energetisch", "treu", "neugierig"];
const ALL_AVAILABILITY = ["morgens", "mittags", "abends", "wochenende"];

export default function TierhalterOnboarding() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 3 — Datenschutz
  const [datenschutz, setDatenschutz] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  // Step 4 — Persönliche Infos
  const [ansprache, setAnsprache] = useState<Ansprache | null>(null);
  const [vorname, setVorname] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [plz, setPlz] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  // Step 5 — Lifestyle
  const [aktivitaet, setAktivitaet] = useState<Aktivitaet | null>(null);
  const [treffpunkt, setTreffpunkt] = useState<Treffpunkt | null>(null);
  const [verfuegbarkeit, setVerfuegbarkeit] = useState<string[]>([]);

  // Step 6 — Hund
  const [dogName, setDogName] = useState("");
  const [dogGroesse, setDogGroesse] = useState<Groesse | null>(null);
  const [dogAlter, setDogAlter] = useState("");
  const [dogGeschlecht, setDogGeschlecht] = useState<"maennlich" | "weiblich" | null>(null);
  const [dogAktivitaet, setDogAktivitaet] = useState<Aktivitaet | null>(null);
  const [dogAnimalFriendly, setDogAnimalFriendly] = useState<boolean | null>(null);
  const [dogTags, setDogTags] = useState<string[]>([]);
  const [dogDesc, setDogDesc] = useState("");
  const [dogPhotoUris, setDogPhotoUris] = useState<string[]>([]);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const validateStep3 = () => true;
  const validateStep4 = () => true;
  const validateStep6 = () => true;

  const toggleTag = (tag: string) => {
    if (dogTags.includes(tag)) {
      setDogTags(dogTags.filter((t) => t !== tag));
    } else if (dogTags.length < 3) {
      setDogTags([...dogTags, tag]);
    }
  };

  const toggleAvailability = (slot: string) => {
    setVerfuegbarkeit((v) =>
      v.includes(slot) ? v.filter((x) => x !== slot) : [...v, slot]
    );
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const pickDogPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, selectionLimit: 3, quality: 0.8,
    });
    if (!result.canceled) {
      setDogPhotoUris(result.assets.map((a) => a.uri).slice(0, 3));
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.onb_err_not_logged_in);

      // Upload avatar
      let avatarUrl: string | null = null;
      if (avatarUri) {
        avatarUrl = await uploadImageToStorage(avatarUri, "avatars", user.id + "_avatar");
      }

      // Update profile
      await supabase.from("profiles").update({
        ansprache, vorname: vorname.trim(), geburtsdatum,
        plz: plz.trim(), bio: bio.trim() || null,
        avatar_url: avatarUrl,
        newsletter, datenschutz,
        bevorzugter_treffpunkt: treffpunkt ?? undefined,
        verfuegbarkeit,
      }).eq("id", user.id);

      // Upload dog photos
      const fotoUrls: string[] = [];
      for (let i = 0; i < dogPhotoUris.length; i++) {
        const url = await uploadImageToStorage(dogPhotoUris[i], "pet-photos", `${user.id}_dog_${i}`);
        if (url) fotoUrls.push(url);
      }

      // Create dog profile
      await supabase.from("owner_pets").insert({
        owner_id: user.id,
        name: dogName.trim(),
        tierart: "hund",
        groesse_kategorie: dogGroesse ?? undefined,
        alter_jahre: dogAlter ? parseInt(dogAlter) : null,
        geschlecht: dogGeschlecht ?? undefined,
        aktivitaetslevel: dogAktivitaet ?? undefined,
        vertraeglich_mit_tieren: dogAnimalFriendly ?? false,
        charakter_tags: dogTags,
        beschreibung: dogDesc.trim() || null,
        foto_url: fotoUrls[0] ?? null,
        foto_urls: fotoUrls,
        modus: "gassi",
      });

      router.replace("/gassi/feed");
    } catch (e: any) {
      Alert.alert(t.err_generic, e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      {step > 1 && step < TOTAL_STEPS && (
        <View style={s.progressWrap}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${((step - 1) / (TOTAL_STEPS - 2)) * 100}%` }]} />
          </View>
          <Text style={s.progressText}>{t.onb_step} {step - 1} {t.onb_of} {TOTAL_STEPS - 2}</Text>
        </View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <View style={s.centerBlock}>
            <Text style={s.welcomeEmoji}>🐾</Text>
            <Text style={s.welcomeTitle}>{t.onb_hb_welcome_title}</Text>
            <Text style={s.welcomeSub}>{t.onb_hb_welcome_sub}</Text>
            <View style={s.featureList}>
              {["🤝 Gassipartner finden", "💬 Direkt verabreden", "🐕 Mehrere Hunde anlegen"].map((f) => (
                <View key={f} style={s.featureRow}><Text style={s.featureText}>{f}</Text></View>
              ))}
            </View>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.SECONDARY }]} onPress={goNext}>
              <Text style={s.primaryBtnText}>{t.onb_hb_welcome_btn}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: E-Mail Bestätigung */}
        {step === 2 && (
          <View style={s.centerBlock}>
            <Text style={s.stepEmoji}>📧</Text>
            <Text style={s.stepTitle}>Konto erstellt!</Text>
            <Text style={s.stepSub}>Wir haben dir eine Bestätigungs-E-Mail gesendet. Du kannst trotzdem direkt loslegen.</Text>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.SECONDARY }]} onPress={goNext}>
              <Text style={s.primaryBtnText}>{t.onb_next}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Datenschutz */}
        {step === 3 && (
          <View>
            <Text style={s.stepTitle}>{t.onb_hs_privacy_title}</Text>
            <Text style={s.stepSub}>{t.onb_hs_privacy_sub}</Text>
            <TouchableOpacity style={s.checkRow} onPress={() => setDatenschutz(!datenschutz)}>
              <View style={[s.checkbox, datenschutz && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]}>
                {datenschutz && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={s.checkLabel}>{t.onb_hs_privacy_accept}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.checkRow} onPress={() => setNewsletter(!newsletter)}>
              <View style={[s.checkbox, newsletter && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]}>
                {newsletter && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={s.checkLabel}>{t.onb_hs_privacy_newsletter}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Persönliche Infos */}
        {step === 4 && (
          <View>
            <Text style={s.stepTitle}>{t.onb_hb_info_title}</Text>

            <Text style={s.label}>{t.onb_hs_info_salutation}</Text>
            <View style={s.chipRow}>
              {(["mann", "frau", "divers"] as Ansprache[]).map((a) => {
                const labels = { mann: t.onb_hs_info_salutation_male, frau: t.onb_hs_info_salutation_female, divers: t.onb_hs_info_salutation_diverse };
                return (
                  <TouchableOpacity key={a} style={[s.chip, ansprache === a && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => setAnsprache(a)}>
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

            <Text style={s.label}>{t.onb_hb_info_plz}</Text>
            <TextInput style={s.input} value={plz} onChangeText={setPlz} placeholder="z.B. 80331 / Schwabing" placeholderTextColor={Colors.TEXT_MUTED} />

            <Text style={s.label}>{t.onb_hb_info_avatar_hint}</Text>
            <TouchableOpacity style={[s.avatarPicker, avatarUri ? { borderColor: Colors.SECONDARY } : {}]} onPress={pickAvatar}>
              <Text style={s.avatarPickerText}>{avatarUri ? "✅ Foto ausgewählt" : "📷 Profilbild auswählen"}</Text>
            </TouchableOpacity>

            <Text style={s.label}>{t.onb_hb_info_bio}</Text>
            <TextInput style={[s.input, { minHeight: 80 }]} value={bio} onChangeText={setBio} placeholder={t.onb_hb_info_bio_placeholder} placeholderTextColor={Colors.TEXT_MUTED} multiline />
          </View>
        )}

        {/* Step 5: Lifestyle */}
        {step === 5 && (
          <View>
            <Text style={s.stepTitle}>{t.onb_hb_lifestyle_title}</Text>

            <Text style={s.label}>{t.onb_activity_title}</Text>
            {([["sportlich", t.onb_activity_athletic], ["mittel", t.onb_activity_medium], ["ruhig", t.onb_activity_calm]] as [Aktivitaet, string][]).map(([k, label]) => (
              <TouchableOpacity key={k} style={[s.optionCard, aktivitaet === k && s.optionCardSecActive]} onPress={() => setAktivitaet(k)}>
                <Text style={[s.optionText, aktivitaet === k && { color: Colors.SECONDARY }]}>{label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.label}>{t.onb_hb_lifestyle_meetingplace}</Text>
            <View style={s.chipRow}>
              {([["park", t.gassi_profil_meeting_park], ["wald", t.gassi_profil_meeting_forest], ["egal", t.gassi_profil_meeting_any]] as [Treffpunkt, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, treffpunkt === k && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => setTreffpunkt(k)}>
                  <Text style={[s.chipText, treffpunkt === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>{t.onb_hb_lifestyle_availability}</Text>
            <View style={s.chipRow}>
              {([["morgens", t.onb_hb_availability_morning], ["mittags", t.onb_hb_availability_noon], ["abends", t.onb_hb_availability_evening], ["wochenende", t.onb_hb_availability_weekend]] as [string, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, verfuegbarkeit.includes(k) && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => toggleAvailability(k)}>
                  <Text style={[s.chipText, verfuegbarkeit.includes(k) && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 6: Hund anlegen */}
        {step === 6 && (
          <View>
            <Text style={s.stepTitle}>{t.onb_hb_dog_title}</Text>
            <Text style={s.stepSub}>{t.onb_hb_dog_sub}</Text>

            <Text style={s.label}>{t.gassi_register_label_name}</Text>
            <TextInput style={s.input} value={dogName} onChangeText={setDogName} placeholder={t.gassi_register_ph_name} placeholderTextColor={Colors.TEXT_MUTED} />

            <Text style={s.label}>{t.onb_hb_dog_photo_hint}</Text>
            <TouchableOpacity style={[s.avatarPicker, dogPhotoUris.length > 0 ? { borderColor: Colors.SECONDARY } : {}]} onPress={pickDogPhotos}>
              <Text style={s.avatarPickerText}>
                {dogPhotoUris.length > 0 ? `✅ ${dogPhotoUris.length} Foto(s) ausgewählt` : "📷 Fotos auswählen (min. 1)"}
              </Text>
            </TouchableOpacity>

            <Text style={s.label}>{t.gassi_register_label_size}</Text>
            <View style={s.chipRow}>
              {([["klein", t.onb_th_size_small], ["mittel", t.onb_th_size_medium], ["gross", t.onb_th_size_large], ["riese", t.onb_th_size_giant]] as [Groesse, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, dogGroesse === k && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => setDogGroesse(k)}>
                  <Text style={[s.chipText, dogGroesse === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>{t.gassi_register_label_age}</Text>
            <TextInput style={s.input} value={dogAlter} onChangeText={setDogAlter} placeholder="z.B. 3" placeholderTextColor={Colors.TEXT_MUTED} keyboardType="numeric" />

            <Text style={s.label}>{t.shelter_add_section_gender}</Text>
            <View style={s.chipRow}>
              {([["maennlich", "♂ Männlich"], ["weiblich", "♀ Weiblich"]] as ["maennlich" | "weiblich", string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, dogGeschlecht === k && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => setDogGeschlecht(k)}>
                  <Text style={[s.chipText, dogGeschlecht === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>{t.gassi_register_label_activity}</Text>
            <View style={s.chipRow}>
              {([["sportlich", t.onb_activity_athletic], ["mittel", t.onb_activity_medium], ["ruhig", t.onb_activity_calm]] as [Aktivitaet, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, dogAktivitaet === k && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => setDogAktivitaet(k)}>
                  <Text style={[s.chipText, dogAktivitaet === k && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>{t.onb_th_animal_friendly}</Text>
            <View style={s.chipRow}>
              <TouchableOpacity style={[s.chip, dogAnimalFriendly === true && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => setDogAnimalFriendly(true)}>
                <Text style={[s.chipText, dogAnimalFriendly === true && { color: "#FFF" }]}>{t.onb_yes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.chip, dogAnimalFriendly === false && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => setDogAnimalFriendly(false)}>
                <Text style={[s.chipText, dogAnimalFriendly === false && { color: "#FFF" }]}>{t.onb_no}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>{t.onb_hb_dog_char_tags}</Text>
            <View style={s.chipRow}>
              {ALL_TAGS.map((tag) => (
                <TouchableOpacity key={tag} style={[s.chip, dogTags.includes(tag) && { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY }]} onPress={() => toggleTag(tag)}>
                  <Text style={[s.chipText, dogTags.includes(tag) && { color: "#FFF" }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>{t.onb_hb_dog_desc}</Text>
            <TextInput style={[s.input, { minHeight: 80 }]} value={dogDesc} onChangeText={setDogDesc} placeholder={t.onb_hb_dog_desc_placeholder} placeholderTextColor={Colors.TEXT_MUTED} multiline />
          </View>
        )}

        {/* Step 7: Fertig */}
        {step === 7 && (
          <View style={s.centerBlock}>
            <Text style={s.welcomeEmoji}>🐾</Text>
            <Text style={s.welcomeTitle}>{t.onb_hb_done_title}</Text>
            <Text style={s.welcomeSub}>{t.onb_hb_done_sub}</Text>
            {loading ? (
              <ActivityIndicator color={Colors.SECONDARY} style={{ marginTop: 24 }} />
            ) : (
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: Colors.SECONDARY }]} onPress={handleFinish}>
                <Text style={s.primaryBtnText}>{t.onb_hb_done_btn}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {step > 1 && step < TOTAL_STEPS && (
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Text style={s.backBtnText}>{t.onb_back}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: Colors.SECONDARY }]}
            onPress={() => {
              if (step === 3 && !validateStep3()) return;
              if (step === 4 && !validateStep4()) return;
              if (step === 6 && !validateStep6()) return;
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },
  progressWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  progressBg: { height: 4, backgroundColor: Colors.BORDER, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.SECONDARY, borderRadius: 2 },
  progressText: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 4, textAlign: "right" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  centerBlock: { alignItems: "center", paddingTop: 20 },
  welcomeEmoji: { fontSize: 64, marginBottom: 16 },
  welcomeTitle: { fontSize: 26, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 12 },
  welcomeSub: { fontSize: 16, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 24, marginBottom: 24 },
  featureList: { width: "100%", marginBottom: 32 },
  featureRow: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: Colors.SURFACE, borderRadius: 12, marginBottom: 8 },
  featureText: { fontSize: 15, color: Colors.TEXT },
  stepEmoji: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  stepTitle: { fontSize: 22, fontWeight: "700", color: Colors.TEXT, marginBottom: 8 },
  stepSub: { fontSize: 15, color: Colors.TEXT_MUTED, lineHeight: 22, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: Colors.TEXT, marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 4 },
  input: { borderWidth: 1, borderColor: Colors.BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.TEXT, backgroundColor: "#FFF" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.BORDER, backgroundColor: "#FFF" },
  chipText: { fontSize: 14, color: Colors.TEXT },
  optionCard: { borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: "#FFF" },
  optionCardSecActive: { borderColor: Colors.SECONDARY, backgroundColor: "#FFF4EE" },
  optionText: { fontSize: 15, fontWeight: "600", color: Colors.TEXT },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.TEXT, lineHeight: 20 },
  avatarPicker: { borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 10, borderStyle: "dashed", paddingVertical: 16, alignItems: "center", backgroundColor: Colors.SURFACE },
  avatarPickerText: { fontSize: 15, color: Colors.TEXT_MUTED },
  primaryBtn: { width: "100%", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  navRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: Colors.BORDER },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.BORDER, alignItems: "center" },
  backBtnText: { fontSize: 15, color: Colors.TEXT, fontWeight: "500" },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  nextBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
