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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import GradientHeader from "../../components/GradientHeader";
import { useLanguage } from "../../contexts/LanguageContext";

interface OwnerMatchItem {
  id: string;
  modus: "gassi" | "spieldate";
  created_at: string;
  other_pet_name: string;
  other_pet_rasse?: string;
  other_pet_tierart: string;
  other_pet_photo: string | null;
  other_owner_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread: boolean;
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

// Unsplash dog avatars for demo
const DEMO_AVATARS = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=120&q=80",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=120&q=80",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=120&q=80",
  "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=120&q=80",
  "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=120&q=80",
];

export default function GassiMatchesScreen() {
  const { t, lang } = useLanguage();

  const now = Date.now();

  const DEMO_MATCHES: OwnerMatchItem[] = [
    {
      id: "demo-gm-1",
      modus: "gassi",
      created_at: new Date(now - 12 * 60000).toISOString(),
      other_pet_name: "Luna",
      other_pet_rasse: "Golden Retriever",
      other_pet_tierart: "hund",
      other_pet_photo: DEMO_AVATARS[0],
      other_owner_name: "Sophie",
      last_message: "Morgen früh um 9 am Stadtpark? 🌳",
      last_message_at: new Date(now - 12 * 60000).toISOString(),
      unread: true,
    },
    {
      id: "demo-gm-2",
      modus: "gassi",
      created_at: new Date(now - 2 * 3600000).toISOString(),
      other_pet_name: "Balu",
      other_pet_rasse: "Berner Sennenhund",
      other_pet_tierart: "hund",
      other_pet_photo: DEMO_AVATARS[1],
      other_owner_name: "Jonas",
      last_message: "Super, dann sehen wir uns Samstag!",
      last_message_at: new Date(now - 2 * 3600000).toISOString(),
      unread: false,
    },
    {
      id: "demo-gm-3",
      modus: "spieldate",
      created_at: new Date(now - 5 * 3600000).toISOString(),
      other_pet_name: "Mia",
      other_pet_rasse: "Labrador",
      other_pet_tierart: "hund",
      other_pet_photo: DEMO_AVATARS[2],
      other_owner_name: "Laura",
      last_message: "Klingt gut! Mia ist total verspielt 😄",
      last_message_at: new Date(now - 5 * 3600000).toISOString(),
      unread: false,
    },
    {
      id: "demo-gm-4",
      modus: "gassi",
      created_at: new Date(now - 26 * 3600000).toISOString(),
      other_pet_name: "Rex",
      other_pet_rasse: "Schäferhund",
      other_pet_tierart: "hund",
      other_pet_photo: DEMO_AVATARS[3],
      other_owner_name: "Markus",
      last_message: "Habt ihr heute schon Gassi gemacht?",
      last_message_at: new Date(now - 26 * 3600000).toISOString(),
      unread: true,
    },
    {
      id: "demo-gm-5",
      modus: "spieldate",
      created_at: new Date(now - 3 * 86400000).toISOString(),
      other_pet_name: "Nala",
      other_pet_rasse: "Husky",
      other_pet_tierart: "hund",
      other_pet_photo: DEMO_AVATARS[4],
      other_owner_name: "Emma",
      last_message: "Es war so schön! Machen wir das bald wieder 🐾",
      last_message_at: new Date(now - 3 * 86400000).toISOString(),
      unread: false,
    },
    {
      id: "demo-gm-6",
      modus: "gassi",
      created_at: new Date(now - 5 * 86400000).toISOString(),
      other_pet_name: "Bruno",
      other_pet_rasse: "Bulldogge",
      other_pet_tierart: "hund",
      other_pet_photo: null,
      other_owner_name: "Tom",
      last_message: null,
      last_message_at: null,
      unread: false,
    },
  ];

  const [matches, setMatches]       = useState<OwnerMatchItem[]>([]);
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
        .from("owner_matches")
        .select(`
          id, modus, created_at,
          pet_a_id, pet_b_id, owner_a_id, owner_b_id,
          pet_a:owner_pets!pet_a_id(name, rasse, tierart, foto_url, owner:profiles!owner_id(name)),
          pet_b:owner_pets!pet_b_id(name, rasse, tierart, foto_url, owner:profiles!owner_id(name))
        `)
        .or(`owner_a_id.eq.${user.id},owner_b_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fall back to demo matches if the user has none yet
      if ((data ?? []).length === 0) {
        setMatches(DEMO_MATCHES);
        setLoading(false);
        setRefreshing(false);
        return;
      }

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
            other_pet_name: otherPet?.name ?? t.matches_unknown,
            other_pet_rasse: otherPet?.rasse ?? undefined,
            other_pet_tierart: otherPet?.tierart ?? "hund",
            other_pet_photo: otherPet?.foto_url ?? null,
            other_owner_name: otherPet?.owner?.name ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
            unread: false,
          };
        })
      );

      setMatches(items);
    } catch (e) {
      console.error("GassiMatchesScreen.loadMatches", e);
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
        title="Matches"
        subtitle={`${matches.length} ${matches.length === 1 ? "Match" : "Matches"}`}
      />

      {matches.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="heart-outline" size={64} color={Colors.BORDER} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            {t.matches_empty_owner_title}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
            {t.matches_empty_owner_sub}
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMatches(true)}
              tintColor={Colors.SECONDARY}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: Colors.BORDER, marginLeft: 88 }} />
          )}
          renderItem={({ item }) => {
            return (
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
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: Colors.WHITE,
                }}
                activeOpacity={0.65}
              >
                {/* Avatar */}
                <View style={{ marginRight: 14, position: "relative" }}>
                  {item.other_pet_photo ? (
                    <Image
                      source={{ uri: item.other_pet_photo }}
                      style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.SURFACE }}
                    />
                  ) : (
                    <View style={{
                      width: 58, height: 58, borderRadius: 29,
                      backgroundColor: Colors.SURFACE,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons name="paw" size={26} color={Colors.SECONDARY} />
                    </View>
                  )}
                  {/* Modus badge */}
                  <View style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: item.modus === "gassi" ? Colors.SECONDARY : Colors.PRIMARY,
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 2, borderColor: Colors.WHITE,
                  }}>
                    <Ionicons
                      name={item.modus === "gassi" ? "walk" : "football"}
                      size={10}
                      color={Colors.WHITE}
                    />
                  </View>
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <Text style={{ fontSize: 15, fontWeight: item.unread ? "800" : "600", color: Colors.TEXT }}>
                      {item.other_pet_name}
                      {item.other_owner_name ? (
                        <Text style={{ fontSize: 13, fontWeight: "400", color: Colors.TEXT_MUTED }}>
                          {" "}· {item.other_owner_name}
                        </Text>
                      ) : null}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                      {formatTime(item.last_message_at ?? item.created_at, t.matches_yesterday, lang)}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginBottom: 4 }}>
                    {[item.other_pet_rasse, item.modus === "gassi" ? t.gassi_matches_gassi_date : t.gassi_matches_spieldate]
                      .filter(Boolean).join(" · ")}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: item.unread ? Colors.TEXT : Colors.TEXT_MUTED,
                        fontWeight: item.unread ? "600" : "400",
                        fontStyle: item.last_message ? "normal" : "italic",
                      }}
                    >
                      {item.last_message ?? t.gassi_matches_wait_match}
                    </Text>
                    {item.unread && (
                      <View style={{
                        width: 9, height: 9, borderRadius: 5,
                        backgroundColor: Colors.PRIMARY, flexShrink: 0,
                      }} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
