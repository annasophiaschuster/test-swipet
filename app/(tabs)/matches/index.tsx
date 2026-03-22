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
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

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

type TabType = "adoption" | "owner";

export default function MatchesScreen() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<TabType>("adoption");
  const [adoptionMatches, setAdoptionMatches] = useState<AdoptionMatchItem[]>([]);
  const [ownerMatches, setOwnerMatches] = useState<OwnerMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([loadAdoptionMatches(), loadOwnerMatches()]);
    setLoading(false);
    setRefreshing(false);
  };

  const loadAdoptionMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
            pet_name: m.pet?.name ?? t.matches_unknown,
            pet_tierart: m.pet?.tierart ?? "hund",
            pet_photo: photos[0]?.url ?? null,
            shelter_name: m.shelter?.name ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
          };
        })
      );

      setAdoptionMatches(items);
    } catch (e) {
      console.error("loadAdoptionMatches error", e);
    }
  };

  const loadOwnerMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("owner_matches")
        .select(`
          id, modus, created_at,
          pet_a_id, pet_b_id, owner_a_id, owner_b_id,
          pet_a:owner_pets!pet_a_id(name, tierart, foto_url, owner:profiles!owner_id(name)),
          pet_b:owner_pets!pet_b_id(name, tierart, foto_url, owner:profiles!owner_id(name))
        `)
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
            other_pet_name: otherPet?.name ?? t.matches_unknown,
            other_pet_tierart: otherPet?.tierart ?? "hund",
            other_pet_photo: otherPet?.foto_url ?? null,
            other_owner_name: otherPet?.owner?.name ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
          };
        })
      );

      setOwnerMatches(items);
    } catch (e) {
      console.error("loadOwnerMatches error", e);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    const locale = lang === "en" ? "en-US" : "de-DE";
    if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return t.matches_yesterday;
    if (diffDays < 7) return d.toLocaleDateString(locale, { weekday: "short" });
    return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  };

  const totalCount = tab === "adoption" ? adoptionMatches.length : ownerMatches.length;

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
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: Sizes.SPACING_LG,
          paddingBottom: 12,
          backgroundColor: Colors.BACKGROUND,
          borderBottomWidth: 1,
          borderBottomColor: Colors.BORDER,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>
          {t.matches_header}
        </Text>
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
          {totalCount} {totalCount === 1 ? "Match" : "Matches"}
        </Text>
      </View>

      {/* Tab Toggle */}
      <View style={{ flexDirection: "row", margin: 16, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_FULL, padding: 4 }}>
        <TouchableOpacity
          onPress={() => setTab("adoption")}
          style={{ flex: 1, paddingVertical: 9, borderRadius: Sizes.RADIUS_FULL, backgroundColor: tab === "adoption" ? Colors.PRIMARY : "transparent", alignItems: "center" }}
        >
          <Text style={{ color: tab === "adoption" ? Colors.WHITE : Colors.TEXT_MUTED, fontWeight: tab === "adoption" ? "700" : "400", fontSize: Sizes.FONT_SM }}>
            {t.matches_tab_adoption}
            {adoptionMatches.length > 0 ? ` (${adoptionMatches.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("owner")}
          style={{ flex: 1, paddingVertical: 9, borderRadius: Sizes.RADIUS_FULL, backgroundColor: tab === "owner" ? Colors.SECONDARY : "transparent", alignItems: "center" }}
        >
          <Text style={{ color: tab === "owner" ? Colors.WHITE : Colors.TEXT_MUTED, fontWeight: tab === "owner" ? "700" : "400", fontSize: Sizes.FONT_SM }}>
            {t.matches_tab_gassi}
            {ownerMatches.length > 0 ? ` (${ownerMatches.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Adoption Tab */}
      {tab === "adoption" && (
        adoptionMatches.length === 0 ? (
          <AdoptionEmptyState />
        ) : (
          <FlatList
            data={adoptionMatches}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={Colors.PRIMARY} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/matches/[matchId]",
                    params: {
                      matchId: item.id,
                      petName: item.pet_name,
                      petPhoto: item.pet_photo ?? "",
                      shelterName: item.shelter_name ?? "",
                    },
                  })
                }
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Sizes.SPACING_LG, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.BORDER, backgroundColor: Colors.BACKGROUND }}
                activeOpacity={0.7}
              >
                <View style={{ marginRight: 14 }}>
                  {item.pet_photo ? (
                    <Image source={{ uri: item.pet_photo }} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.SURFACE }} />
                  ) : (
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 28 }}>{item.pet_tierart === "hund" ? "🐶" : "🐱"}</Text>
                    </View>
                  )}
                  <View style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.BACKGROUND }}>
                    <Text style={{ fontSize: 10 }}>❤️</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>{item.pet_name}</Text>
                    <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>{formatTime(item.last_message_at ?? item.created_at)}</Text>
                  </View>
                  <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>{item.shelter_name ?? t.matches_shelter_fallback}</Text>
                  <Text numberOfLines={1} style={{ fontSize: Sizes.FONT_SM, color: item.last_message ? Colors.TEXT : Colors.TEXT_MUTED, marginTop: 3, fontStyle: item.last_message ? "normal" : "italic" }}>
                    {item.last_message ?? t.matches_msg_placeholder_shelter}
                  </Text>
                </View>
                <Text style={{ color: Colors.TEXT_MUTED, marginLeft: 8, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            )}
          />
        )
      )}

      {/* Owner/Gassi Tab */}
      {tab === "owner" && (
        ownerMatches.length === 0 ? (
          <OwnerEmptyState />
        ) : (
          <FlatList
            data={ownerMatches}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={Colors.SECONDARY} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/matches/owner/[matchId]",
                    params: {
                      matchId: item.id,
                      petName: item.other_pet_name,
                      petPhoto: item.other_pet_photo ?? "",
                      ownerName: item.other_owner_name ?? "",
                      modus: item.modus,
                    },
                  })
                }
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: Sizes.SPACING_LG, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.BORDER, backgroundColor: Colors.BACKGROUND }}
                activeOpacity={0.7}
              >
                <View style={{ marginRight: 14 }}>
                  {item.other_pet_photo ? (
                    <Image source={{ uri: item.other_pet_photo }} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.SURFACE }} />
                  ) : (
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 28 }}>{item.other_pet_tierart === "hund" ? "🐶" : "🐱"}</Text>
                    </View>
                  )}
                  <View style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.SECONDARY, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.BACKGROUND }}>
                    <Text style={{ fontSize: 10 }}>{item.modus === "gassi" ? "G" : "D"}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>{item.other_pet_name}</Text>
                    <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>{formatTime(item.last_message_at ?? item.created_at)}</Text>
                  </View>
                  <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>
                    {`${item.other_owner_name ?? t.matches_owner_fallback} · ${item.modus === "gassi" ? t.matches_gassi_date : t.matches_spieldate}`}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: Sizes.FONT_SM, color: item.last_message ? Colors.TEXT : Colors.TEXT_MUTED, marginTop: 3, fontStyle: item.last_message ? "normal" : "italic" }}>
                    {item.last_message ?? t.matches_msg_placeholder_owner}
                  </Text>
                </View>
                <Text style={{ color: Colors.TEXT_MUTED, marginLeft: 8, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            )}
          />
        )
      )}
    </View>
  );
}

function AdoptionEmptyState() {
  const { t } = useLanguage();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>💔</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        {t.matches_empty_adoption_title}
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
        {t.matches_empty_adoption_sub}
      </Text>
    </View>
  );
}

function OwnerEmptyState() {
  const { t } = useLanguage();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🐾</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        {t.matches_empty_owner_title}
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
        {t.matches_empty_owner_sub}
      </Text>
    </View>
  );
}
