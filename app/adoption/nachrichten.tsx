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

interface ChatItem {
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
  unread_count: number;
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

export default function AdoptionNachrichten() {
  const [chats, setChats]         = useState<ChatItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]     = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const loadChats = async (isRefresh = false) => {
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

      const items: ChatItem[] = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("text, created_at, sender_id")
            .eq("match_id", m.id)
            .eq("match_type", "adoption")
            .order("created_at", { ascending: false })
            .limit(1);

          const { count: unread } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("match_id", m.id)
            .neq("sender_id", user.id);

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
            unread_count: unread ?? 0,
          };
        })
      );

      // Only show chats with at least one message or where user wants to chat
      setChats(items);
    } catch (e) {
      console.error("AdoptionNachrichten.loadChats", e);
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
        <View style={{
          paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}>
          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
          >
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>‹</Text>
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi wechseln</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>💬 Nachrichten</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🔒</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            Nicht angemeldet
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
            Melde dich an, um Nachrichten mit Tierheimen zu lesen und zu schreiben.
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
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
      }}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>‹</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi wechseln</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>💬 Nachrichten</Text>
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
          {chats.length} Gespräch{chats.length !== 1 ? "e" : ""}
        </Text>
      </View>

      {chats.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>💬</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            Noch keine Nachrichten
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
            Like ein Tier und schreib dem Tierheim eine Nachricht!
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadChats(true)} tintColor={Colors.PRIMARY} />
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
                backgroundColor: item.unread_count > 0 ? "#FFF8FA" : Colors.BACKGROUND,
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 14 }}>
                {item.pet_photo ? (
                  <Image
                    source={{ uri: item.pet_photo }}
                    style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.SURFACE }}
                  />
                ) : (
                  <View style={{
                    width: 58, height: 58, borderRadius: 29,
                    backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 26 }}>{item.pet_tierart === "hund" ? "🐶" : "🐱"}</Text>
                  </View>
                )}
                {item.unread_count > 0 && (
                  <View style={{
                    position: "absolute", top: -2, right: -2,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center",
                    borderWidth: 2, borderColor: Colors.BACKGROUND,
                  }}>
                    <Text style={{ color: Colors.WHITE, fontSize: 9, fontWeight: "700" }}>
                      {item.unread_count > 9 ? "9+" : item.unread_count}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text style={{
                    fontSize: Sizes.FONT_MD,
                    fontWeight: item.unread_count > 0 ? "800" : "700",
                    color: Colors.TEXT,
                  }}>
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
                    color: item.last_message
                      ? item.unread_count > 0 ? Colors.TEXT : Colors.TEXT_MUTED
                      : Colors.TEXT_MUTED,
                    marginTop: 3,
                    fontStyle: item.last_message ? "normal" : "italic",
                    fontWeight: item.unread_count > 0 ? "600" : "400",
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
