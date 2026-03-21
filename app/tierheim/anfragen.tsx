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

const DEMO_ANFRAGEN: AnfrageItem[] = [
  {
    id: "demo-1",
    status: "pending",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    pet_name: "Buddy",
    pet_tierart: "hund",
    pet_photo: null,
    adoptant_name: "Anna M.",
    adoptant_city: "München",
    last_message: "Hallo! Wir würden Buddy gerne kennenlernen.",
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
    adoptant_name: "Tom K.",
    adoptant_city: "Hamburg",
    last_message: "Wann können wir vorbeikommen?",
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
    adoptant_name: "Julia S.",
    adoptant_city: "Berlin",
    last_message: null,
    last_message_at: null,
    last_message_is_mine: false,
    unread_count: 0,
  },
];

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Gestern";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: Colors.WARNING + "22",   color: "#B8860B", label: "Ausstehend" },
  accepted: { bg: Colors.SUCCESS + "22",   color: Colors.SUCCESS, label: "Angenommen" },
  rejected: { bg: Colors.ERROR   + "22",   color: Colors.ERROR,   label: "Abgelehnt"  },
};

export default function TierheimAnfragenScreen() {
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
      Alert.alert("Demo-Ansicht", "Melde dich an um Anfragen zu bearbeiten.");
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
      Alert.alert("Demo-Ansicht", "Melde dich an um Anfragen zu bearbeiten.");
      return;
    }
    Alert.alert(
      "Anfrage ablehnen",
      `Anfrage von ${anfrage.adoptant_name ?? "Unbekannt"} für ${anfrage.pet_name} ablehnen?`,
      [
        {
          text: "Ablehnen",
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
        { text: "Abbrechen", style: "cancel" },
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>🔔 Anfragen</Text>
          {totalUnread > 0 && (
            <View style={{
              backgroundColor: Colors.PRIMARY, borderRadius: 10,
              minWidth: 20, height: 20,
              alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
            }}>
              <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "700" }}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: 12, marginTop: 2 }}>
          {anfragen.length} Interessent{anfragen.length !== 1 ? "en" : ""}
        </Text>
      </View>


      {anfragen.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>💌</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
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
                        adoptantName: item.adoptant_name ?? "Interessent",
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
                          {formatTime(item.last_message_at ?? item.created_at)}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginBottom: 3 }}>
                      von {item.adoptant_name ?? "Unbekannt"}
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
                      {item.last_message_is_mine ? "Du: " : ""}
                      {item.last_message ?? "Neuer Match — schreib eine Begrüßung!"}
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
                      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.ERROR }}>✕ Ablehnen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAccept(item)}
                      style={{
                        flex: 1, height: 36, borderRadius: 99,
                        backgroundColor: Colors.SUCCESS,
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.WHITE }}>✓ Annehmen</Text>
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
