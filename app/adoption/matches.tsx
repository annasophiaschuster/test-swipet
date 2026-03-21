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

interface AdoptionMatchItem {
  id: string;
  pet_id: string;
  shelter_id: string;
  created_at: string;
  pet_name: string;
  pet_tierart: string;
  pet_photo: string | null;
  shelter_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return d.toLocaleDateString("de-DE", { weekday: "short" });
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function EmptyState() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>💔</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        Noch keine Matches
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
        Swipe rechts auf Tiere die dir gefallen — bei einem Match kannst du direkt mit dem Tierheim schreiben!
      </Text>
    </View>
  );
}

function GuestState() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🔒</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        Nicht angemeldet
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
        Melde dich an, um deine Matches zu sehen und mit Tierheimen zu schreiben.
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

export default function AdoptionMatchesScreen() {
  const [matches, setMatches]     = useState<AdoptionMatchItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]     = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  const loadMatches = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setIsGuest(false);

      const { data, error } = await supabase
        .from("adoption_matches")
        .select(`
          id, pet_id, shelter_id, created_at,
          pet:pets(name, tierart, pet_photos(url, position)),
          shelter:profiles!shelter_id(name)
        `)
        .eq("adoptant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: AdoptionMatchItem[] = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("text, created_at")
            .eq("match_id", m.id)
            .eq("match_type", "adoption")
            .order("created_at", { ascending: false })
            .limit(1);

          const photos = (m.pet?.pet_photos ?? []).sort(
            (a: any, b: any) => a.position - b.position
          );

          return {
            id: m.id,
            pet_id: m.pet_id,
            shelter_id: m.shelter_id,
            created_at: m.created_at,
            pet_name: m.pet?.name ?? "Unbekannt",
            pet_tierart: m.pet?.tierart ?? "hund",
            pet_photo: photos[0]?.url ?? null,
            shelter_name: m.shelter?.name ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
          };
        })
      );

      setMatches(items);
    } catch (e) {
      console.error("AdoptionMatchesScreen.loadMatches", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.PRIMARY} size="large" />
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        {/* Header */}
        <View style={{
          paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12,
          backgroundColor: Colors.BACKGROUND,
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}>
          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
          >
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>‹</Text>
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi wechseln</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>❤️ Matches</Text>
        </View>
        <GuestState />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12,
        backgroundColor: Colors.BACKGROUND,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
      }}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>‹</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi wechseln</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>❤️ Matches</Text>
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
          {matches.length} {matches.length === 1 ? "Match" : "Matches"}
        </Text>
      </View>

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMatches(true)}
              tintColor={Colors.PRIMARY}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/adoption/chat/[matchId]",
                  params: {
                    matchId: item.id,
                    petName: item.pet_name,
                    petPhoto: item.pet_photo ?? "",
                    shelterName: item.shelter_name ?? "",
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
                {item.pet_photo ? (
                  <Image
                    source={{ uri: item.pet_photo }}
                    style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.SURFACE }}
                  />
                ) : (
                  <View style={{
                    width: 60, height: 60, borderRadius: 30,
                    backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 28 }}>{item.pet_tierart === "hund" ? "🐶" : "🐱"}</Text>
                  </View>
                )}
                <View style={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center",
                  borderWidth: 2, borderColor: Colors.BACKGROUND,
                }}>
                  <Text style={{ fontSize: 10 }}>❤️</Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
                    {item.pet_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                    {formatTime(item.last_message_at ?? item.created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>
                  {item.shelter_name ?? "Tierheim"}
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
                  {item.last_message ?? "Schreib dem Tierheim eine Nachricht…"}
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
