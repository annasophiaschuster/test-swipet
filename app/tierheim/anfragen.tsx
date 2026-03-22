import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import GradientHeader from "../../components/GradientHeader";
import { useLanguage } from "../../contexts/LanguageContext";

interface AnfrageItem {
  id: string;
  status: string;
  created_at: string;
  pet_name: string;
  pet_tierart: string;
  pet_photo: string | null;
  adoptant_name: string | null;
  adoptant_city: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_is_mine: boolean;
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

export default function TierheimAnfragenScreen() {
  const { t, lang } = useLanguage();

  const DEMO_ANFRAGEN: AnfrageItem[] = [
    {
      id: "demo-1",
      status: "pending",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      pet_name: "Buddy",
      pet_tierart: "hund",
      pet_photo: null,
      adoptant_name: t.tierheim_req_demo_name1,
      adoptant_city: t.tierheim_req_demo_city1,
      last_message: t.tierheim_req_demo_msg1,
      last_message_at: new Date(Date.now() - 3600000).toISOString(),
      last_message_is_mine: false,
      unread_count: 2,
    },
    {
      id: "demo-2",
      status: "accepted",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      pet_name: "Luna",
      pet_tierart: "hund",
      pet_photo: null,
      adoptant_name: t.tierheim_req_demo_name2,
      adoptant_city: t.tierheim_req_demo_city2,
      last_message: t.tierheim_req_demo_msg2,
      last_message_at: new Date(Date.now() - 86400000).toISOString(),
      last_message_is_mine: false,
      unread_count: 0,
    },
    {
      id: "demo-3",
      status: "pending",
      created_at: new Date(Date.now() - 172800000).toISOString(),
      pet_name: "Max",
      pet_tierart: "hund",
      pet_photo: null,
      adoptant_name: t.tierheim_req_demo_name3,
      adoptant_city: t.tierheim_req_demo_city3,
      last_message: null,
      last_message_at: null,
      last_message_is_mine: false,
      unread_count: 0,
    },
  ];

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: Colors.WARNING + "22",   color: "#B8860B", label: t.tierheim_req_pending },
    accepted: { bg: Colors.SUCCESS + "22",   color: Colors.SUCCESS, label: t.tierheim_req_accepted },
    rejected: { bg: Colors.ERROR   + "22",   color: Colors.ERROR,   label: t.tierheim_req_rejected },
  };

  const [anfragen, setAnfragen]   = useState<AnfrageItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]     = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadAnfragen();
    }, [])
  );

  const loadAnfragen = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setAnfragen(DEMO_ANFRAGEN);
        setTotalUnread(2);
        return;
      }

      setIsGuest(false);

      const { data, error } = await supabase
        .from("adoption_matches")
        .select(`
          id, status, created_at,
          pet:pets(name, tierart, pet_photos(url, position)),
          adoptant:profiles!adoptant_id(name, city)
        `)
        .eq("shelter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: AnfrageItem[] = await Promise.all(
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

          const photos = ((m.pet?.pet_photos as any[]) ?? []).sort((a, b) => a.position - b.position);

          return {
            id: m.id,
            status: m.status ?? "pending",
            created_at: m.created_at,
            pet_name: m.pet?.name ?? "Unbekannt",
            pet_tierart: m.pet?.tierart ?? "hund",
            pet_photo: photos[0]?.url ?? null,
            adoptant_name: m.adoptant?.name ?? null,
            adoptant_city: m.adoptant?.city ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
            last_message_is_mine: msgs?.[0]?.sender_id === user.id,
            unread_count: unread ?? 0,
          };
        })
      );

      setAnfragen(items);
      setTotalUnread(items.reduce((sum, i) => sum + i.unread_count, 0));
    } catch (e) {
      console.error("TierheimAnfragenScreen.loadAnfragen", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (anfrage: AnfrageItem) => {
    if (isGuest) {
      Alert.alert(t.tierheim_req_demo_view, t.tierheim_req_demo_login_msg);
      return;
    }
    try {
      await supabase
        .from("adoption_matches")
        .update({ status: "accepted" })
        .eq("id", anfrage.id);
      loadAnfragen();
    } catch (e) {
      console.error("handleAccept error", e);
    }
  };

  const handleReject = async (anfrage: AnfrageItem) => {
    if (isGuest) {
      Alert.alert(t.tierheim_req_demo_view, t.tierheim_req_demo_login_msg);
      return;
    }
    Alert.alert(
      t.tierheim_req_reject_title,
      `${t.tierheim_req_from} ${anfrage.adoptant_name ?? t.tierheim_req_unknown} ${t.tierheim_req_reject_title.toLowerCase()} ${anfrage.pet_name}?`,
      [
        {
          text: t.tierheim_req_reject_btn.replace("✕ ", ""),
          style: "destructive",
          onPress: async () => {
            try {
              await supabase
                .from("adoption_matches")
                .update({ status: "rejected" })
                .eq("id", anfrage.id);
              loadAnfragen();
            } catch (e) {
              console.error("handleReject error", e);
            }
          },
        },
        { text: t.tierheim_req_cancel, style: "cancel" },
      ]
    );
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
        title="🔔 Anfragen"
        subtitle={`${anfragen.length} ${anfragen.length !== 1 ? t.tierheim_req_subtitle_plural : t.tierheim_req_subtitle_singular}`}
        showBack
        backLabel={t.comp_switch_modes}
        onBack={() => router.replace("/")}
        rightElement={totalUnread > 0 ? (
          <View style={{
            backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 12,
            minWidth: 24, height: 24,
            alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
          }}>
            <Text style={{ color: Colors.WHITE, fontSize: 12, fontWeight: "700" }}>{totalUnread}</Text>
          </View>
        ) : undefined}
      />


      {anfragen.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>💌</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            {t.tierheim_req_empty_title}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
            {t.tierheim_req_empty_sub}
          </Text>
        </View>
      ) : (
        <FlatList
          data={anfragen}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAnfragen(true)} tintColor={Colors.PRIMARY} />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;

            return (
              <View style={{
                borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
                backgroundColor: item.unread_count > 0 ? "#FFF8FA" : Colors.BACKGROUND,
              }}>
                {/* Main row */}
                <TouchableOpacity
                  onPress={() => {
                    if (isGuest) { router.push("/auth/login"); return; }
                    router.push({
                      pathname: "/tierheim/chat/[matchId]",
                      params: {
                        matchId: item.id,
                        petName: item.pet_name,
                        petPhoto: item.pet_photo ?? "",
                        adoptantName: item.adoptant_name ?? t.tierheim_req_guest_nav,
                      },
                    });
                  }}
                  style={{
                    flexDirection: "row", alignItems: "center",
                    paddingHorizontal: Sizes.SPACING_LG, paddingTop: 14, paddingBottom: 10,
                  }}
                  activeOpacity={0.7}
                >
                  {/* Pet avatar */}
                  <View style={{ marginRight: 14 }}>
                    {item.pet_photo ? (
                      <Image
                        source={{ uri: item.pet_photo }}
                        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.SURFACE }}
                      />
                    ) : (
                      <View style={{
                        width: 56, height: 56, borderRadius: 28,
                        backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ fontSize: 24 }}>🐶</Text>
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
                          {item.unread_count}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: item.unread_count > 0 ? "800" : "700", color: Colors.TEXT }}>
                        {item.pet_name}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{
                          backgroundColor: statusStyle.bg,
                          paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: statusStyle.color }}>
                            {statusStyle.label}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                          {formatTime(item.last_message_at ?? item.created_at, t.tierheim_req_yesterday, lang)}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginBottom: 3 }}>
                      {t.tierheim_req_from} {item.adoptant_name ?? t.tierheim_req_unknown}
                      {item.adoptant_city ? ` · ${item.adoptant_city}` : ""}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: Sizes.FONT_SM,
                        color: item.last_message
                          ? item.unread_count > 0 ? Colors.TEXT : Colors.TEXT_MUTED
                          : Colors.TEXT_MUTED,
                        fontStyle: item.last_message ? "normal" : "italic",
                        fontWeight: item.unread_count > 0 ? "600" : "400",
                      }}
                    >
                      {item.last_message_is_mine ? t.tierheim_req_you : ""}
                      {item.last_message ?? t.tierheim_req_new_match}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Accept / Decline buttons — only for pending */}
                {item.status === "pending" && (
                  <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => handleReject(item)}
                      style={{
                        flex: 1, height: 36, borderRadius: 99,
                        borderWidth: 1.5, borderColor: Colors.ERROR,
                        alignItems: "center", justifyContent: "center",
                        backgroundColor: Colors.ERROR + "10",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.ERROR }}>{t.tierheim_req_reject_btn}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAccept(item)}
                      style={{
                        flex: 1, height: 36, borderRadius: 99,
                        backgroundColor: Colors.SUCCESS,
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.WHITE }}>{t.tierheim_req_accept_btn}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
