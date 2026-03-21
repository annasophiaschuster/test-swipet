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

const AKTIV_LABEL: Record<string, string> = {
  sportlich: "🏃 Sehr aktiv",
  mittel: "🚶 Mäßig aktiv",
  ruhig: "🛋 Ruhig",
};

const GROESSE_LABEL: Record<string, string> = {
  klein: "Klein",
  mittel: "Mittel",
  gross: "Groß",
  riese: "Riese",
};

export default function MeineHundeScreen() {
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
            🐕 Meine Hunde
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
            Anmelden erforderlich
          </Text>
          <Text
            style={{
              color: Colors.TEXT_MUTED,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            Melde dich an um deine Hunde zu verwalten und Gassidate-Partner zu finden.
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
            🐕 Meine Hunde
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
            {dogs.length} {dogs.length === 1 ? "Hund" : "Hunde"} registriert
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
            Noch keine Hunde registriert
          </Text>
          <Text
            style={{
              color: Colors.TEXT_MUTED,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            Registriere deinen Hund um Gassidate-Partner in deiner Nähe zu finden!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/auth/onboarding/tierhalter")}
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
              Hund registrieren
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
        onPress={() => router.push("/auth/onboarding/tierhalter")}
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
                ? "Welpe"
                : dog.alter_jahre === 1
                ? "1 Jahr"
                : `${dog.alter_jahre} Jahre`}
            </Text>
          )}
        </View>

        <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginBottom: 10 }}>
          {[dog.rasse, dog.groesse_kategorie ? GROESSE_LABEL[dog.groesse_kategorie] : null]
            .filter(Boolean)
            .join(" · ") || "Mischling"}
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
