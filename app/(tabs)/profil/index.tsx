import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import GradientHeader from "../../../components/GradientHeader";

type Profile = {
  id: string;
  name: string | null;
  role: "adoptant" | "tierhalter" | "tierheim";
  plz: string | null;
  city: string | null;
};

const ROLE_LABELS = {
  adoptant: { label: "Tiersucher", icon: "❤️" },
  tierhalter: { label: "Tierhalter", icon: "🐾" },
  tierheim: { label: "Tierheim", icon: "🏠" },
};

export default function ProfilScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    } catch (e) {
      // ignore
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
        <ActivityIndicator color={Colors.PRIMARY} />
      </View>
    );
  }

  const roleInfo = profile ? ROLE_LABELS[profile.role] : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader title="Mein Profil" />

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>
        {/* Avatar + Name */}
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 32 }}>
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: Colors.PRIMARY,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 36 }}>{roleInfo?.icon ?? "👤"}</Text>
          </View>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>
            {profile?.name ?? "Kein Name"}
          </Text>
          <View
            style={{
              marginTop: 6,
              paddingHorizontal: 14,
              paddingVertical: 4,
              backgroundColor: "#FFF0F3",
              borderRadius: Sizes.RADIUS_FULL,
            }}
          >
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>
              {roleInfo?.label}
            </Text>
          </View>
        </View>

        {/* Info Karte */}
        <View
          style={{
            backgroundColor: Colors.SURFACE,
            borderRadius: Sizes.RADIUS_XL,
            padding: Sizes.SPACING_MD,
            marginBottom: 16,
          }}
        >
          {[
            { label: "Standort", value: profile?.city ?? profile?.plz ?? "Nicht angegeben" },
          ].map((item) => (
            <View key={item.label} style={{ paddingVertical: 10 }}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>{item.label}</Text>
              <Text style={{ color: Colors.TEXT, fontWeight: "500", marginTop: 2 }}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Coming soon */}
        <View
          style={{
            backgroundColor: Colors.SURFACE,
            borderRadius: Sizes.RADIUS_XL,
            padding: Sizes.SPACING_MD,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
            Profil bearbeiten kommt in Schritt 9 ✨
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={{
            height: Sizes.BUTTON_HEIGHT,
            borderWidth: 1.5,
            borderColor: Colors.ERROR,
            borderRadius: Sizes.RADIUS_FULL,
            alignItems: "center",
            justifyContent: "center",
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
