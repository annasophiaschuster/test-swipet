import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { pickSingleImage, uploadImageToStorage } from "../../lib/storage";
import GradientHeader from "../../components/GradientHeader";
import { useLanguage } from "../../contexts/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Type
// ─────────────────────────────────────────────────────────────────────────────

type ShelterProfile = {
  id: string;
  org_name: string | null;
  org_typ: string | null;
  ansprechpartner: string | null;
  beschreibung: string | null;
  website: string | null;
  adresse: string | null;
  plz: string | null;
  city: string | null;
  telefon: string | null;
  email: string | null;
  logo_url: string | null;
  gegruendet_seit: number | null;
  zertifizierungen: string | null;
  offnungszeiten: string | null;
  instagram: string | null;
  richtlinien: string | null;
};

const DEMO_PROFILE: ShelterProfile = {
  id: "demo",
  org_name: "Demo-Tierheim",
  org_typ: "tierheim",
  ansprechpartner: "Maria Muster",
  beschreibung: null,
  website: "www.demo-tierheim.de",
  adresse: "Musterstr. 1",
  plz: "40213",
  city: "Düsseldorf",
  telefon: "+49 89 123456",
  email: "info@demo-tierheim.de",
  logo_url: null,
  gegruendet_seit: 2005,
  zertifizierungen: null,
  offnungszeiten: "Mo-Fr 9-18, Sa 10-15",
  instagram: null,
  richtlinien: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fieldLabel = {
  fontSize: 12,
  fontWeight: "700" as const,
  color: Colors.TEXT_MUTED,
  textTransform: "uppercase" as const,
  letterSpacing: 0.8,
  marginBottom: 6,
};
const inputStyle = {
  borderWidth: 1.5,
  borderColor: Colors.BORDER,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 11,
  fontSize: 15,
  color: Colors.TEXT,
  backgroundColor: Colors.BACKGROUND,
  marginBottom: 18,
};

function InfoRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: "500", color: onPress ? Colors.PRIMARY : Colors.TEXT, marginTop: 1 }} numberOfLines={2}>{value}</Text>
      </View>
      {onPress && <Text style={{ color: Colors.TEXT_MUTED }}>›</Text>}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{inner}</TouchableOpacity> : <>{inner}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function TierheimProfilScreen() {
  const { t } = useLanguage();

  const [profile, setProfile]     = useState<ShelterProfile | null>(null);
  const [hundeCount, setHundeCount] = useState<number>(0);
  const [loading, setLoading]     = useState(true);
  const [isGuest, setIsGuest]     = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Edit state
  const [editOrgName, setEditOrgName]             = useState("");
  const [editOrgTyp, setEditOrgTyp]               = useState("");
  const [editAnsprechpartner, setEditAnsprechpartner] = useState("");
  const [editTelefon, setEditTelefon]             = useState("");
  const [editEmail, setEditEmail]                 = useState("");
  const [editAdresse, setEditAdresse]             = useState("");
  const [editPlz, setEditPlz]                     = useState("");
  const [editCity, setEditCity]                   = useState("");
  const [editWebsite, setEditWebsite]             = useState("");
  const [editInstagram, setEditInstagram]         = useState("");
  const [editHours, setEditHours]                 = useState("");
  const [editRichtlinien, setEditRichtlinien]     = useState("");
  const [editBeschreibung, setEditBeschreibung]   = useState("");
  const [editGegruendet, setEditGegruendet]       = useState("");
  const [editZertif, setEditZertif]               = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setProfile({ ...DEMO_PROFILE, org_name: t.tierheim_demo_name, beschreibung: t.tierheim_demo_desc });
        setHundeCount(5);
        return;
      }

      setIsGuest(false);

      const { data } = await supabase
        .from("shelter_profiles")
        .select("id, org_name, org_typ, ansprechpartner, beschreibung, website, adresse, plz, city, telefon, email, logo_url, gegruendet_seit, zertifizierungen, offnungszeiten, instagram, richtlinien")
        .eq("id", user.id)
        .maybeSingle();

      const p: ShelterProfile = data ?? {
        id: user.id,
        org_name: null, org_typ: null, ansprechpartner: null,
        beschreibung: null, website: null,
        adresse: null, plz: null, city: null, telefon: null, email: null,
        logo_url: null, gegruendet_seit: null, zertifizierungen: null,
        offnungszeiten: null, instagram: null, richtlinien: null,
      };
      setProfile(p);

      // Count available dogs
      const { count } = await supabase
        .from("pets")
        .select("id", { count: "exact", head: true })
        .eq("shelter_id", user.id)
        .eq("status", "verfuegbar");
      setHundeCount(count ?? 0);
    } catch (e) {
      console.error("TierheimProfil.loadProfile", e);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!profile) return;
    setEditOrgName(profile.org_name ?? "");
    setEditOrgTyp(profile.org_typ ?? "");
    setEditAnsprechpartner(profile.ansprechpartner ?? "");
    setEditTelefon(profile.telefon ?? "");
    setEditEmail(profile.email ?? "");
    setEditAdresse(profile.adresse ?? "");
    setEditPlz(profile.plz ?? "");
    setEditCity(profile.city ?? "");
    setEditWebsite(profile.website ?? "");
    setEditInstagram(profile.instagram ?? "");
    setEditHours(profile.offnungszeiten ?? "");
    setEditRichtlinien(profile.richtlinien ?? "");
    setEditBeschreibung(profile.beschreibung ?? "");
    setEditGegruendet(profile.gegruendet_seit ? String(profile.gegruendet_seit) : "");
    setEditZertif(profile.zertifizierungen ?? "");
    setEditMode(true);
  };

  const handleSave = async () => {
    if (isGuest || !profile) return;
    setSaving(true);
    try {
      const updates: Partial<ShelterProfile> & { id: string } = {
        id: profile.id,
        org_name:         editOrgName.trim() || null,
        org_typ:          editOrgTyp || null,
        ansprechpartner:  editAnsprechpartner.trim() || null,
        telefon:          editTelefon.trim() || null,
        email:            editEmail.trim() || null,
        adresse:          editAdresse.trim() || null,
        plz:              editPlz.trim() || null,
        city:             editCity.trim() || null,
        website:          editWebsite.trim() || null,
        instagram:        editInstagram.trim() || null,
        offnungszeiten:   editHours.trim() || null,
        richtlinien:      editRichtlinien.trim() || null,
        beschreibung:     editBeschreibung.trim() || null,
        gegruendet_seit:  editGegruendet ? parseInt(editGegruendet) : null,
        zertifizierungen: editZertif.trim() || null,
      };
      await supabase.from("shelter_profiles").upsert(updates);
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
      setEditMode(false);
    } catch (e: any) {
      Alert.alert(t.err_generic, e.message ?? t.gassi_profil_save_failed);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!profile) return;
    try {
      const asset = await pickSingleImage();
      if (!asset) return;
      setUploadingLogo(true);
      const url = await uploadImageToStorage("avatars", `shelter_${profile.id}.jpg`, asset.uri);
      await supabase.from("shelter_profiles").upsert({ id: profile.id, logo_url: url });
      setProfile((prev) => prev ? { ...prev, logo_url: url } : prev);
    } catch (e: any) {
      Alert.alert(t.err_generic, e.message ?? t.profil_err_upload);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t.profil_sign_out, t.profil_sign_out_confirm, [
      { text: t.profil_cancel, style: "cancel" },
      {
        text: t.profil_sign_out, style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.PRIMARY} />
      </View>
    );
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────────

  if (editMode) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}
      >
        <View style={{
          paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}>
          <TouchableOpacity onPress={() => setEditMode(false)}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 15 }}>{t.tierheim_profil_edit_cancel}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "700", color: Colors.TEXT }}>{t.tierheim_profil_edit_title}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.PRIMARY} size="small" />
              : <Text style={{ color: Colors.PRIMARY, fontSize: 15, fontWeight: "700" }}>{t.tierheim_profil_save}</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>

          {/* 1. Ansprechpartner */}
          <EditField label="Ansprechpartner" value={editAnsprechpartner} setter={setEditAnsprechpartner} placeholder="Vor- und Nachname" />

          {/* 3. Telefon */}
          <EditField label={t.tierheim_profil_label_phone} value={editTelefon} setter={setEditTelefon} placeholder="+49 89 123456" keyboard="phone-pad" />

          {/* 4. E-Mail */}
          <EditField label={t.tierheim_profil_label_email} value={editEmail} setter={setEditEmail} placeholder="info@tierheim.de" keyboard="email-address" />

          {/* 5. Adresse + PLZ + Stadt */}
          <EditField label={t.tierheim_profil_label_address} value={editAdresse} setter={setEditAdresse} placeholder="Straße und Hausnummer" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <EditField label="PLZ" value={editPlz} setter={setEditPlz} placeholder="12345" keyboard="numeric" />
            </View>
            <View style={{ flex: 2 }}>
              <EditField label={t.tierheim_profil_label_city} value={editCity} setter={setEditCity} placeholder="Stadt" />
            </View>
          </View>

          {/* 6. Website */}
          <EditField label={t.tierheim_profil_label_website} value={editWebsite} setter={setEditWebsite} placeholder="www.mein-tierheim.de" keyboard="url" />

          {/* 7. Instagram */}
          <EditField label="Instagram" value={editInstagram} setter={setEditInstagram} placeholder="@mein_tierheim" />

          {/* 8. Öffnungszeiten */}
          <EditField label={t.tierheim_profil_label_hours} value={editHours} setter={setEditHours} placeholder="Mo–Fr 9–18 Uhr, Sa 10–15 Uhr" />

          {/* 9. Adoptionsrichtlinien */}
          <View style={{ marginBottom: 18 }}>
            <Text style={fieldLabel}>Adoptionsrichtlinien</Text>
            <TextInput
              value={editRichtlinien}
              onChangeText={setEditRichtlinien}
              placeholder="z.B. Schutzvertrag erforderlich, Hausbesuch, …"
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline
              numberOfLines={3}
              style={[inputStyle, { height: 90, textAlignVertical: "top" }]}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader
        title="Profil"
        showBack backLabel={t.comp_switch_modes} onBack={() => router.replace("/")}
        rightElement={!isGuest ? (
          <TouchableOpacity
            onPress={startEdit}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Sizes.RADIUS_FULL, backgroundColor: "rgba(255,255,255,0.25)" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.WHITE }}>{t.tierheim_profil_edit_profile_btn}</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 40 }}>

        {/* Logo + Name */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <TouchableOpacity onPress={!isGuest ? handleLogoUpload : undefined} disabled={uploadingLogo} style={{ marginBottom: 14 }}>
            {profile?.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.PRIMARY }} />
            ) : (
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.BORDER }}>
                <Image source={require("../../assets/tab-haus.png")} style={{ width: 48, height: 48, resizeMode: "contain", tintColor: Colors.PRIMARY }} />
              </View>
            )}
            {!isGuest && (
              <View style={{
                position: "absolute", bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: uploadingLogo ? Colors.TEXT_MUTED : Colors.PRIMARY,
                alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.WHITE,
              }}>
                {uploadingLogo ? <ActivityIndicator size="small" color={Colors.WHITE} /> : <Text style={{ fontSize: 13 }}>📷</Text>}
              </View>
            )}
          </TouchableOpacity>

          <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.TEXT, textAlign: "center" }}>
            {profile?.org_name ?? t.tierheim_profil_fallback_name}
          </Text>
          {profile?.city && (
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 4 }}>{profile.city}</Text>
          )}
          <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: "#FFF0F3", borderRadius: Sizes.RADIUS_FULL }}>
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>{t.tierheim_profil_role}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 16, alignItems: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.PRIMARY }}>{hundeCount}</Text>
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2, textAlign: "center" }}>{t.tierheim_profil_dogs_available}</Text>
          </View>
          {profile?.gegruendet_seit && (
            <View style={{ flex: 1, backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 16, alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.PRIMARY }}>{profile.gegruendet_seit}</Text>
              <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2, textAlign: "center" }}>{t.tierheim_profil_founded}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {profile?.beschreibung && (
          <View style={{ marginBottom: 20, padding: 16, backgroundColor: Colors.SURFACE, borderRadius: 16 }}>
            <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 24 }}>{profile.beschreibung}</Text>
          </View>
        )}

        {/* Zertifizierungen */}
        {profile?.zertifizierungen && (
          <View style={{ marginBottom: 20, padding: 14, backgroundColor: "#FFF9EC", borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 18 }}>🏅</Text>
            <Text style={{ flex: 1, fontSize: 14, color: Colors.TEXT, fontWeight: "500" }}>{profile.zertifizierungen}</Text>
          </View>
        )}

        {/* Contact Info */}
        <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.BORDER, marginBottom: 20 }}>
          <View style={{ padding: 14, backgroundColor: Colors.SURFACE }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
              {t.tierheim_profil_contact_section}
            </Text>
          </View>

          <InfoRow
            label="Organisationstyp"
            value={
              profile?.org_typ === "tierheim" ? "Tierheim" :
              profile?.org_typ === "tierschutzorganisation" ? "Tierschutzorganisation" :
              profile?.org_typ === "tierschutzverein" ? "Tierschutzverein" :
              profile?.org_typ === "auffangstation" ? "Auffangstation" :
              profile?.org_typ ?? "–"
            }
          />
          <InfoRow
            label="Ansprechpartner"
            value={profile?.ansprechpartner ?? "–"}
          />
          <InfoRow
            label={t.tierheim_profil_phone_label}
            value={profile?.telefon ?? "–"}
            onPress={profile?.telefon ? () => Linking.openURL(`tel:${profile.telefon}`) : undefined}
          />
          <InfoRow
            label={t.tierheim_profil_email_label}
            value={profile?.email ?? "–"}
            onPress={profile?.email ? () => Linking.openURL(`mailto:${profile.email}`) : undefined}
          />
          <InfoRow
            label={t.tierheim_profil_address_label}
            value={
              profile?.adresse
                ? [profile.adresse, [profile.plz, profile.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
                : "–"
            }
            onPress={profile?.adresse ? () => Linking.openURL(`maps:?q=${encodeURIComponent([profile!.adresse, profile!.city].filter(Boolean).join(", "))}`) : undefined}
          />
          <InfoRow
            label={t.tierheim_profil_website_label}
            value={profile?.website ?? "–"}
            onPress={profile?.website ? () => {
              const url = profile.website!.startsWith("http") ? profile.website! : `https://${profile.website}`;
              Linking.openURL(url);
            } : undefined}
          />
          <InfoRow
            label="Instagram"
            value={profile?.instagram ?? "–"}
            onPress={profile?.instagram ? () => {
              const handle = profile.instagram!.replace("@", "");
              Linking.openURL(`https://instagram.com/${handle}`);
            } : undefined}
          />
          <InfoRow
            label={t.tierheim_profil_hours_label}
            value={profile?.offnungszeiten ?? "–"}
          />
          <InfoRow
            label="Adoptionsrichtlinien"
            value={profile?.richtlinien ?? "–"}
          />
        </View>

        {/* Logout / Login */}
        {!isGuest ? (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ height: Sizes.BUTTON_HEIGHT, borderWidth: 1.5, borderColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: Colors.PRIMARY, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>{t.profil_sign_out}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{ height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "700" }}>{t.tierheim_profil_login_btn}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function EditField({ label, value, setter, placeholder, keyboard }: {
  label: string; value: string; setter: (v: string) => void;
  placeholder?: string; keyboard?: any;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor={Colors.TEXT_MUTED}
        keyboardType={keyboard ?? "default"}
        autoCapitalize="none"
        style={inputStyle}
      />
    </View>
  );
}
