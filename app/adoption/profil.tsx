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
import GradientHeader from "../../components/GradientHeader";
import { pickSingleImage, uploadImageToStorage } from "../../lib/storage";

type Profile = {
  id: string;
  name: string | null;
  role: "adoptant" | "tierhalter" | "tierheim";
  plz: string | null;
  city: string | null;
  avatar_url: string | null;
};

const ROLE_LABELS = {
  adoptant:   { label: "Tiersucher",  icon: "❤️" },
  tierhalter: { label: "Tierhalter",  icon: "🐾" },
  tierheim:   { label: "Tierheim",    icon: "🏠" },
};

function GuestState() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>👤</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        Nicht angemeldet
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
        Melde dich an, um dein Profil zu verwalten und deine Matches zu sehen.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/auth/login")}
        style={{
          height: Sizes.BUTTON_HEIGHT, paddingHorizontal: 32,
          backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
          Jetzt anmelden
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdoptionProfilScreen() {
  const [profile, setProfile]                     = useState<Profile | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [isGuest, setIsGuest]                     = useState(false);
  const [uploadingAvatar, setUploadingAvatar]     = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        return;
      }
      setIsGuest(false);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    } catch (e) {
      console.error("AdoptionProfil.loadProfile", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const asset = await pickSingleImage();
      if (!asset || !profile) return;

      setUploadingAvatar(true);
      const publicUrl = await uploadImageToStorage(
        "avatars",
        `${profile.id}.jpg`,
        asset.uri
      );

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
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
        text: "Abmelden",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            router.replace("/auth/login");
          } catch (e) {
            console.error("AdoptionProfil.handleLogout", e);
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

  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        <GradientHeader title="Mein Profil" />
        <GuestState />
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
          <TouchableOpacity
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
            style={{ position: "relative", marginBottom: 12 }}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.PRIMARY }}
              />
            ) : (
              <View style={{
                width: 90, height: 90, borderRadius: 45,
                backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 36 }}>{roleInfo?.icon ?? "👤"}</Text>
              </View>
            )}

            {/* Camera Badge */}
            <View style={{
              position: "absolute", bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: uploadingAvatar ? Colors.TEXT_MUTED : Colors.PRIMARY,
              alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: Colors.WHITE,
            }}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color={Colors.WHITE} />
                : <Text style={{ fontSize: 13 }}>📷</Text>
              }
            </View>
          </TouchableOpacity>

          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>
            {profile?.name ?? "Kein Name"}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
            Tippe auf das Bild um es zu ändern
          </Text>

          <View style={{
            marginTop: 8, paddingHorizontal: 14, paddingVertical: 4,
            backgroundColor: "#FFF0F3", borderRadius: Sizes.RADIUS_FULL,
          }}>
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>
              {roleInfo?.label}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={{
          backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_LG,
          padding: Sizes.SPACING_MD, marginBottom: 16,
        }}>
          <View style={{ paddingVertical: 10 }}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Standort</Text>
            <Text style={{ color: Colors.TEXT, fontWeight: "500", marginTop: 2 }}>
              {profile?.city ?? profile?.plz ?? "Nicht angegeben"}
            </Text>
          </View>
        </View>

        {/* Logout */}
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
