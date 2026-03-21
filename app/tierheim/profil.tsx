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

type ShelterProfile = {
  id: string;
  org_name: string | null;
  beschreibung: string | null;
  website: string | null;
  adresse: string | null;
  telefon: string | null;
  logo_url: string | null;
};

const DEMO_PROFILE: ShelterProfile = {
  id: "demo",
  org_name: "Demo-Tierheim",
  beschreibung: "Wir vermitteln glückliche Hunde in liebevolle Zuhause.",
  website: "www.demo-tierheim.de",
  adresse: "Musterstraße 1, 80331 München",
  telefon: "+49 89 123456",
  logo_url: null,
};

const DEMO_HOURS = "Mo–Fr 9–18 Uhr, Sa 10–15 Uhr";

export default function TierheimProfilScreen() {
  const [profile, setProfile]         = useState<ShelterProfile | null>(null);
  const [offnungszeiten, setOffnungszeiten] = useState<string>(DEMO_HOURS);
  const [loading, setLoading]         = useState(true);
  const [isGuest, setIsGuest]         = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [saving, setSaving]           = useState(false);

  // Edit fields
  const [editOrgName, setEditOrgName]       = useState("");
  const [editBeschreibung, setEditBeschreibung] = useState("");
  const [editWebsite, setEditWebsite]       = useState("");
  const [editAdresse, setEditAdresse]       = useState("");
  const [editTelefon, setEditTelefon]       = useState("");
  const [editHours, setEditHours]           = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setProfile(DEMO_PROFILE);
        setOffnungszeiten(DEMO_HOURS);
        return;
      }

      setIsGuest(false);

      const { data } = await supabase
        .from("shelter_profiles")
        .select("id, org_name, beschreibung, website, adresse, telefon, logo_url")
        .eq("id", user.id)
        .single();

      const p: ShelterProfile = data ?? {
        id: user.id,
        org_name: null,
        beschreibung: null,
        website: null,
        adresse: null,
        telefon: null,
        logo_url: null,
      };

      setProfile(p);
      setOffnungszeiten("");
    } catch (e) {
      console.error("TierheimProfilScreen.loadProfile", e);
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
    setEditTelefon(profile.telefon ?? "");
    setEditHours(offnungszeiten);
    setEditMode(true);
  };

  const handleSave = async () => {
    if (isGuest || !profile) return;
    setSaving(true);
    try {
      await supabase
        .from("shelter_profiles")
        .upsert({
          id: profile.id,
          org_name: editOrgName.trim() || null,
          beschreibung: editBeschreibung.trim() || null,
          website: editWebsite.trim() || null,
          adresse: editAdresse.trim() || null,
          telefon: editTelefon.trim() || null,
        });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              org_name: editOrgName.trim() || null,
              beschreibung: editBeschreibung.trim() || null,
              website: editWebsite.trim() || null,
              adresse: editAdresse.trim() || null,
              telefon: editTelefon.trim() || null,
            }
          : prev
      );
      setOffnungszeiten(editHours);
      setEditMode(false);
    } catch (e: any) {
      Alert.alert("Fehler", e.message ?? "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Abmelden", style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            router.replace("/auth/login");
          } catch (e) {
            console.error("handleLogout error", e);
          }
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
            { label: "Website", value: editWebsite, setter: setEditWebsite, placeholder: "www.mein-tierheim.de" },
            { label: "Telefon", value: editTelefon, setter: setEditTelefon, placeholder: "+49 89 123456" },
            { label: "Adresse", value: editAdresse, setter: setEditAdresse, placeholder: "Musterstraße 1, 80331 München" },
            { label: "Öffnungszeiten", value: editHours, setter: setEditHours, placeholder: "Mo–Fr 9–18 Uhr" },
          ].map(({ label, value, setter, placeholder }) => (
            <View key={label} style={{ marginBottom: 18 }}>
              <Text style={fieldLabel}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={Colors.TEXT_MUTED}
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
            multiline
            numberOfLines={4}
            style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
      }}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>‹</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi wechseln</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>👤 Profil</Text>
        {!isGuest && (
          <TouchableOpacity
            onPress={startEdit}
            style={{
              paddingHorizontal: 14, paddingVertical: 7,
              borderRadius: Sizes.RADIUS_FULL, borderWidth: 1.5, borderColor: Colors.BORDER,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.TEXT }}>✏️ Bearbeiten</Text>
          </TouchableOpacity>
        )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 40 }}>


        {/* Logo + Name */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          {profile?.logo_url ? (
            <Image
              source={{ uri: profile.logo_url }}
              style={{
                width: 100, height: 100, borderRadius: 50,
                borderWidth: 3, borderColor: Colors.PRIMARY, marginBottom: 14,
              }}
            />
          ) : (
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: Colors.SURFACE,
              alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: Colors.BORDER, marginBottom: 14,
            }}>
              <Text style={{ fontSize: 42 }}>🏠</Text>
            </View>
          )}
          <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.TEXT, textAlign: "center" }}>
            {profile?.org_name ?? "Mein Tierheim"}
          </Text>
          <View style={{
            marginTop: 6, paddingHorizontal: 14, paddingVertical: 4,
            backgroundColor: "#FFF0F3", borderRadius: Sizes.RADIUS_FULL,
          }}>
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>
              🏠 Tierheim
            </Text>
          </View>
        </View>

        {/* Description */}
        {profile?.beschreibung && (
          <View style={{ marginBottom: 20, padding: 16, backgroundColor: Colors.SURFACE, borderRadius: 16 }}>
            <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 24 }}>
              {profile.beschreibung}
            </Text>
          </View>
        )}

        {/* Contact Info */}
        <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.BORDER, marginBottom: 20 }}>
          <View style={{ padding: 14, backgroundColor: Colors.SURFACE }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
              Kontakt & Infos
            </Text>
          </View>

          {profile?.telefon && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${profile.telefon}`)}
              style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER }}
            >
              <Text style={{ fontSize: 20, marginRight: 14 }}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>Telefon</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.PRIMARY, marginTop: 1 }}>
                  {profile.telefon}
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED }}>›</Text>
            </TouchableOpacity>
          )}

          {profile?.website && (
            <TouchableOpacity
              onPress={() => {
                const url = (profile.website ?? "").startsWith("http")
                  ? profile.website!
                  : `https://${profile.website}`;
                Linking.openURL(url);
              }}
              style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER }}
            >
              <Text style={{ fontSize: 20, marginRight: 14 }}>🌐</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>Website</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.PRIMARY, marginTop: 1 }} numberOfLines={1}>
                  {profile.website}
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED }}>›</Text>
            </TouchableOpacity>
          )}

          {profile?.adresse && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`maps:?q=${encodeURIComponent(profile.adresse!)}`)}
              style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER }}
            >
              <Text style={{ fontSize: 20, marginRight: 14 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>Adresse</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.TEXT, marginTop: 1 }}>
                  {profile.adresse}
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED }}>›</Text>
            </TouchableOpacity>
          )}

          {offnungszeiten ? (
            <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER }}>
              <Text style={{ fontSize: 20, marginRight: 14 }}>🕐</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>Öffnungszeiten</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.TEXT, marginTop: 1 }}>
                  {offnungszeiten}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={startEdit}
              style={{ flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: Colors.BORDER }}
            >
              <Text style={{ fontSize: 20, marginRight: 14 }}>🕐</Text>
              <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, fontStyle: "italic" }}>
                Öffnungszeiten hinzufügen…
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Placeholder fields when empty */}
        {!isGuest && (!profile?.telefon || !profile?.website || !profile?.adresse) && (
          <TouchableOpacity
            onPress={startEdit}
            style={{
              marginBottom: 20, padding: 14, backgroundColor: Colors.SURFACE,
              borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.BORDER,
              flexDirection: "row", alignItems: "center", gap: 10,
            }}
          >
            <Text style={{ fontSize: 18 }}>✏️</Text>
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>
              Kontaktdaten hinzufügen (Website, Telefon, Adresse…)
            </Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        {!isGuest && (
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              height: Sizes.BUTTON_HEIGHT, borderWidth: 1.5,
              borderColor: Colors.ERROR, borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
              Abmelden
            </Text>
          </TouchableOpacity>
        )}

        {isGuest && (
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "700" }}>
              Jetzt anmelden 🔑
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

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
};
