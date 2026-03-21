import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

type Profile = {
  id: string;
  name: string | null;
  role: "adoptant" | "tierhalter" | "tierheim";
  plz: string | null;
  city: string | null;
  avatar_url: string | null;
};

const ROLE_LABELS = {
  adoptant: { label: "Tiersucher", icon: "❤️" },
  tierhalter: { label: "Tierhalter", icon: "🐾" },
  tierheim: { label: "Tierheim", icon: "🏠" },
};

export default function GassiProfilScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    } catch (e) {
      console.error("loadProfile", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Abmelden",
        style: "destructive",
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
        <View
          style={{
            paddingTop: 56,
            paddingHorizontal: Sizes.SPACING_LG,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: Colors.BORDER,
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
          >
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>‹</Text>
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi wechseln</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>👤 Profil</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🔒</Text>
          <Text
            style={{
              fontSize: Sizes.FONT_XL,
              fontWeight: "700",
              color: Colors.TEXT,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Noch nicht angemeldet
          </Text>
          <Text
            style={{
              color: Colors.TEXT_MUTED,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            Melde dich an um dein Profil zu verwalten und Gassidate-Partner zu finden.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              paddingHorizontal: 32,
              backgroundColor: Colors.SECONDARY,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
              Jetzt anmelden
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const roleInfo = profile ? ROLE_LABELS[profile.role] : null;
  const isTierhalter = profile?.role === "tierhalter";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: Sizes.SPACING_LG,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: Colors.BORDER,
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>‹</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi wechseln</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>👤 Profil</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>
        {/* ── Avatar + Name ── */}
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 32 }}>
          <View style={{ position: "relative", marginBottom: 12 }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  borderWidth: 3,
                  borderColor: Colors.SECONDARY,
                }}
              />
            ) : (
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: Colors.SECONDARY,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 36 }}>{roleInfo?.icon ?? "👤"}</Text>
              </View>
            )}
          </View>

          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>
            {profile?.name ?? "Kein Name"}
          </Text>

          <View
            style={{
              marginTop: 8,
              paddingHorizontal: 14,
              paddingVertical: 4,
              backgroundColor: Colors.SECONDARY + "18",
              borderRadius: Sizes.RADIUS_FULL,
            }}
          >
            <Text style={{ color: Colors.SECONDARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>
              {roleInfo?.label}
            </Text>
          </View>
        </View>

        {/* ── Info Karte ── */}
        <View
          style={{
            backgroundColor: Colors.SURFACE,
            borderRadius: Sizes.RADIUS_LG,
            padding: Sizes.SPACING_MD,
            marginBottom: 16,
          }}
        >
          <View style={{ paddingVertical: 10 }}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Standort</Text>
            <Text style={{ color: Colors.TEXT, fontWeight: "500", marginTop: 2 }}>
              {profile?.city ?? profile?.plz ?? "Nicht angegeben"}
            </Text>
          </View>
        </View>

        {/* ── Meine Hunde (Tierhalter) ── */}
        {isTierhalter && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: Colors.TEXT,
                marginBottom: 10,
              }}
            >
              🐕 Meine Hunde
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/auth/onboarding/tierhalter")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.SURFACE,
                borderRadius: Sizes.RADIUS_LG,
                padding: Sizes.SPACING_MD,
                borderWidth: 1,
                borderColor: Colors.BORDER,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: Colors.SECONDARY + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Text style={{ fontSize: 20 }}>🐕</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontWeight: "700", color: Colors.TEXT, fontSize: Sizes.FONT_MD }}
                >
                  Hund registrieren
                </Text>
                <Text
                  style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 1 }}
                >
                  Neuen Hund anlegen oder bearbeiten
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/gassi/meine-hunde")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.SURFACE,
                borderRadius: Sizes.RADIUS_LG,
                padding: Sizes.SPACING_MD,
                borderWidth: 1,
                borderColor: Colors.BORDER,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: Colors.SECONDARY + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Text style={{ fontSize: 20 }}>📋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontWeight: "700", color: Colors.TEXT, fontSize: Sizes.FONT_MD }}
                >
                  Alle meine Hunde
                </Text>
                <Text
                  style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 1 }}
                >
                  Übersicht meiner registrierten Hunde
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Logout ── */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            height: Sizes.BUTTON_HEIGHT,
            borderWidth: 1.5,
            borderColor: Colors.ERROR,
            borderRadius: Sizes.RADIUS_FULL,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
            Abmelden
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
