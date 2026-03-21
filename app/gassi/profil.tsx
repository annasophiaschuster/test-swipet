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

type TierhalterProfile = {
  id: string;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  alter_jahre: number | null;
  geschlecht: string | null;
  bio: string | null;
  aktivitaetslevel: string | null;
  treffpunkt: string | null;
};

type MyDog = {
  id: string;
  name: string;
  rasse: string | null;
  foto_url: string | null;
  modus: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_AMIR_AVATAR =
  "https://rdkxfctjdwsyvzbzsxsd.supabase.co/storage/v1/object/public/avatars/demo/amir.png";

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
const TREFFPUNKT_OPTIONS = [
  { key: "park", label: "🌳 Park" },
  { key: "wald", label: "🌲 Wald" },
  { key: "egal", label: "🤷 Egal" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
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
  options, value, onChange, color = Colors.SECONDARY,
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
          style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.SECONDARY, marginBottom: 12 }}
        />
        <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>Amir</Text>
        <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: Colors.SECONDARY + "18", borderRadius: Sizes.RADIUS_FULL }}>
          <Text style={{ color: Colors.SECONDARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>Demo-User</Text>
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
        style={{ height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>Echtes Konto erstellen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiProfilScreen() {
  const [profile, setProfile]             = useState<TierhalterProfile | null>(null);
  const [myDogs, setMyDogs]               = useState<MyDog[]>([]);
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
  const [editAktiv, setEditAktiv]         = useState<string | null>(null);
  const [editTreffpunkt, setEditTreffpunkt] = useState<string | null>(null);
  const [editBio, setEditBio]             = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsGuest(true); setLoading(false); return; }
      setIsGuest(false);

      const { data: p } = await supabase
        .from("profiles")
        .select("id, name, city, avatar_url, alter_jahre, geschlecht, bio, aktivitaetslevel, treffpunkt")
        .eq("id", user.id)
        .single();

      setProfile({
        id: user.id,
        name: p?.name ?? null,
        city: p?.city ?? null,
        avatar_url: p?.avatar_url ?? null,
        alter_jahre: p?.alter_jahre ?? null,
        geschlecht: p?.geschlecht ?? null,
        bio: p?.bio ?? null,
        aktivitaetslevel: p?.aktivitaetslevel ?? null,
        treffpunkt: p?.treffpunkt ?? null,
      });

      // Load my dogs
      const { data: dogs } = await supabase
        .from("owner_pets")
        .select("id, name, rasse, foto_url, modus")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      setMyDogs((dogs ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        rasse: d.rasse ?? null,
        foto_url: d.foto_url ?? null,
        modus: d.modus ?? "gassidate",
      })));
    } catch (e) {
      console.error("GassiProfil.loadProfile", e);
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
    setEditAktiv(profile.aktivitaetslevel);
    setEditTreffpunkt(profile.treffpunkt);
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
        alter_jahre: editAlter ? parseInt(editAlter) : null,
        geschlecht: editGeschlecht,
        aktivitaetslevel: editAktiv,
        treffpunkt: editTreffpunkt,
        bio: editBio.trim() || null,
      }).eq("id", profile.id);

      setProfile((prev) => prev ? {
        ...prev,
        name: editName.trim() || null,
        city: editCity.trim() || null,
        alter_jahre: editAlter ? parseInt(editAlter) : null,
        geschlecht: editGeschlecht,
        aktivitaetslevel: editAktiv,
        treffpunkt: editTreffpunkt,
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
        <ActivityIndicator color={Colors.SECONDARY} />
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
              ? <ActivityIndicator color={Colors.SECONDARY} size="small" />
              : <Text style={{ color: Colors.SECONDARY, fontSize: 15, fontWeight: "700" }}>Speichern</Text>
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

          <FieldLabel>Stadt / Stadtteil</FieldLabel>
          <TextInput value={editCity} onChangeText={setEditCity} placeholder="z.B. München, Schwabing" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

          <FieldLabel>Aktivitätslevel</FieldLabel>
          <PillSelect options={AKTIV_OPTIONS} value={editAktiv} onChange={setEditAktiv} />

          <FieldLabel>Bevorzugter Treffpunkt</FieldLabel>
          <PillSelect options={TREFFPUNKT_OPTIONS} value={editTreffpunkt} onChange={setEditTreffpunkt} />

          <FieldLabel>Kurze Bio</FieldLabel>
          <TextInput
            value={editBio} onChangeText={setEditBio}
            placeholder="Erzähl etwas über dich und deinen Hund…"
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline numberOfLines={4}
            style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────────────────

  const AKTIV_LABEL: Record<string, string> = { ruhig: "🛋 Ruhig", mittel: "🚶 Mittel", sportlich: "🏃 Sportlich" };
  const TREFF_LABEL: Record<string, string> = { park: "🌳 Park", wald: "🌲 Wald", egal: "🤷 Egal" };

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
              <Image source={{ uri: profile.avatar_url }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.SECONDARY }} />
            ) : (
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.SECONDARY, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 36 }}>🐾</Text>
              </View>
            )}
            <View style={{
              position: "absolute", bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: uploadingAvatar ? Colors.TEXT_MUTED : Colors.SECONDARY,
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
          <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: Colors.SECONDARY + "18", borderRadius: Sizes.RADIUS_FULL }}>
            <Text style={{ color: Colors.SECONDARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>🐾 Tierhalter</Text>
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
          {profile?.city && <InfoRow icon="📍" label="Stadt / Stadtteil" value={profile.city} />}
          {profile?.aktivitaetslevel && <InfoRow icon="🏃" label="Aktivitätslevel" value={AKTIV_LABEL[profile.aktivitaetslevel] ?? profile.aktivitaetslevel} />}
          {profile?.treffpunkt && <InfoRow icon="🗺" label="Bevorzugter Treffpunkt" value={TREFF_LABEL[profile.treffpunkt] ?? profile.treffpunkt} />}
          {!profile?.city && (
            <TouchableOpacity onPress={startEdit} style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, fontStyle: "italic" }}>Profil vervollständigen…</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meine Hunde */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT }}>🐕 Meine Hunde</Text>
            <TouchableOpacity onPress={() => router.push("/gassi/meine-hunde")}>
              <Text style={{ fontSize: 13, color: Colors.SECONDARY, fontWeight: "600" }}>Alle →</Text>
            </TouchableOpacity>
          </View>

          {myDogs.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push("/auth/onboarding/tierhalter")}
              style={{
                height: 52, borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
                borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center",
                flexDirection: "row", gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, color: Colors.SECONDARY }}>+</Text>
              <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>Ersten Hund registrieren</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              {myDogs.map((dog) => (
                <View key={dog.id} style={{
                  marginHorizontal: 4, alignItems: "center",
                  backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 12, width: 90,
                }}>
                  {dog.foto_url ? (
                    <Image source={{ uri: dog.foto_url }} style={{ width: 52, height: 52, borderRadius: 26, marginBottom: 6 }} />
                  ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.SECONDARY + "20", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                      <Text style={{ fontSize: 24 }}>🐶</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.TEXT, textAlign: "center" }} numberOfLines={1}>{dog.name}</Text>
                  <View style={{
                    marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
                    backgroundColor: dog.modus === "gassidate" ? Colors.SECONDARY + "22" : "#F3EDFF",
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: "700", color: dog.modus === "gassidate" ? Colors.SECONDARY : "#9B59B6" }}>
                      {dog.modus === "gassidate" ? "Gassi-Date" : "Deck-Date"}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => router.push("/auth/onboarding/tierhalter")}
                style={{
                  marginHorizontal: 4, alignItems: "center", justifyContent: "center",
                  borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
                  borderColor: Colors.BORDER, width: 90, height: 110,
                }}
              >
                <Text style={{ fontSize: 22, color: Colors.SECONDARY }}>+</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{ height: Sizes.BUTTON_HEIGHT, borderWidth: 1.5, borderColor: Colors.ERROR, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center", marginTop: 8 }}
        >
          <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
