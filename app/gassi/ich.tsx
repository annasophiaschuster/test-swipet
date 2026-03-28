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
import { useLanguage } from "../../contexts/LanguageContext";

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
  bevorzugter_treffpunkt: string | null;
  verfuegbarkeit: string[] | null;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingVertical: 11, paddingHorizontal: 14,
      borderTopWidth: 1, borderTopColor: Colors.BORDER,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.TEXT, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiProfilScreen() {
  const { t } = useLanguage();
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
  const [editVerfuegbarkeit, setEditVerfuegbarkeit] = useState<string[] | null>(null);
  const [editBio, setEditBio]             = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        setProfile({
          id: "demo",
          name: "Amir",
          city: "Düsseldorf",
          avatar_url: DEMO_AMIR_AVATAR,
          alter_jahre: 29,
          geschlecht: "männlich",
          bio: "Ich bin Amir, 29, aus Düsseldorf. Ich liebe lange Spaziergänge und suche einen Gassi-Partner für meinen Hund.",
          aktivitaetslevel: "mittel",
          bevorzugter_treffpunkt: "park",
          verfuegbarkeit: ["morgens", "abends"],
        });
        setMyDogs([{ id: "demo-zeus", name: "Zeus", rasse: "Zwergpudel", foto_url: null, modus: "gassidate" }]);
        setLoading(false);
        return;
      }
      setIsGuest(false);

      const { data: p } = await supabase
        .from("profiles")
        .select("id, name, city, avatar_url, alter_jahre, geschlecht, bio, aktivitaetslevel, bevorzugter_treffpunkt, verfuegbarkeit")
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
        bevorzugter_treffpunkt: p?.bevorzugter_treffpunkt ?? null,
        verfuegbarkeit: p?.verfuegbarkeit ?? null,
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
    setEditTreffpunkt(profile.bevorzugter_treffpunkt);
    setEditVerfuegbarkeit(profile.verfuegbarkeit);
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
        bevorzugter_treffpunkt: editTreffpunkt,
        verfuegbarkeit: editVerfuegbarkeit,
        bio: editBio.trim() || null,
      }).eq("id", profile.id);

      setProfile((prev) => prev ? {
        ...prev,
        name: editName.trim() || null,
        city: editCity.trim() || null,
        alter_jahre: editAlter ? parseInt(editAlter) : null,
        geschlecht: editGeschlecht,
        aktivitaetslevel: editAktiv,
        bevorzugter_treffpunkt: editTreffpunkt,
        verfuegbarkeit: editVerfuegbarkeit,
        bio: editBio.trim() || null,
      } : prev);
      setEditMode(false);
    } catch (e: any) {
      Alert.alert(t.gassi_profil_logout_title, e.message ?? t.gassi_profil_save_failed);
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
      Alert.alert(t.gassi_profil_logout_title, e.message ?? t.gassi_profil_upload_failed);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t.gassi_profil_logout_title, t.profil_sign_out_confirm, [
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
        <ActivityIndicator color={Colors.SECONDARY} />
      </View>
    );
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────────

  if (editMode) {
    const GESCHLECHT_OPTIONS = [
      { key: "männlich", label: t.gassi_profil_gender_male },
      { key: "weiblich", label: t.gassi_profil_gender_female },
      { key: "divers", label: t.gassi_profil_gender_diverse },
    ];
    const AKTIV_OPTIONS = [
      { key: "ruhig", label: t.gassi_profil_activity_calm },
      { key: "mittel", label: t.gassi_profil_activity_medium },
      { key: "sportlich", label: t.gassi_profil_activity_athletic },
    ];
    const TREFFPUNKT_OPTIONS = [
      { key: "park", label: t.gassi_profil_meeting_park },
      { key: "wald", label: t.gassi_profil_meeting_forest },
      { key: "egal", label: t.gassi_profil_meeting_any },
    ];
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
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 15 }}>{t.profil_cancel}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "700", color: Colors.TEXT }}>{t.gassi_profil_edit_title}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.SECONDARY} size="small" />
              : <Text style={{ color: Colors.SECONDARY, fontSize: 15, fontWeight: "700" }}>{t.gassi_profil_save}</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>
          <FieldLabel>{t.gassi_profil_label_name}</FieldLabel>
          <TextInput value={editName} onChangeText={setEditName} placeholder={t.gassi_profil_placeholder_name} placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

          <FieldLabel>{t.gassi_profil_label_age}</FieldLabel>
          <TextInput value={editAlter} onChangeText={setEditAlter} placeholder={t.gassi_profil_placeholder_age} keyboardType="numeric" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

          <FieldLabel>{t.gassi_profil_label_gender}</FieldLabel>
          <PillSelect options={GESCHLECHT_OPTIONS} value={editGeschlecht} onChange={setEditGeschlecht} />

          <FieldLabel>{t.gassi_profil_label_city}</FieldLabel>
          <TextInput value={editCity} onChangeText={setEditCity} placeholder={t.gassi_profil_placeholder_city} placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

          <FieldLabel>{t.gassi_profil_label_activity}</FieldLabel>
          <PillSelect options={AKTIV_OPTIONS} value={editAktiv} onChange={setEditAktiv} />

          <FieldLabel>{t.gassi_profil_label_meeting}</FieldLabel>
          <PillSelect options={TREFFPUNKT_OPTIONS} value={editTreffpunkt} onChange={setEditTreffpunkt} />

          <FieldLabel>{t.gassi_profil_label_bio}</FieldLabel>
          <TextInput
            value={editBio} onChangeText={setEditBio}
            placeholder={t.gassi_profil_placeholder_bio}
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline numberOfLines={4}
            style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────────────────

  const AKTIV_LABEL: Record<string, string> = {
    ruhig: t.gassi_profil_activity_calm,
    mittel: t.gassi_profil_activity_medium,
    sportlich: t.gassi_profil_activity_athletic,
  };
  const TREFF_LABEL: Record<string, string> = {
    park: t.gassi_profil_meeting_park,
    wald: t.gassi_profil_meeting_forest,
    egal: t.gassi_profil_meeting_any,
  };


  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader
        title="👤 Profil"
        showBack backLabel={t.comp_switch_modes} onBack={() => router.replace("/")}
        rightElement={!isGuest ? (
          <TouchableOpacity
            onPress={startEdit}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Sizes.RADIUS_FULL, backgroundColor: "rgba(255,255,255,0.25)" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.WHITE }}>✏️ {t.gassi_profil_edit_title}</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 40 }}>
        {/* Avatar */}
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 32 }}>
          <TouchableOpacity onPress={isGuest ? undefined : handleAvatarUpload} disabled={uploadingAvatar || isGuest} style={{ marginBottom: 12 }}>
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
            {profile?.name ?? t.profil_no_name}
            {profile?.alter_jahre ? `, ${profile.alter_jahre}` : ""}
          </Text>
          {profile?.geschlecht && (
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
              {profile.geschlecht === "männlich" ? t.gassi_profil_gender_male : profile.geschlecht === "weiblich" ? t.gassi_profil_gender_female : t.gassi_profil_gender_diverse}
            </Text>
          )}
          <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: Colors.SECONDARY + "18", borderRadius: Sizes.RADIUS_FULL }}>
            <Text style={{ color: Colors.SECONDARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>{t.gassi_profil_role}</Text>
          </View>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_XS, marginTop: 6 }}>{t.profil_tap_to_change}</Text>
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
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{t.gassi_profil_section_my_profile}</Text>
          </View>
          {profile?.city && <InfoRow label={t.gassi_profil_label_city} value={profile.city} />}
          {profile?.aktivitaetslevel && <InfoRow label={t.gassi_profil_label_activity} value={AKTIV_LABEL[profile.aktivitaetslevel] ?? profile.aktivitaetslevel} />}
          {profile?.bevorzugter_treffpunkt && <InfoRow label={t.gassi_profil_label_meeting} value={TREFF_LABEL[profile.bevorzugter_treffpunkt] ?? profile.bevorzugter_treffpunkt} />}
          {profile?.verfuegbarkeit && profile.verfuegbarkeit.length > 0 && <InfoRow label={t.gassi_profil_label_availability ?? "Verfügbarkeit"} value={profile.verfuegbarkeit.join(", ")} />}
          {!profile?.city && (
            <TouchableOpacity onPress={startEdit} style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, fontStyle: "italic" }}>{t.gassi_profil_complete}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meine Hunde */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT }}>{t.gassi_my_dogs}</Text>
            <TouchableOpacity onPress={() => router.push("/gassi/meine-hunde")}>
              <Text style={{ fontSize: 13, color: Colors.SECONDARY, fontWeight: "600" }}>{t.gassi_profil_all_dogs}</Text>
            </TouchableOpacity>
          </View>

          {myDogs.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push("/gassi/hund-anlegen")}
              style={{
                height: 52, borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
                borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center",
                flexDirection: "row", gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, color: Colors.SECONDARY }}>+</Text>
              <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>{t.gassi_profil_add_first_dog}</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              {myDogs.map((dog) => (
                <TouchableOpacity
                  key={dog.id}
                  onPress={() => !isGuest && router.push(`/gassi/hund-bearbeiten/${dog.id}`)}
                  style={{
                    marginHorizontal: 4, alignItems: "center",
                    backgroundColor: Colors.SURFACE, borderRadius: 16, padding: 12, width: 100,
                  }}
                >
                  {dog.foto_url ? (
                    <Image source={{ uri: dog.foto_url }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 6 }} />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.SECONDARY + "20", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                      <Text style={{ fontSize: 28 }}>🐶</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.TEXT, textAlign: "center" }} numberOfLines={1}>{dog.name}</Text>
                  {dog.rasse && (
                    <Text style={{ fontSize: 10, color: Colors.TEXT_MUTED, textAlign: "center", marginTop: 2 }} numberOfLines={1}>{dog.rasse}</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => router.push("/gassi/hund-anlegen")}
                style={{
                  marginHorizontal: 4, alignItems: "center", justifyContent: "center",
                  borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
                  borderColor: Colors.BORDER, width: 100, height: 120,
                }}
              >
                <Text style={{ fontSize: 22, color: Colors.SECONDARY }}>+</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Logout / Login */}
        {isGuest ? (
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{ height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center", marginTop: 8 }}
          >
            <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "700" }}>{t.gassi_profil_create_account}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ height: Sizes.BUTTON_HEIGHT, borderWidth: 1.5, borderColor: Colors.ERROR, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center", marginTop: 8 }}
          >
            <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>{t.profil_sign_out}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
