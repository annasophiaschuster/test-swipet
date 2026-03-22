import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import GradientHeader from "../../../components/GradientHeader";
import { pickSingleImage, uploadImageToStorage } from "../../../lib/storage";
import { useLanguage } from "../../../contexts/LanguageContext";

type Profile = {
  id: string;
  name: string | null;
  role: "adoptant" | "tierhalter" | "tierheim";
  plz: string | null;
  city: string | null;
  avatar_url: string | null;
};

export default function ProfilScreen() {
  const { t } = useLanguage();
  const ROLE_LABELS = {
    adoptant:   { label: t.profil_role_adoptant,  icon: "❤️" },
    tierhalter: { label: t.profil_role_tierhalter, icon: "🐾" },
    tierheim:   { label: t.profil_role_tierheim,  icon: "🏠" },
  };
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => { loadProfile(); }, []);

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
    } catch (_) {
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
      Alert.alert(t.err_generic, e.message ?? t.profil_err_upload);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t.profil_sign_out, t.profil_sign_out_confirm, [
      { text: t.profil_cancel, style: "cancel" },
      {
        text: t.profil_sign_out,
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
  const canAddPets = profile?.role === "tierhalter" || profile?.role === "tierheim";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader title={t.profil_title} />

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>

        {/* ── Avatar + Name ── */}
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 32 }}>
          <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar} style={{ position: "relative", marginBottom: 12 }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.PRIMARY }}
              />
            ) : (
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 36 }}>{roleInfo?.icon ?? "👤"}</Text>
              </View>
            )}

            {/* Kamera-Badge */}
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
            {profile?.name ?? t.profil_no_name}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
            {t.profil_tap_to_change}
          </Text>

          <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: "#FFF0F3", borderRadius: Sizes.RADIUS_FULL }}>
            <Text style={{ color: Colors.PRIMARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>
              {roleInfo?.label}
            </Text>
          </View>
        </View>

        {/* ── Info Karte ── */}
        <View style={{ backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_XL, padding: Sizes.SPACING_MD, marginBottom: 16 }}>
          <View style={{ paddingVertical: 10 }}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>{t.profil_location}</Text>
            <Text style={{ color: Colors.TEXT, fontWeight: "500", marginTop: 2 }}>
              {profile?.city ?? profile?.plz ?? t.profil_not_specified}
            </Text>
          </View>
        </View>

        {/* ── Tier hinzufügen (nur Tierhalter + Tierheim) ── */}
        {canAddPets && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.TEXT, marginBottom: 10 }}>
              {t.profil_my_animals}
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/shelter/pets/add")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.SURFACE,
                borderRadius: Sizes.RADIUS_XL,
                padding: Sizes.SPACING_MD,
                borderWidth: 1,
                borderColor: Colors.BORDER,
                marginBottom: 10,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF0F3", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                <Text style={{ fontSize: 20 }}>🐾</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: Colors.TEXT, fontSize: Sizes.FONT_MD }}>
                  {t.profil_add_dog}
                </Text>
                <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 1 }}>
                  {t.profil_add_dog_sub}
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            {profile?.role === "tierheim" && (
              <TouchableOpacity
                onPress={() => router.push("/shelter/pets/index")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: Colors.SURFACE,
                  borderRadius: Sizes.RADIUS_XL,
                  padding: Sizes.SPACING_MD,
                  borderWidth: 1,
                  borderColor: Colors.BORDER,
                }}
              >
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF0F3", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Text style={{ fontSize: 20 }}>📋</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: Colors.TEXT, fontSize: Sizes.FONT_MD }}>
                    {t.profil_all_animals}
                  </Text>
                  <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 1 }}>
                    {t.profil_all_animals_sub}
                  </Text>
                </View>
                <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            )}
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
          }}
        >
          <Text style={{ color: Colors.ERROR, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
            {t.profil_sign_out}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
