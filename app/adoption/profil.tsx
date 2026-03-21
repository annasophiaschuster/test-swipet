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
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AdoptantProfile = {
  id: string;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  // from adoptant_profiles
  alter_jahre: number | null;
  geschlecht: string | null;
  wohnsituation: string | null;
  erfahrung: string | null;
  kinder_im_haushalt: boolean | null;
  andere_tiere: boolean | null;
  aktivitaetslevel: string | null;
  arbeitszeit: string | null;
  bio: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_AMIR_AVATAR =
  "https://rdkxfctjdwsyvzbzsxsd.supabase.co/storage/v1/object/public/avatars/demo/amir.png";

const WOHNSITUATION_OPTIONS = [
  { key: "wohnung", label: "🏢 Wohnung" },
  { key: "haus", label: "🏠 Haus" },
  { key: "haus_mit_garten", label: "🌿 Haus mit Garten" },
];
const ERFAHRUNG_OPTIONS = [
  { key: "anfaenger", label: "🌱 Anfänger" },
  { key: "fortgeschritten", label: "⭐ Fortgeschritten" },
  { key: "profi", label: "🏆 Profi" },
];
const GESCHLECHT_OPTIONS = [
  { key: "männlich", label: "♂ Männlich" },
  { key: "weiblich", label: "♀ Weiblich" },
  { key: "divers", label: "⚧ Divers" },
];
const AKTIV_OPTIONS = [
  { key: "ruhig", label: "🛋 Ruhig" },
  { key: "mittel", label: "🚶 Mittel" },
  { key: "sportlich", label: "🏃 Sportlich" },
];
const ARBEITSZEIT_OPTIONS = [
  { key: "vollzeit", label: "💼 Vollzeit" },
  { key: "teilzeit", label: "⏰ Teilzeit" },
  { key: "homeoffice", label: "🏡 Homeoffice" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={{
      fontSize: 12, fontWeight: "700", color: Colors.TEXT_MUTED,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
    }}>
      {children}
    </Text>
  );
}

function PillSelect({
  options, value, onChange, color = Colors.PRIMARY,
}: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (k: string) => void;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onChange(o.key)}
          style={{
            paddingHorizontal: 14, paddingVertical: 9,
            borderRadius: Sizes.RADIUS_FULL, borderWidth: 1.5,
            borderColor: value === o.key ? color : Colors.BORDER,
            backgroundColor: value === o.key ? color + "15" : Colors.BACKGROUND,
          }}
        >
          <Text style={{
            fontSize: 13, fontWeight: "600",
            color: value === o.key ? color : Colors.TEXT_MUTED,
          }}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function BoolPill({
  value, onChange, color = Colors.PRIMARY,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
      {[{ v: true, l: "✅ Ja" }, { v: false, l: "✕ Nein" }].map(({ v, l }) => (
        <TouchableOpacity
          key={String(v)}
          onPress={() => onChange(v)}
          style={{
            flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
            alignItems: "center",
            borderColor: value === v ? color : Colors.BORDER,
            backgroundColor: value === v ? color + "15" : Colors.BACKGROUND,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: value === v ? color : Colors.TEXT_MUTED }}>
            {l}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingVertical: 11, borderTopWidth: 1, borderTopColor: Colors.BORDER,
    }}>
      <Text style={{ fontSize: 18, marginRight: 12 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.TEXT, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo Profile (guest mode)
// ─────────────────────────────────────────────────────────────────────────────

function DemoProfile() {
  return (
    <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>
      <View style={{ alignItems: "center", marginTop: 24, marginBottom: 32 }}>
        <Image
          source={{ uri: DEMO_AMIR_AVATAR }}
          style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.PRIMARY, marginBottom: 12 }}
        />
        <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>Amir</Text>
        <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: "#FFF0F3", borderRadius: Sizes.RADIUS_FULL }}>
          <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>Demo-User</Text>
        </View>
      </View>
      <View style={{ backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_LG, padding: Sizes.SPACING_MD, marginBottom: 16 }}>
        <View style={{ paddingVertical: 10 }}>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Standort</Text>
          <Text style={{ color: Colors.TEXT, fontWeight: "500", marginTop: 2 }}>Pforzheim</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => router.push("/auth/login")}
        style={{ height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>Echtes Konto erstellen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AdoptionProfilScreen() {
  const [profile, setProfile]             = useState<AdoptantProfile | null>(null);
  const [loading, setLoading]             = useState(true);
  const [isGuest, setIsGuest]             = useState(false);
  const [editMode, setEditMode]           = useState(false);
  const [saving, setSaving]               = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit state
  const [editName, setEditName]           = useState("");
  const [editCity, setEditCity]           = useState("");
  const [editAlter, setEditAlter]         = useState("");
  const [editGeschlecht, setEditGeschlecht] = useState<string | null>(null);
  const [editWohnsituation, setEditWohnsituation] = useState<string | null>(null);
  const [editErfahrung, setEditErfahrung] = useState<string | null>(null);
  const [editKinder, setEditKinder]       = useState<boolean | null>(null);
  const [editTiere, setEditTiere]         = useState<boolean | null>(null);
  const [editAktiv, setEditAktiv]         = useState<string | null>(null);
  const [editArbeitszeit, setEditArbeitszeit] = useState<string | null>(null);
  const [editBio, setEditBio]             = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); setLoading(false); return; }
      setIsGuest(false);

      const [{ data: p }, { data: ap }] = await Promise.all([
        supabase.from("profiles").select("id, name, city, avatar_url").eq("id", user.id).single(),
        supabase.from("adoptant_profiles")
          .select("alter_jahre, geschlecht, wohnsituation, erfahrung, kinder_im_haushalt, andere_tiere, aktivitaetslevel, arbeitszeit, bio")
          .eq("id", user.id).maybeSingle(),
      ]);

      setProfile({
        id: user.id,
        name: p?.name ?? null,
        city: p?.city ?? null,
        avatar_url: p?.avatar_url ?? null,
        alter_jahre: ap?.alter_jahre ?? null,
        geschlecht: ap?.geschlecht ?? null,
        wohnsituation: ap?.wohnsituation ?? null,
        erfahrung: ap?.erfahrung ?? null,
        kinder_im_haushalt: ap?.kinder_im_haushalt ?? null,
        andere_tiere: ap?.andere_tiere ?? null,
        aktivitaetslevel: ap?.aktivitaetslevel ?? null,
        arbeitszeit: ap?.arbeitszeit ?? null,
        bio: ap?.bio ?? null,
      });
    } catch (e) {
      console.error("AdoptionProfil.loadProfile", e);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!profile) return;
    setEditName(profile.name ?? "");
    setEditCity(profile.city ?? "");
    setEditAlter(profile.alter_jahre ? String(profile.alter_jahre) : "");
    setEditGeschlecht(profile.geschlecht);
    setEditWohnsituation(profile.wohnsituation);
    setEditErfahrung(profile.erfahrung);
    setEditKinder(profile.kinder_im_haushalt);
    setEditTiere(profile.andere_tiere);
    setEditAktiv(profile.aktivitaetslevel);
    setEditArbeitszeit(profile.arbeitszeit);
    setEditBio(profile.bio ?? "");
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({
        name: editName.trim() || null,
        city: editCity.trim() || null,
      }).eq("id", profile.id);

      await supabase.from("adoptant_profiles").upsert({
        id: profile.id,
        alter_jahre: editAlter ? parseInt(editAlter) : null,
        geschlecht: editGeschlecht,
        wohnsituation: editWohnsituation,
        erfahrung: editErfahrung,
        kinder_im_haushalt: editKinder,
        andere_tiere: editTiere,
        aktivitaetslevel: editAktiv,
        arbeitszeit: editArbeitszeit,
        bio: editBio.trim() || null,
      });

      setProfile((prev) => prev ? {
        ...prev,
        name: editName.trim() || null,
        city: editCity.trim() || null,
        alter_jahre: editAlter ? parseInt(editAlter) : null,
        geschlecht: editGeschlecht,
        wohnsituation: editWohnsituation,
        erfahrung: editErfahrung,
        kinder_im_haushalt: editKinder,
        andere_tiere: editTiere,
        aktivitaetslevel: editAktiv,
        arbeitszeit: editArbeitszeit,
        bio: editBio.trim() || null,
      } : prev);
      setEditMode(false);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!profile) return;
    try {
      const asset = await pickSingleImage();
      if (!asset) return;
      setUploadingAvatar(true);
      const url = await uploadImageToStorage("avatars", `${profile.id}.jpg`, asset.uri);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      setProfile((prev) => prev ? { ...prev, avatar_url: url } : prev);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Upload fehlgeschlagen.");
    } finally {
      setUploadingAvatar(false);
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

  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        <GradientHeader title="👤 Profil" showBack backLabel="Modi wechseln" onBack={() => router.replace("/")} />
        <DemoProfile />
      </View>
    );
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────────

  if (editMode) {
    const inputStyle = {
      borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
      color: Colors.TEXT, backgroundColor: Colors.BACKGROUND, marginBottom: 20,
    };
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
          <FieldLabel>Vorname *</FieldLabel>
          <TextInput value={editName} onChangeText={setEditName} placeholder="Dein Vorname" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

          <FieldLabel>Alter</FieldLabel>
          <TextInput value={editAlter} onChangeText={setEditAlter} placeholder="z.B. 28" keyboardType="numeric" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

          <FieldLabel>Geschlecht</FieldLabel>
          <PillSelect options={GESCHLECHT_OPTIONS} value={editGeschlecht} onChange={setEditGeschlecht} />

          <FieldLabel>Stadt</FieldLabel>
          <TextInput value={editCity} onChangeText={setEditCity} placeholder="z.B. München" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

          <FieldLabel>Wohnsituation</FieldLabel>
          <PillSelect options={WOHNSITUATION_OPTIONS} value={editWohnsituation} onChange={setEditWohnsituation} />

          <FieldLabel>Erfahrung mit Hunden</FieldLabel>
          <PillSelect options={ERFAHRUNG_OPTIONS} value={editErfahrung} onChange={setEditErfahrung} />

          <FieldLabel>Kinder im Haushalt</FieldLabel>
          <BoolPill value={editKinder} onChange={setEditKinder} />

          <FieldLabel>Andere Tiere</FieldLabel>
          <BoolPill value={editTiere} onChange={setEditTiere} />

          <FieldLabel>Aktivitätslevel</FieldLabel>
          <PillSelect options={AKTIV_OPTIONS} value={editAktiv} onChange={setEditAktiv} />

          <FieldLabel>Arbeitszeit</FieldLabel>
          <PillSelect options={ARBEITSZEIT_OPTIONS} value={editArbeitszeit} onChange={setEditArbeitszeit} />

          <FieldLabel>Kurze Bio</FieldLabel>
          <TextInput
            value={editBio} onChangeText={setEditBio}
            placeholder="Erzähl etwas über dich…"
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline numberOfLines={4}
            style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────────────────

  const WOHN_LABEL: Record<string, string> = { wohnung: "🏢 Wohnung", haus: "🏠 Haus", haus_mit_garten: "🌿 Haus mit Garten" };
  const ERF_LABEL: Record<string, string>  = { anfaenger: "🌱 Anfänger", fortgeschritten: "⭐ Fortgeschritten", profi: "🏆 Profi" };
  const AKTIV_LABEL: Record<string, string> = { ruhig: "🛋 Ruhig", mittel: "🚶 Mittel", sportlich: "🏃 Sportlich" };
  const ARBEIT_LABEL: Record<string, string> = { vollzeit: "💼 Vollzeit", teilzeit: "⏰ Teilzeit", homeoffice: "🏡 Homeoffice" };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader
        title="👤 Profil"
        showBack backLabel="Modi wechseln" onBack={() => router.replace("/")}
        rightElement={
          <TouchableOpacity
            onPress={startEdit}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Sizes.RADIUS_FULL, backgroundColor: "rgba(255,255,255,0.25)" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.WHITE }}>✏️ Bearbeiten</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 40 }}>
        {/* Avatar */}
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 32 }}>
          <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar} style={{ marginBottom: 12 }}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.PRIMARY }} />
            ) : (
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 36 }}>❤️</Text>
              </View>
            )}
            <View style={{
              position: "absolute", bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: uploadingAvatar ? Colors.TEXT_MUTED : Colors.PRIMARY,
              alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: Colors.WHITE,
            }}>
              {uploadingAvatar ? <ActivityIndicator size="small" color={Colors.WHITE} /> : <Text style={{ fontSize: 13 }}>📷</Text>}
            </View>
          </TouchableOpacity>

          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>
            {profile?.name ?? "Kein Name"}
            {profile?.alter_jahre ? `, ${profile.alter_jahre}` : ""}
          </Text>
          {profile?.geschlecht && (
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
              {profile.geschlecht === "männlich" ? "♂ Männlich" : profile.geschlecht === "weiblich" ? "♀ Weiblich" : "⚧ Divers"}
            </Text>
          )}
          <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: "#FFF0F3", borderRadius: Sizes.RADIUS_FULL }}>
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>❤️ Tiersucher</Text>
          </View>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_XS, marginTop: 6 }}>Tippe auf das Bild um es zu ändern</Text>
        </View>

        {/* Bio */}
        {profile?.bio && (
          <View style={{ marginBottom: 20, padding: 16, backgroundColor: Colors.SURFACE, borderRadius: 16 }}>
            <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 24, fontStyle: "italic" }}>{profile.bio}</Text>
          </View>
        )}

        {/* Info Card */}
        <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.BORDER, marginBottom: 20 }}>
          <View style={{ padding: 14, backgroundColor: Colors.SURFACE }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Mein Profil</Text>
          </View>
          {profile?.city && <InfoRow icon="📍" label="Stadt" value={profile.city} />}
          {profile?.wohnsituation && <InfoRow icon="🏠" label="Wohnsituation" value={WOHN_LABEL[profile.wohnsituation] ?? profile.wohnsituation} />}
          {profile?.erfahrung && <InfoRow icon="📚" label="Erfahrung mit Hunden" value={ERF_LABEL[profile.erfahrung] ?? profile.erfahrung} />}
          {profile?.aktivitaetslevel && <InfoRow icon="🏃" label="Aktivitätslevel" value={AKTIV_LABEL[profile.aktivitaetslevel] ?? profile.aktivitaetslevel} />}
          {profile?.arbeitszeit && <InfoRow icon="💼" label="Arbeitszeit" value={ARBEIT_LABEL[profile.arbeitszeit] ?? profile.arbeitszeit} />}
          {profile?.kinder_im_haushalt != null && <InfoRow icon="👦" label="Kinder im Haushalt" value={profile.kinder_im_haushalt ? "Ja" : "Nein"} />}
          {profile?.andere_tiere != null && <InfoRow icon="🐾" label="Andere Tiere" value={profile.andere_tiere ? "Ja" : "Nein"} />}
          {!profile?.city && !profile?.wohnsituation && (
            <TouchableOpacity
              onPress={startEdit}
              style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 10 }}
            >
              <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, fontStyle: "italic" }}>Profil vervollständigen…</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{ height: Sizes.BUTTON_HEIGHT, borderWidth: 1.5, borderColor: Colors.ERROR, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
