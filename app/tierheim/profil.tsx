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
  city: string | null;
  plz: string | null;
  avatar_url: string | null;
};

type ShelterProfile = {
  org_name: string | null;
};

export default function TierheimProfilScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shelterProfile, setShelterProfile] = useState<ShelterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

      setIsGuest(false);

      const [profileRes, shelterRes] = await Promise.all([
        supabase.from("profiles").select("id, name, city, plz, avatar_url").eq("id", user.id).single(),
        supabase.from("shelter_profiles").select("org_name").eq("id", user.id).single(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (shelterRes.data) setShelterProfile(shelterRes.data);
    } catch (e) {
      console.error("loadProfile error", e);
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
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
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

  // Guest state
  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        <GradientHeader title="🏠 Tierheim-Profil" />
        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, alignItems: "center" }}>
          <View
            style={{
              marginTop: 40,
              padding: 24,
              backgroundColor: Colors.SURFACE,
              borderRadius: Sizes.RADIUS_LG,
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text style={{ fontSize: 52, marginBottom: 16 }}>🏠</Text>
            <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, marginBottom: 8 }}>
              Demo-Ansicht
            </Text>
            <Text
              style={{
                color: Colors.TEXT_MUTED,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              Melde dich an, um dein Tierheim-Profil zu verwalten, Bilder hochzuladen und deine Hunde zu
              betreuen.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              style={{
                backgroundColor: Colors.PRIMARY,
                borderRadius: Sizes.RADIUS_FULL,
                height: Sizes.BUTTON_HEIGHT,
                paddingHorizontal: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
                Jetzt anmelden
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader title="🏠 Tierheim-Profil" />

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
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  borderWidth: 3,
                  borderColor: Colors.PRIMARY,
                }}
              />
            ) : (
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: Colors.PRIMARY,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 36 }}>🏠</Text>
              </View>
            )}

            {/* Camera badge */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: uploadingAvatar ? Colors.TEXT_MUTED : Colors.PRIMARY,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: Colors.WHITE,
              }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={Colors.WHITE} />
              ) : (
                <Text style={{ fontSize: 13 }}>📷</Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>
            {shelterProfile?.org_name ?? profile?.name ?? "Tierheim"}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
            Tippe auf das Bild um es zu ändern
          </Text>

          <View
            style={{
              marginTop: 8,
              paddingHorizontal: 14,
              paddingVertical: 4,
              backgroundColor: "#FFF0F3",
              borderRadius: Sizes.RADIUS_FULL,
            }}
          >
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>
              🏠 Tierheim
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View
          style={{
            backgroundColor: Colors.SURFACE,
            borderRadius: Sizes.RADIUS_LG,
            padding: Sizes.SPACING_MD,
            marginBottom: 16,
          }}
        >
          {shelterProfile?.org_name && (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.BORDER }}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Organisation</Text>
              <Text style={{ color: Colors.TEXT, fontWeight: "500", marginTop: 2 }}>
                {shelterProfile.org_name}
              </Text>
            </View>
          )}
          <View style={{ paddingVertical: 10 }}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Standort</Text>
            <Text style={{ color: Colors.TEXT, fontWeight: "500", marginTop: 2 }}>
              {profile?.city ?? profile?.plz ?? "Nicht angegeben"}
            </Text>
          </View>
        </View>

        {/* Quick links */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "700", color: Colors.TEXT, marginBottom: 10 }}
          >
            Verwaltung
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/shelter/pets/add")}
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
                backgroundColor: "#FFF0F3",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 20 }}>➕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: Colors.TEXT, fontSize: Sizes.FONT_MD }}>
                Hund hinzufügen
              </Text>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 1 }}>
                Neues Tier zur Adoption eintragen
              </Text>
            </View>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/tierheim/hunde")}
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
                backgroundColor: "#FFF0F3",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 20 }}>🐾</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: Colors.TEXT, fontSize: Sizes.FONT_MD }}>
                Alle Hunde
              </Text>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 1 }}>
                Übersicht und Status verwalten
              </Text>
            </View>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
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
