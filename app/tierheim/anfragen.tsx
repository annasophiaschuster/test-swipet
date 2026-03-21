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

interface AnfrageItem {
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

// Demo items shown when user is not logged in
const DEMO_ANFRAGEN: AnfrageItem[] = [
  {
    id: "demo-1",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    pet_name: "Buddy",
    pet_tierart: "hund",
    pet_photo: null,
    adoptant_name: "Anna M.",
    last_message: "Hallo! Wir würden Buddy gerne kennenlernen.",
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
    last_message_is_mine: false,
    unread_count: 2,
  },
  {
    id: "demo-2",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    pet_name: "Luna",
    pet_tierart: "hund",
    pet_photo: null,
    adoptant_name: "Tom K.",
    last_message: "Wann können wir vorbeikommen?",
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    last_message_is_mine: false,
    unread_count: 0,
  },
];

export default function TierheimAnfragenScreen() {
  const [anfragen, setAnfragen] = useState<AnfrageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setAnfragen(DEMO_ANFRAGEN);
        setTotalUnread(2);
        return;
      }

      setIsGuest(false);

      const { data, error } = await supabase
        .from("adoption_matches")
        .select(
          `
          id, pet_id, created_at,
          pet:pets(name, tierart, pet_photos(url, position)),
          adoptant:profiles!adoptant_id(name)
        `
        )
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

          const photos = ((m.pet?.pet_photos as any[]) ?? []).sort(
            (a, b) => a.position - b.position
          );

          return {
            id: m.id,
            created_at: m.created_at,
            pet_name: m.pet?.name ?? "Unbekannt",
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

      setAnfragen(items);
      setTotalUnread(items.reduce((sum, i) => sum + i.unread_count, 0));
    } catch (e) {
      console.error("loadAnfragen error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0)
      return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Gestern";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.BACKGROUND,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
          borderBottomWidth: 1,
          borderBottomColor: Colors.BORDER,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>❤️ Anfragen</Text>
            {totalUnread > 0 && (
              <View
                style={{
                  backgroundColor: Colors.PRIMARY,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "700" }}>
                  {totalUnread}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: 12, marginTop: 2 }}>
            {anfragen.length} Interessent{anfragen.length !== 1 ? "en" : ""}
          </Text>
        </View>
      </View>

      {/* Demo banner */}
      {isGuest && (
        <View
          style={{
            marginHorizontal: Sizes.SPACING_LG,
            marginTop: Sizes.SPACING_MD,
            padding: 12,
            backgroundColor: "#FFF8F0",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#F0956A40",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 16 }}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.TEXT }}>Demo-Ansicht</Text>
            <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
              Melde dich an für echte Anfragen
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{ backgroundColor: Colors.PRIMARY, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {anfragen.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>💌</Text>
          <Text
            style={{
              fontSize: Sizes.FONT_XL,
              fontWeight: "700",
              color: Colors.TEXT,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Noch keine Anfragen
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
            Sobald jemand eines eurer Tiere liked, erscheint hier eine Anfrage.
          </Text>
        </View>
      ) : (
        <FlatList
          data={anfragen}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAnfragen(true)}
              tintColor={Colors.PRIMARY}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (isGuest) {
                  router.push("/auth/login");
                  return;
                }
                router.push({
                  pathname: "/tierheim/chat/[matchId]",
                  params: {
                    matchId: item.id,
                    petName: item.pet_name,
                    petPhoto: item.pet_photo ?? "",
                    adoptantName: item.adoptant_name ?? "Interessent",
                  },
                });
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: Sizes.SPACING_LG,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: Colors.BORDER,
              }}
              activeOpacity={0.7}
            >
              {/* Pet avatar */}
              <View style={{ marginRight: 14 }}>
                {item.pet_photo ? (
                  <Image
                    source={{ uri: item.pet_photo }}
                    style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.SURFACE }}
                  />
                ) : (
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 29,
                      backgroundColor: Colors.SURFACE,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>🐶</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <Text
                    style={{
                      fontSize: Sizes.FONT_MD,
                      fontWeight: item.unread_count > 0 ? "800" : "700",
                      color: Colors.TEXT,
                    }}
                  >
                    {item.pet_name}
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                    {formatTime(item.last_message_at ?? item.created_at)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>
                  von {item.adoptant_name ?? "Unbekannt"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 3,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontSize: Sizes.FONT_SM,
                      color: item.last_message
                        ? item.unread_count > 0
                          ? Colors.TEXT
                          : Colors.TEXT_MUTED
                        : Colors.TEXT_MUTED,
                      fontStyle: item.last_message ? "normal" : "italic",
                      fontWeight: item.unread_count > 0 ? "600" : "400",
                    }}
                  >
                    {item.last_message_is_mine ? "Du: " : ""}
                    {item.last_message ?? "Neuer Match — schreib eine Begrüßung!"}
                  </Text>
                  {item.unread_count > 0 && (
                    <View
                      style={{
                        backgroundColor: Colors.PRIMARY,
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 4,
                        marginLeft: 8,
                      }}
                    >
                      <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "700" }}>
                        {item.unread_count}
                      </Text>
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
