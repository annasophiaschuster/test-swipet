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

interface OwnerMatchItem {
  id: string;
  modus: "gassi" | "spieldate";
  created_at: string;
  other_pet_name: string;
  other_pet_tierart: string;
  other_pet_photo: string | null;
  other_owner_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

export default function GassiMatchesScreen() {
  const [matches, setMatches] = useState<OwnerMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  const loadMatches = async (isRefresh = false) => {
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
        .from("owner_matches")
        .select(
          `
          id, modus, created_at,
          pet_a_id, pet_b_id, owner_a_id, owner_b_id,
          pet_a:owner_pets!pet_a_id(name, tierart, foto_url, owner:profiles!owner_id(name)),
          pet_b:owner_pets!pet_b_id(name, tierart, foto_url, owner:profiles!owner_id(name))
        `
        )
        .or(`owner_a_id.eq.${user.id},owner_b_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: OwnerMatchItem[] = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const isA = m.owner_a_id === user.id;
          const otherPet = isA ? m.pet_b : m.pet_a;

          const { data: msgs } = await supabase
            .from("messages")
            .select("text, created_at")
            .eq("match_id", m.id)
            .eq("match_type", "owner")
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            id: m.id,
            modus: m.modus,
            created_at: m.created_at,
            other_pet_name: otherPet?.name ?? "Unbekannt",
            other_pet_tierart: otherPet?.tierart ?? "hund",
            other_pet_photo: otherPet?.foto_url ?? null,
            other_owner_name: otherPet?.owner?.name ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
          };
        })
      );

      setMatches(items);
    } catch (e) {
      console.error("loadMatches", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0)
      return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Gestern";
    if (diffDays < 7) return d.toLocaleDateString("de-DE", { weekday: "short" });
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.BACKGROUND,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
            ❤️ Gassi-Matches
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
            Melde dich an um deine Gassi-Matches zu sehen und mit anderen Hundehaltern zu chatten.
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
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>
          ❤️ Gassi-Matches
        </Text>
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
          {matches.length} {matches.length === 1 ? "Match" : "Matches"}
        </Text>
      </View>

      {matches.length === 0 ? (
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
            Noch keine Gassi-Matches
          </Text>
          <Text
            style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}
          >
            Swipe auf andere Hunde im Gassidate-Feed — bei einem gegenseitigen Like könnt ihr euch
            verabreden!
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMatches(true)}
              tintColor={Colors.SECONDARY}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/gassi/chat/[matchId]",
                  params: {
                    matchId: item.id,
                    petName: item.other_pet_name,
                    petPhoto: item.other_pet_photo ?? "",
                    ownerName: item.other_owner_name ?? "",
                    modus: item.modus,
                  },
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: Sizes.SPACING_LG,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: Colors.BORDER,
                backgroundColor: Colors.BACKGROUND,
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 14 }}>
                {item.other_pet_photo ? (
                  <Image
                    source={{ uri: item.other_pet_photo }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: Colors.SURFACE,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: Colors.SURFACE,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>
                      {item.other_pet_tierart === "hund" ? "🐶" : "🐱"}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: Colors.SECONDARY,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: Colors.BACKGROUND,
                  }}
                >
                  <Text style={{ fontSize: 10 }}>
                    {item.modus === "gassi" ? "🦮" : "🎾"}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <Text
                    style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}
                  >
                    {item.other_pet_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                    {formatTime(item.last_message_at ?? item.created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>
                  {item.other_owner_name ?? "Tierhalter"} ·{" "}
                  {item.modus === "gassi" ? "🦮 Gassi" : "🎾 Spieldate"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: Sizes.FONT_SM,
                    color: item.last_message ? Colors.TEXT : Colors.TEXT_MUTED,
                    marginTop: 3,
                    fontStyle: item.last_message ? "normal" : "italic",
                  }}
                >
                  {item.last_message ?? "Schreib eine Nachricht…"}
                </Text>
              </View>

              <Text style={{ color: Colors.TEXT_MUTED, marginLeft: 8, fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
