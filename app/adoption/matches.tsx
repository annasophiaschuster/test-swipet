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

interface AdoptionMatchItem {
  id: string;
  pet_id: string;
  shelter_id: string;
  created_at: string;
  pet_name: string;
  pet_rasse?: string;
  pet_tierart: string;
  pet_photo: string | null;
  shelter_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  match_status?: "pending" | "accepted" | "rejected";
}

function formatTime(iso: string | null, yesterday: string, lang: string): string {
  if (!iso) return "";
  const locale = lang === "en" ? "en-US" : "de-DE";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return yesterday;
  if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: "short" });
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>💔</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        {t.adoption_matches_empty_title}
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
        {t.adoption_matches_empty_sub}
      </Text>
    </View>
  );
}

export default function AdoptionMatchesScreen() {
  const { t, lang } = useLanguage();
  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: Colors.WARNING + "22", color: "#B8860B",      label: t.adoption_matches_pending },
    accepted: { bg: Colors.SUCCESS + "22", color: Colors.SUCCESS,  label: t.adoption_matches_accepted },
    rejected: { bg: Colors.ERROR   + "22", color: Colors.ERROR,    label: t.adoption_matches_rejected },
  };
  const DEMO_MATCHES: AdoptionMatchItem[] = [
    {
      id: "demo-a-1",
      pet_id: "demo-pet-1",
      shelter_id: "demo-shelter-1",
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      pet_name: "Bruno",
      pet_rasse: "Golden Retriever",
      pet_tierart: "hund",
      pet_photo: null,
      shelter_name: "Tierheim München",
      last_message: t.adoption_nachrichten_demo_msg1,
      last_message_at: new Date(Date.now() - 25 * 60000).toISOString(),
      match_status: "accepted",
    },
    {
      id: "demo-a-2",
      pet_id: "demo-pet-2",
      shelter_id: "demo-shelter-1",
      created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
      pet_name: "Milo",
      pet_rasse: "Labrador",
      pet_tierart: "hund",
      pet_photo: null,
      shelter_name: "Tierheim München",
      last_message: null,
      last_message_at: null,
      match_status: "pending",
    },
    {
      id: "demo-a-3",
      pet_id: "demo-pet-3",
      shelter_id: "demo-shelter-2",
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      pet_name: "Bella",
      pet_rasse: "Chihuahua",
      pet_tierart: "hund",
      pet_photo: null,
      shelter_name: "Tierheim Berlin",
      last_message: t.adoption_nachrichten_demo_msg2,
      last_message_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      match_status: "rejected",
    },
  ];
  const [matches, setMatches]       = useState<AdoptionMatchItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]       = useState(false);

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
        setMatches(DEMO_MATCHES);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setIsGuest(false);

      const { data, error } = await supabase
        .from("adoption_matches")
        .select(`
          id, pet_id, shelter_id, created_at, status,
          pet:pets(name, rasse, tierart, pet_photos(url, position)),
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
            pet_name: m.pet?.name ?? t.matches_unknown,
            pet_rasse: m.pet?.rasse ?? undefined,
            pet_tierart: m.pet?.tierart ?? "hund",
            pet_photo: photos[0]?.url ?? null,
            shelter_name: m.shelter?.name ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
            match_status: m.status ?? undefined,
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader
        title="Matches"
        subtitle={`${matches.length} ${matches.length === 1 ? "Match" : "Matches"}`}
      />

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMatches(true)}
              tintColor={Colors.PRIMARY}
            />
          }
          renderItem={({ item }) => {
            const statusStyle = item.match_status ? STATUS_STYLE[item.match_status] : null;
            return (
              <TouchableOpacity
                onPress={() => {
                  if (isGuest) { router.push("/auth/login"); return; }
                  router.push({
                    pathname: "/adoption/chat/[matchId]",
                    params: {
                      matchId: item.id,
                      petName: item.pet_name,
                      petPhoto: item.pet_photo ?? "",
                      shelterName: item.shelter_name ?? "",
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
                  backgroundColor: "#FFF5F7",
                  shadowColor: Colors.PRIMARY,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={{ marginRight: 14 }}>
                  {item.pet_photo ? (
                    <Image
                      source={{ uri: item.pet_photo }}
                      style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: Colors.SURFACE }}
                    />
                  ) : (
                    <View style={{
                      width: 72, height: 72, borderRadius: 14,
                      backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 32 }}>🐶</Text>
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: "800", color: Colors.TEXT }}>
                        {item.pet_name}
                      </Text>
                      {statusStyle && (
                        <View style={{
                          backgroundColor: statusStyle.bg,
                          paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: statusStyle.color }}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                      {formatTime(item.last_message_at ?? item.created_at, t.matches_yesterday, lang)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>
                    {[item.shelter_name ?? t.adoption_chat_shelter_fallback, item.pet_rasse].filter(Boolean).join(" · ")}
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
                    {item.last_message ?? t.adoption_matches_wait_msg}
                  </Text>
                </View>
                <Text style={{ color: Colors.TEXT_MUTED, marginLeft: 8, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
