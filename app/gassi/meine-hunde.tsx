import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import type { OwnerPetItem } from "../../components/OwnerPetCard";
import { useLanguage } from "../../contexts/LanguageContext";

export default function MeineHundeScreen() {
  const { t } = useLanguage();
  const [dogs, setDogs] = useState<OwnerPetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDogs();
    }, [])
  );

  const loadDogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        return;
      }
      setIsGuest(false);

      const { data, error } = await supabase
        .from("owner_pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setDogs(data ?? []);
    } catch (e) {
      console.error("loadDogs", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.SECONDARY} size="large" />
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
          <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>
            {t.gassi_my_dogs}
          </Text>
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
            {t.gassi_dogs_login_title}
          </Text>
          <Text
            style={{
              color: Colors.TEXT_MUTED,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            {t.gassi_dogs_login_sub}
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
              {t.gassi_dogs_login_btn}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>
            {t.gassi_my_dogs}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
            {dogs.length} {dogs.length === 1 ? t.gassi_dogs_count_singular : t.gassi_dogs_count_plural}
          </Text>
        </View>
      </View>

      {dogs.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🐾</Text>
          <Text
            style={{
              fontSize: Sizes.FONT_XL,
              fontWeight: "700",
              color: Colors.TEXT,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {t.gassi_dogs_empty_title}
          </Text>
          <Text
            style={{
              color: Colors.TEXT_MUTED,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            {t.gassi_dogs_empty_sub}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/gassi/hund-anlegen")}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              paddingHorizontal: 28,
              backgroundColor: Colors.SECONDARY,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
              {t.gassi_dogs_register_btn}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={dogs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Sizes.SPACING_LG, gap: 14, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDogs(true)}
              tintColor={Colors.SECONDARY}
            />
          }
          renderItem={({ item }) => <DogCard dog={item} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/gassi/hund-anlegen")}
        style={{
          position: "absolute",
          bottom: 30,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: Colors.SECONDARY,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: Colors.SECONDARY,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text style={{ color: Colors.WHITE, fontSize: 28, fontWeight: "700", lineHeight: 32 }}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function DogCard({ dog }: { dog: OwnerPetItem }) {
  const { t } = useLanguage();
  const AKTIV_LABEL: Record<string, string> = {
    sportlich: t.gassi_activity_very,
    mittel: t.gassi_activity_medium,
    ruhig: t.gassi_activity_calm,
  };
  const GROESSE_LABEL: Record<string, string> = {
    klein: t.gassi_size_small_label,
    mittel: t.gassi_size_medium_label,
    gross: t.gassi_size_large_label,
    riese: t.gassi_size_giant_label,
  };
  return (
    <View
      style={{
        backgroundColor: Colors.WHITE,
        borderRadius: Sizes.RADIUS_LG,
        borderWidth: 1,
        borderColor: Colors.BORDER,
        overflow: "hidden",
        shadowColor: Colors.SECONDARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {/* Photo */}
      <View style={{ height: 180 }}>
        {dog.foto_url ? (
          <Image
            source={{ uri: dog.foto_url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: Colors.SURFACE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 64 }}>🐶</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ padding: 14 }}>
        <View
          style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 4 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>{dog.name}</Text>
          {dog.alter_jahre != null && (
            <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED }}>
              {dog.alter_jahre === 0
                ? t.tierheim_age_puppy
                : dog.alter_jahre === 1
                ? `1 ${t.tierheim_age_year}`
                : `${dog.alter_jahre} ${t.tierheim_age_years}`}
            </Text>
          )}
        </View>

        <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginBottom: 10 }}>
          {[dog.rasse, dog.groesse_kategorie ? GROESSE_LABEL[dog.groesse_kategorie] : null]
            .filter(Boolean)
            .join(" · ") || t.gassi_dogs_mixed_breed}
        </Text>

        {dog.aktivitaetslevel && (
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: Sizes.RADIUS_FULL,
              backgroundColor: Colors.SECONDARY + "18",
              borderWidth: 1,
              borderColor: Colors.SECONDARY + "40",
            }}
          >
            <Text style={{ fontSize: 12, color: Colors.SECONDARY, fontWeight: "600" }}>
              {AKTIV_LABEL[dog.aktivitaetslevel] ?? dog.aktivitaetslevel}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
