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
import GradientHeader from "../../components/GradientHeader";
import { useLanguage } from "../../contexts/LanguageContext";

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

function formatTime(iso: string | null, yesterday: string, lang: string): string {
  if (!iso) return "";
  const locale = lang === "en" ? "en-US" : "de-DE";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return yesterday;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

export default function GassiNachrichten() {
  const { t, lang } = useLanguage();
  const DEMO_CHATS: ChatItem[] = [
    {
      id: "demo-gn-1",
      modus: "gassi",
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      other_pet_name: "Kira",
      other_pet_photo: null,
      other_owner_name: "Max",
      last_message: t.gassi_nachr_demo_msg1,
      last_message_at: new Date(Date.now() - 45 * 60000).toISOString(),
      unread_count: 2,
    },
    {
      id: "demo-gn-2",
      modus: "gassi",
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      other_pet_name: "Cookie",
      other_pet_photo: null,
      other_owner_name: "Sarah",
      last_message: t.gassi_nachr_demo_msg2,
      last_message_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      unread_count: 0,
    },
  ];
  const [chats, setChats]           = useState<ChatItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]       = useState(false);

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
        setChats(DEMO_CHATS);
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
            other_pet_name: otherPet?.name ?? t.matches_unknown,
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader
        title={t.gassi_nachr_title}
        subtitle={`${chats.length} ${chats.length !== 1 ? t.gassi_nachr_conversations_plural : t.gassi_nachr_conversations_singular}`}
        showBack
        backLabel={t.comp_switch_modes}
        onBack={() => router.replace("/")}
      />

      {chats.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>💬</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            {t.gassi_nachr_empty_title}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
            {t.gassi_nachr_empty_sub}
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadChats(true)} tintColor={Colors.SECONDARY} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (isGuest) { router.push("/auth/login"); return; }
                router.push({
                  pathname: "/gassi/chat/[matchId]",
                  params: {
                    matchId: item.id,
                    petName: item.other_pet_name,
                    petPhoto: item.other_pet_photo ?? "",
                    ownerName: item.other_owner_name ?? "",
                    modus: item.modus,
                  },
                });
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginHorizontal: 16,
                marginVertical: 6,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: 20,
                backgroundColor: item.unread_count > 0 ? "#FFF2EC" : "#FFF8F4",
                shadowColor: Colors.SECONDARY,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 2,
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
                        {item.modus === "gassi" ? t.gassi_mode_gassi : t.gassi_mode_deck}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                      {formatTime(item.last_message_at ?? item.created_at, t.matches_yesterday, lang)}
                    </Text>
                  </View>
                </View>
                {item.other_owner_name && (
                  <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>
                    {item.other_owner_name}
                  </Text>
                )}
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
                  {item.last_message ?? t.gassi_nachr_placeholder}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
