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
import { useLanguage } from "../../contexts/LanguageContext";

interface ShelterMatch {
  id: string;
  created_at: string;
  pet_name: string;
  pet_tierart: string;
  pet_photo: string | null;
  adoptant_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_is_mine: boolean;
  unread_count: number;
}

export default function ShelterMatchesScreen() {
  const { t, lang } = useLanguage();
  const [matches, setMatches] = useState<ShelterMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      if (!user) return;

      const { data, error } = await supabase
        .from("adoption_matches")
        .select(`
          id, created_at,
          pet:pets(name, tierart, pet_photos(url, position)),
          adoptant:profiles!adoptant_id(name)
        `)
        .eq("shelter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: ShelterMatch[] = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("text, created_at, sender_id")
            .eq("match_id", m.id)
            .eq("match_type", "adoption")
            .order("created_at", { ascending: false })
            .limit(1);

          // Count unread (messages not sent by shelter)
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
            created_at: m.created_at,
            pet_name: m.pet?.name ?? t.matches_unknown,
            pet_tierart: m.pet?.tierart ?? "hund",
            pet_photo: photos[0]?.url ?? null,
            adoptant_name: m.adoptant?.name ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
            last_message_is_mine: msgs?.[0]?.sender_id === user.id,
            unread_count: unread ?? 0,
          };
        })
      );

      setMatches(items);
    } catch (e) {
      console.error("loadMatches error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const locale = lang === "en" ? "en-US" : "de-DE";

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return t.adoption_chat_yesterday;
    return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.BORDER, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 20, color: Colors.PRIMARY }}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>{t.tierheim_matches_title}</Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: 12 }}>{t.tierheim_dashboard_interested(matches.length)}</Text>
        </View>
      </View>

      {matches.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>💌</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            {t.tierheim_matches_empty_title}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
            {t.tierheim_matches_empty_sub}
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMatches(true)} tintColor={Colors.PRIMARY} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/shelter/chat/[matchId]",
                  params: {
                    matchId: item.id,
                    petName: item.pet_name,
                    petPhoto: item.pet_photo ?? "",
                    adoptantName: item.adoptant_name ?? t.tierheim_req_guest_nav,
                  },
                })
              }
              style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Sizes.SPACING_LG, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.BORDER }}
              activeOpacity={0.7}
            >
              {/* Pet avatar */}
              <View style={{ marginRight: 14 }}>
                {item.pet_photo ? (
                  <Image source={{ uri: item.pet_photo }} style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.SURFACE }} />
                ) : (
                  <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 26 }}>{item.pet_tierart === "hund" ? "🐶" : "🐱"}</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: item.unread_count > 0 ? "800" : "700", color: Colors.TEXT }}>
                    {item.pet_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                    {formatTime(item.last_message_at ?? item.created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>
                  {t.tierheim_req_from} {item.adoptant_name ?? t.tierheim_req_unknown}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontSize: Sizes.FONT_SM, color: item.last_message ? (item.unread_count > 0 ? Colors.TEXT : Colors.TEXT_MUTED) : Colors.TEXT_MUTED, fontStyle: item.last_message ? "normal" : "italic", fontWeight: item.unread_count > 0 ? "600" : "400" }}
                  >
                    {item.last_message_is_mine ? t.tierheim_req_you : ""}{item.last_message ?? t.tierheim_req_new_match}
                  </Text>
                  {item.unread_count > 0 && (
                    <View style={{ backgroundColor: Colors.PRIMARY, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, marginLeft: 8 }}>
                      <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "700" }}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
