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

// ─────────────────────────────────────────────────────────────────────────────
// Type
// ─────────────────────────────────────────────────────────────────────────────

type ShelterProfile = {
  id: string;
  org_name: string | null;
  beschreibung: string | null;
  website: string | null;
  adresse: string | null;
  city: string | null;
  telefon: string | null;
  email: string | null;
  logo_url: string | null;
  gegruendet_seit: number | null;
  zertifizierungen: string | null;
  offnungszeiten: string | null;
};

const DEMO_PROFILE: ShelterProfile = {
  id: "demo",
  org_name: "Demo-Tierheim",
  beschreibung: "Wir vermitteln glückliche Hunde in liebevolle Zuhause.",
  website: "www.demo-tierheim.de",
  adresse: "Musterstraße 1, 80331 München",
  city: "München",
  telefon: "+49 89 123456",
  email: "info@demo-tierheim.de",
  logo_url: null,
  gegruendet_seit: 2005,
  zertifizierungen: null,
  offnungszeiten: "Mo–Fr 9–18 Uhr, Sa 10–15 Uhr",
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

function InfoRow({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER }}>
      <Text style={{ fontSize: 20, marginRight: 14 }}>{icon}</Text>
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
  const [profile, setProfile]     = useState<ShelterProfile | null>(null);
  const [hundeCount, setHundeCount] = useState<number>(0);
  const [loading, setLoading]     = useState(true);
  const [isGuest, setIsGuest]     = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Edit state
  const [editOrgName, setEditOrgName]       = useState("");
  const [editBeschreibung, setEditBeschreibung] = useState("");
  const [editWebsite, setEditWebsite]       = useState("");
  const [editAdresse, setEditAdresse]       = useState("");
  const [editCity, setEditCity]             = useState("");
  const [editTelefon, setEditTelefon]       = useState("");
  const [editEmail, setEditEmail]           = useState("");
  const [editHours, setEditHours]           = useState("");
  const [editGegruendet, setEditGegruendet] = useState("");
  const [editZertif, setEditZertif]         = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setProfile(DEMO_PROFILE);
        setHundeCount(5);
        return;
      }

      setIsGuest(false);

      const { data } = await supabase
        .from("shelter_profiles")
        .select("id, org_name, beschreibung, website, adresse, city, telefon, email, logo_url, gegruendet_seit, zertifizierungen, offnungszeiten")
        .eq("id", user.id)
        .maybeSingle();

      const p: ShelterProfile = data ?? {
        id: user.id,
        org_name: null, beschreibung: null, website: null,
        adresse: null, city: null, telefon: null, email: null,
        logo_url: null, gegruendet_seit: null, zertifizierungen: null, offnungszeiten: null,
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
    setEditBeschreibung(profile.beschreibung ?? "");
    setEditWebsite(profile.website ?? "");
    setEditAdresse(profile.adresse ?? "");
    setEditCity(profile.city ?? "");
    setEditTelefon(profile.telefon ?? "");
    setEditEmail(profile.email ?? "");
    setEditHours(profile.offnungszeiten ?? "");
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
        beschreibung:     editBeschreibung.trim() || null,
        website:          editWebsite.trim() || null,
        adresse:          editAdresse.trim() || null,
        city:             editCity.trim() || null,
        telefon:          editTelefon.trim() || null,
        email:            editEmail.trim() || null,
        offnungszeiten:   editHours.trim() || null,
        gegruendet_seit:  editGegruendet ? parseInt(editGegruendet) : null,
        zertifizierungen: editZertif.trim() || null,
      };
      await supabase.from("shelter_profiles").upsert(updates);
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
      setEditMode(false);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Speichern fehlgeschlagen.");
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
      Alert.alert("Fehler", e.message ?? "Upload fehlgeschlagen.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Abmelden", style: "destructive",
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
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 15 }}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "700", color: Colors.TEXT }}>Profil bearbeiten</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.PRIMARY} size="small" />
              : <Text style={{ color: Colors.PRIMARY, fontSize: 15, fontWeight: "700" }}>Speichern</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>
          {[
            { label: "Name des Tierheims", value: editOrgName, setter: setEditOrgName, placeholder: "z.B. Tierheim München" },
            { label: "Stadt", value: editCity, setter: setEditCity, placeholder: "z.B. München" },
            { label: "Adresse", value: editAdresse, setter: setEditAdresse, placeholder: "Musterstraße 1, 80331 München" },
            { label: "Telefon", value: editTelefon, setter: setEditTelefon, placeholder: "+49 89 123456" },
            { label: "E-Mail", value: editEmail, setter: setEditEmail, placeholder: "info@mein-tierheim.de" },
            { label: "Website", value: editWebsite, setter: setEditWebsite, placeholder: "www.mein-tierheim.de" },
            { label: "Öffnungszeiten", value: editHours, setter: setEditHours, placeholder: "Mo–Fr 9–18 Uhr, Sa 10–15 Uhr" },
            { label: "Gegründet seit (Jahr)", value: editGegruendet, setter: setEditGegruendet, placeholder: "z.B. 2005" },
            { label: "Zertifizierungen / Verband (optional)", value: editZertif, setter: setEditZertif, placeholder: "z.B. Tierschutzbund Bayern" },
          ].map(({ label, value, setter, placeholder }) => (
            <View key={label} style={{ marginBottom: 4 }}>
              <Text style={fieldLabel}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={Colors.TEXT_MUTED}
                keyboardType={label === "Gegründet seit (Jahr)" ? "numeric" : "default"}
                style={inputStyle}
              />
            </View>
          ))}

          <Text style={fieldLabel}>Beschreibung</Text>
          <TextInput
            value={editBeschreibung}
            onChangeText={setEditBeschreibung}
            placeholder="Erzählt uns etwas über euer Tierheim…"
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline numberOfLines={4}
            style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader
        title="👤 Profil"
        showBack backLabel="Modi wechseln" onBack={() => router.replace("/")}
        rightElement={!isGuest ? (
          <TouchableOpacity
            onPress={startEdit}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Sizes.RADIUS_FULL, backgroundColor: "rgba(255,255,255,0.25)" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.WHITE }}>✏️ Bearbeiten</Text>
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
                <Text style={{ fontSize: 42 }}>🏠</Text>
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
            {profile?.org_name ?? "Mein Tierheim"}
          </Text>
          {profile?.city && (
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 4 }}>📍 {profile.city}</Text>
          )}
          <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: "#FFF0F3", borderRadius: Sizes.RADIUS_FULL }}>
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>🏠 Tierheim</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 16, alignItems: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.PRIMARY }}>{hundeCount}</Text>
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2, textAlign: "center" }}>Hunde verfügbar</Text>
          </View>
          {profile?.gegruendet_seit && (
            <View style={{ flex: 1, backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 16, alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.PRIMARY }}>{profile.gegruendet_seit}</Text>
              <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2, textAlign: "center" }}>Gegründet</Text>
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
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Kontakt & Infos</Text>
          </View>

          {profile?.telefon && (
            <InfoRow icon="📞" label="Telefon" value={profile.telefon}
              onPress={() => Linking.openURL(`tel:${profile.telefon}`)} />
          )}
          {profile?.email && (
            <InfoRow icon="✉️" label="E-Mail" value={profile.email}
              onPress={() => Linking.openURL(`mailto:${profile.email}`)} />
          )}
          {profile?.website && (
            <InfoRow icon="🌐" label="Website" value={profile.website}
              onPress={() => {
                const url = (profile.website ?? "").startsWith("http") ? profile.website! : `https://${profile.website}`;
                Linking.openURL(url);
              }} />
          )}
          {profile?.adresse && (
            <InfoRow icon="📍" label="Adresse" value={profile.adresse}
              onPress={() => Linking.openURL(`maps:?q=${encodeURIComponent(profile.adresse!)}`)} />
          )}
          {profile?.offnungszeiten && (
            <InfoRow icon="🕐" label="Öffnungszeiten" value={profile.offnungszeiten} />
          )}

          {!isGuest && !profile?.telefon && !profile?.email && !profile?.website && (
            <TouchableOpacity
              onPress={startEdit}
              style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER, gap: 10 }}
            >
              <Text style={{ fontSize: 18 }}>✏️</Text>
              <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>Kontaktdaten hinzufügen…</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout / Login */}
        {!isGuest ? (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ height: Sizes.BUTTON_HEIGHT, borderWidth: 1.5, borderColor: Colors.ERROR, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>Abmelden</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{ height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "700" }}>Jetzt anmelden 🔑</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
