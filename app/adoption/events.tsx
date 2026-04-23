import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import GradientHeader from "../../components/GradientHeader";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WalkItem {
  id: string;
  ort: string;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number | null;
  max_teilnehmer: number;
  persoenlicher_text: string | null;
  organizer_name: string | null;
  participant_count: number;
  my_status: string | null;
}

type FilterType = "all" | "joined";

function formatDateDE(iso: string, lang: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(lang === "en" ? "en-US" : "de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function AdoptionEventsScreen() {
  const { t, lang } = useLanguage();

  const [walks, setWalks]         = useState<WalkItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId]       = useState<string | null>(null);
  const [isGuest, setIsGuest]     = useState(false);
  const [filter, setFilter]       = useState<FilterType>("all");

  useFocusEffect(
    useCallback(() => {
      loadWalks();
    }, [])
  );

  const loadWalks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);
      setIsGuest(!uid);

      const { data, error } = await supabase
        .from("walks")
        .select(`
          id, ort, datum, uhrzeit, dauer_minuten, max_teilnehmer, persoenlicher_text,
          organizer:profiles!ersteller_id(name),
          teilnehmer:walk_teilnehmer(user_id, status)
        `)
        .order("datum", { ascending: true })
        .order("uhrzeit", { ascending: true });

      if (error) throw error;

      const items: WalkItem[] = (data ?? []).map((w: any) => {
        const teilnehmer: { user_id: string; status: string }[] = w.teilnehmer ?? [];
        const myEntry = uid ? teilnehmer.find((te) => te.user_id === uid) : null;
        return {
          id: w.id,
          ort: w.ort,
          datum: w.datum,
          uhrzeit: w.uhrzeit,
          dauer_minuten: w.dauer_minuten,
          max_teilnehmer: w.max_teilnehmer,
          persoenlicher_text: w.persoenlicher_text,
          organizer_name: w.organizer?.name ?? null,
          participant_count: teilnehmer.filter((te) => te.status === "angenommen").length,
          my_status: myEntry?.status ?? null,
        };
      });

      setWalks(items);
    } catch (e) {
      console.error("AdoptionEventsScreen.loadWalks", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoin = async (walk: WalkItem) => {
    if (isGuest) { Alert.alert("", t.walks_guest_join_msg); return; }
    if (!userId) return;
    try {
      await supabase.from("walk_teilnehmer").upsert(
        { walk_id: walk.id, user_id: userId, status: "angenommen" },
        { onConflict: "walk_id,user_id" }
      );
      loadWalks();
    } catch (e) {
      console.error("handleJoin error", e);
    }
  };

  const handleLeave = async (walk: WalkItem) => {
    if (!userId) return;
    try {
      await supabase
        .from("walk_teilnehmer")
        .delete()
        .eq("walk_id", walk.id)
        .eq("user_id", userId);
      loadWalks();
    } catch (e) {
      console.error("handleLeave error", e);
    }
  };

  const filteredWalks = filter === "joined"
    ? walks.filter((w) => w.my_status === "angenommen")
    : walks;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader title={t.walks_title} />

      {/* Filter Chips */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: Sizes.SPACING_LG, paddingVertical: 10 }}>
        {(["all", "joined"] as FilterType[]).map((f) => {
          const active = filter === f;
          const label = f === "all" ? t.walks_filter_all : t.walks_filter_joined;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99,
                backgroundColor: active ? Colors.PRIMARY : Colors.SURFACE,
                borderWidth: 1, borderColor: active ? Colors.PRIMARY : Colors.BORDER,
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: active ? "700" : "500",
                color: active ? Colors.WHITE : Colors.TEXT_MUTED,
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.PRIMARY} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredWalks}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadWalks(true)} tintColor={Colors.PRIMARY} />
          }
          contentContainerStyle={{ paddingHorizontal: Sizes.SPACING_LG, paddingTop: 4, paddingBottom: 32, gap: 10 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 52, marginBottom: 16 }}>📅</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
                {t.walks_empty_title}
              </Text>
              <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
                {t.info_events_coming_soon_sub}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const joined = item.my_status === "angenommen";
            const full = item.participant_count >= item.max_teilnehmer && !joined;
            return (
              <View style={{
                backgroundColor: Colors.WHITE,
                borderRadius: Sizes.RADIUS_LG,
                borderWidth: 1,
                borderColor: joined ? Colors.PRIMARY + "50" : Colors.BORDER,
                padding: 16,
                shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.PRIMARY }}>
                      📅 {formatDateDE(item.datum, lang)}
                    </Text>
                    <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED }}>
                      🕐 {item.uhrzeit.slice(0, 5)}
                      {item.dauer_minuten ? ` · ${item.dauer_minuten} ${t.walks_min_abbr}` : ""}
                    </Text>
                  </View>
                  {joined && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: Colors.SUCCESS + "20" }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: Colors.SUCCESS }}>✓ {t.walks_joined_label}</Text>
                    </View>
                  )}
                </View>

                <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.TEXT, marginBottom: 2 }}>
                  📍 {item.ort}
                </Text>

                {item.persoenlicher_text && (
                  <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>
                    {item.persoenlicher_text}
                  </Text>
                )}

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>
                    👥 {t.walks_participants(item.participant_count)}{item.max_teilnehmer ? ` / ${item.max_teilnehmer}` : ""}
                    {item.organizer_name ? ` · ${item.organizer_name}` : ""}
                  </Text>

                  <TouchableOpacity
                    onPress={() => joined ? handleLeave(item) : handleJoin(item)}
                    disabled={full}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 7, borderRadius: 99,
                      backgroundColor: joined ? Colors.SURFACE : full ? Colors.BORDER : Colors.PRIMARY,
                      borderWidth: 1,
                      borderColor: joined ? Colors.BORDER : full ? Colors.BORDER : Colors.PRIMARY,
                    }}
                  >
                    <Text style={{
                      fontSize: 13, fontWeight: "700",
                      color: joined ? Colors.TEXT_MUTED : full ? Colors.TEXT_MUTED : Colors.WHITE,
                    }}>
                      {joined ? t.walks_leave_btn : t.walks_join_btn}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
