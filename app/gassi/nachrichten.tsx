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
  modus: "gassi" | "spieldate";
  created_at: string;
  other_pet_name: string;
  other_pet_photo: string | null;
  other_owner_name: string | null;
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
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default function GassiNachrichten() {
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
        .from("owner_matches")
        .select(`
          id, modus, created_at,
          pet_a:owner_pets!pet_a_id(name, foto_url, owner_id),
          pet_b:owner_pets!pet_b_id(name, foto_url, owner_id)
        `)
        .or(`owner_a_id.eq.${user.id},owner_b_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: ChatItem[] = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const isA = m.pet_a?.owner_id === user.id;
          const myPet   = isA ? m.pet_a : m.pet_b;
          const otherPet = isA ? m.pet_b : m.pet_a;

          const { data: msgs } = await supabase
            .from("messages")
            .select("text, created_at, sender_id")
            .eq("match_id", m.id)
            .eq("match_type", "owner")
            .order("created_at", { ascending: false })
            .limit(1);

          const { count: unread } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("match_id", m.id)
            .neq("sender_id", user.id);

          return {
            id: m.id,
            modus: m.modus,
            created_at: m.created_at,
            other_pet_name: otherPet?.name ?? "Unbekannt",
            other_pet_photo: otherPet?.foto_url ?? null,
            other_owner_name: null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
            unread_count: unread ?? 0,
          };
        })
      );

      setChats(items);
    } catch (e) {
      console.error("GassiNachrichten.loadChats", e);
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
            Melde dich an, um Nachrichten von anderen Hundebesitzern zu lesen.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{
              height: Sizes.BUTTON_HEIGHT, paddingHorizontal: 32,
              backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL,
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
            Bei einem gegenseitigen Match könnt ihr euch direkt schreiben!
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadChats(true)} tintColor={Colors.SECONDARY} />
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
                backgroundColor: item.unread_count > 0 ? "#FFF8F2" : Colors.BACKGROUND,
              }}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 14 }}>
                {item.other_pet_photo ? (
                  <Image
                    source={{ uri: item.other_pet_photo }}
                    style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.SURFACE }}
                  />
                ) : (
                  <View style={{
                    width: 58, height: 58, borderRadius: 29,
                    backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 26 }}>🐶</Text>
                  </View>
                )}
                {item.unread_count > 0 && (
                  <View style={{
                    position: "absolute", top: -2, right: -2,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: Colors.SECONDARY, alignItems: "center", justifyContent: "center",
                    borderWidth: 2, borderColor: Colors.BACKGROUND,
                  }}>
                    <Text style={{ color: Colors.WHITE, fontSize: 9, fontWeight: "700" }}>
                      {item.unread_count > 9 ? "9+" : item.unread_count}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{
                    fontSize: Sizes.FONT_MD,
                    fontWeight: item.unread_count > 0 ? "800" : "700",
                    color: Colors.TEXT,
                  }}>
                    {item.other_pet_name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{
                      backgroundColor: item.modus === "gassi" ? Colors.SECONDARY + "22" : "#F3EDFF",
                      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
                    }}>
                      <Text style={{
                        fontSize: 10, fontWeight: "600",
                        color: item.modus === "gassi" ? Colors.SECONDARY : "#9B59B6",
                      }}>
                        {item.modus === "gassi" ? "Gassidate" : "Zucht"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                      {formatTime(item.last_message_at ?? item.created_at)}
                    </Text>
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: Sizes.FONT_SM,
                    color: item.last_message
                      ? item.unread_count > 0 ? Colors.TEXT : Colors.TEXT_MUTED
                      : Colors.TEXT_MUTED,
                    marginTop: 4,
                    fontStyle: item.last_message ? "normal" : "italic",
                    fontWeight: item.unread_count > 0 ? "600" : "400",
                  }}
                >
                  {item.last_message ?? "Schreib eine erste Nachricht!"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
