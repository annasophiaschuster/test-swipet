import { useCallback, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { useLanguage } from "../../contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedDog {
  id: string;
  name: string;
  photo: string | null;
}

interface ChatItem {
  matchId: string;
  petId: string;
  petName: string;
  petPhoto: string | null;
  adoptantId: string;
  adoptantName: string | null;
  adoptantPhoto: string | null;
  adoptantCity: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageIsMine: boolean;
  unreadCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(iso: string | null, lang: string): string {
  if (!iso) return "";
  const locale = lang === "en" ? "en-US" : "de-DE";
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return lang === "en" ? "Yesterday" : "Gestern";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

const AVATAR_COLORS = ["#E27289", "#5BBF8A", "#5A9EE0", "#F4A261", "#9B72CF", "#E2A27A"];

function InitialsAvatar({ name }: { name: string | null }) {
  const letters = (name ?? "?")
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colorIdx = (name ?? "?").charCodeAt(0) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[colorIdx];
  return (
    <View style={[styles.initialsCircle, { backgroundColor: color + "28" }]}>
      <Text style={[styles.initialsText, { color }]}>{letters}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TierheimAnfragenScreen() {
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();

  const [allDogs, setAllDogs]             = useState<MatchedDog[]>([]);
  const [allChats, setAllChats]           = useState<ChatItem[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilter, setActiveFilter]   = useState<null | "unread" | "favorited">(null);
  const [favorites, setFavorites]         = useState<Set<string>>(new Set());

  const channelRef    = useRef<RealtimeChannel | null>(null);
  const userIdRef     = useRef<string | null>(null);
  const lastFetchTime = useRef<number>(0);

  // ── Data ────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      // Favorites: immer laden (AsyncStorage, kein Netzwerk)
      AsyncStorage.getItem("chat_favorites").then((raw) => {
        if (raw) setFavorites(new Set(JSON.parse(raw)));
      });

      // Staleness Guard: Chat-Daten nur laden wenn > 5s alt
      if (Date.now() - lastFetchTime.current >= 5000) {
        load();
        lastFetchTime.current = Date.now();
      }

      // Realtime: neue Nachrichten (lokaler Update) + Match-Änderungen (Re-Fetch)
      supabase.auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id;
        if (!uid) return;

        channelRef.current = supabase
          .channel(`tierheim-anfragen-${uid}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "messages" },
            (payload) => {
              const msg = payload.new as {
                match_id: string; text: string;
                created_at: string; sender_id: string; match_type: string;
              };
              if (msg.match_type !== "adoption") return;
              setAllChats((prev) =>
                prev.map((chat) => {
                  if (chat.matchId !== msg.match_id) return chat;
                  return {
                    ...chat,
                    lastMessage:       msg.text,
                    lastMessageAt:     msg.created_at,
                    lastMessageIsMine: msg.sender_id === userIdRef.current,
                    unreadCount:
                      msg.sender_id !== userIdRef.current
                        ? chat.unreadCount + 1
                        : chat.unreadCount,
                  };
                })
              );
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "adoption_matches",
              filter: `shelter_id=eq.${uid}`,
            },
            () => load()
          )
          .subscribe();
      });

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }, [])
  );

  const toggleFavorite = async (matchId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      AsyncStorage.setItem("chat_favorites", JSON.stringify([...next]));
      return next;
    });
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) return;
      userIdRef.current = user.id;

      // Load ALL shelter dogs for the bubble strip
      const { data: petsData } = await supabase
        .from("pets")
        .select("id, name, pet_photos(url, position)")
        .eq("shelter_id", user.id)
        .order("created_at", { ascending: true });

      const dogs: MatchedDog[] = (petsData ?? []).map((p: any) => {
        const photos = ((p.pet_photos ?? []) as any[])
          .sort((a: any, b: any) => a.position - b.position);
        return { id: p.id, name: p.name, photo: photos[0]?.url ?? null };
      });
      setAllDogs(dogs);

      // Load accepted matches → chats
      const { data, error } = await supabase
        .from("adoption_matches")
        .select(`
          id, pet_id, adoptant_id,
          pet:pets(name, pet_photos(url, position)),
          adoptant:profiles!adoptant_id(name, city, avatar_url)
        `)
        .eq("shelter_id", user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const matchIds = (data ?? []).map((m: any) => m.id);

      // Bulk-fetch 1: all messages for these matches (to derive last message)
      const { data: allMsgs } = matchIds.length > 0
        ? await supabase
            .from("messages")
            .select("match_id, text, created_at, sender_id")
            .in("match_id", matchIds)
            .eq("match_type", "adoption")
            .order("created_at", { ascending: false })
        : { data: [] };

      // Bulk-fetch 2: all unread messages for these matches
      const { data: allUnread } = matchIds.length > 0
        ? await supabase
            .from("messages")
            .select("match_id, sender_id")
            .in("match_id", matchIds)
            .neq("sender_id", user.id)
        : { data: [] };

      // Group in JS: last message per match_id (already ordered desc, so first = last)
      const lastMsgMap: Record<string, { match_id: string; text: string; created_at: string; sender_id: string }> = {};
      for (const msg of allMsgs ?? []) {
        if (!lastMsgMap[msg.match_id]) lastMsgMap[msg.match_id] = msg;
      }

      // Group in JS: unread count per match_id
      const unreadMap: Record<string, number> = {};
      for (const msg of allUnread ?? []) {
        unreadMap[msg.match_id] = (unreadMap[msg.match_id] ?? 0) + 1;
      }

      console.log(`[anfragen] enriched ${matchIds.length} chats with 2 bulk queries`);

      const chats: ChatItem[] = (data ?? []).map((m: any) => {
        const petPhotos = ((m.pet?.pet_photos ?? []) as any[])
          .sort((a: any, b: any) => a.position - b.position);
        const lastMsg = lastMsgMap[m.id] ?? null;
        return {
          matchId:           m.id,
          petId:             m.pet_id ?? "",
          petName:           m.pet?.name ?? "Unbekannt",
          petPhoto:          petPhotos[0]?.url ?? null,
          adoptantId:        m.adoptant_id ?? "",
          adoptantName:      m.adoptant?.name ?? null,
          adoptantPhoto:     m.adoptant?.avatar_url ?? null,
          adoptantCity:      m.adoptant?.city ?? null,
          lastMessage:       lastMsg?.text ?? null,
          lastMessageAt:     lastMsg?.created_at ?? null,
          lastMessageIsMine: lastMsg?.sender_id === user.id,
          unreadCount:       unreadMap[m.id] ?? 0,
        };
      });

      setAllChats(chats);
    } catch (e) {
      console.error("TierheimAnfragenScreen.load", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const visibleChats = allChats
    .filter((c) => !selectedDogId || c.petId === selectedDogId)
    .filter((c) => activeFilter === "unread"    ? c.unreadCount > 0        : true)
    .filter((c) => activeFilter === "favorited" ? favorites.has(c.matchId) : true);

  const totalUnread = allChats.reduce((s, c) => s + c.unreadCount, 0);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDogPress = (dogId: string) =>
    setSelectedDogId((prev) => (prev === dogId ? null : dogId));

  const handleChatPress = (item: ChatItem) =>
    router.push({
      pathname: "/tierheim/chat/[matchId]",
      params: {
        matchId:       item.matchId,
        petName:       item.petName,
        petPhoto:      item.petPhoto ?? "",
        adoptantName:  item.adoptantName ?? "",
        adoptantPhoto: item.adoptantPhoto ?? "",
        petId:         item.petId,
        adoptantId:    item.adoptantId,
      },
    });

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.PRIMARY} size="large" />
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>

      {/* Gradient header — title + dogs strip */}
      <LinearGradient
        colors={[Colors.SECONDARY, Colors.PRIMARY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradientHeader, { paddingTop: insets.top }]}
      >
        {/* Title row */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Text style={styles.headerTitle}>Nachrichten</Text>
            {totalUnread > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={[styles.filterBtn, activeFilter !== null && styles.filterBtnActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={Colors.WHITE}
            />
          </TouchableOpacity>
        </View>

      {/* Filter modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Filter</Text>

            {([
              { key: "unread",    label: "Ungelesene Nachrichten" },
              { key: "favorited", label: "Favorisierte Nachrichten" },
            ] as const).map(({ key, label }) => {
              const active = activeFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setActiveFilter(active ? null : key);
                    setShowFilterModal(false);
                  }}
                  activeOpacity={0.7}
                  style={[styles.modalOption, active && styles.modalOptionActive]}
                >
                  <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                    {label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark" size={18} color={Colors.PRIMARY} />
                  )}
                </TouchableOpacity>
              );
            })}

            {activeFilter !== null && (
              <TouchableOpacity
                onPress={() => { setActiveFilter(null); setShowFilterModal(false); }}
                activeOpacity={0.7}
                style={styles.modalClear}
              >
                <Text style={styles.modalClearText}>Filter zurücksetzen</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

        {/* Dogs strip — inside gradient */}
        <View style={styles.stripWrap}>
        <Text style={[styles.stripLabel, { color: "rgba(255,255,255,0.75)" }]}>Hunde</Text>
        {allDogs.length === 0 ? (
          <Text style={styles.stripEmpty}>Noch keine Hunde angelegt</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripScroll}
          >
            {/* "Alle Hunde" bubble */}
            <TouchableOpacity
              onPress={() => setSelectedDogId(null)}
              activeOpacity={0.75}
              style={styles.dogWrap}
            >
              <View style={[styles.dogRing, selectedDogId === null && styles.dogRingActive]}>
                <View style={[styles.dogPhoto, styles.dogPhotoFallback]}>
                  <Text style={{ fontSize: 22 }}>🐾</Text>
                </View>
              </View>
              <Text
                numberOfLines={1}
                style={[styles.dogName, selectedDogId === null && styles.dogNameActive]}
              >
                Alle Hunde
              </Text>
            </TouchableOpacity>

            {allDogs.map((dog) => {
              const active = selectedDogId === dog.id;
              return (
                <TouchableOpacity
                  key={dog.id}
                  onPress={() => handleDogPress(dog.id)}
                  activeOpacity={0.75}
                  style={styles.dogWrap}
                >
                  <View style={[styles.dogRing, active && styles.dogRingActive]}>
                    {dog.photo ? (
                      <Image source={{ uri: dog.photo }} style={styles.dogPhoto} />
                    ) : (
                      <View style={[styles.dogPhoto, styles.dogPhotoFallback]}>
                        <Text style={{ fontSize: 26 }}>🐶</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.dogName, active && styles.dogNameActive]}
                  >
                    {dog.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        </View>
      </LinearGradient>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Chat list */}
      {visibleChats.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubble-ellipses-outline" size={52} color={Colors.BORDER} />
          <Text style={styles.emptyTitle}>
            {allChats.length === 0
              ? "Noch keine Chats"
              : selectedDogId
              ? "Keine Chats für diesen Hund"
              : "Noch keine aktiven Chats"}
          </Text>
          <Text style={styles.emptySub}>
            {allChats.length === 0
              ? "Sobald eine Anfrage angenommen wird, erscheint der Chat hier."
              : selectedDogId
              ? "Für diesen Hund gibt es noch keine angenommenen Anfragen."
              : "Sobald eine Anfrage angenommen wird, erscheint der Chat hier."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleChats}
          keyExtractor={(item) => item.matchId}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={Colors.PRIMARY}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleChatPress(item)}
              activeOpacity={0.7}
              style={[styles.chatRow, item.unreadCount > 0 && styles.chatRowUnread]}
            >
              {/* Adoptant avatar */}
              <View style={styles.avatarWrap}>
                {item.adoptantPhoto ? (
                  <Image source={{ uri: item.adoptantPhoto }} style={styles.avatar} />
                ) : (
                  <InitialsAvatar name={item.adoptantName} />
                )}
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {item.unreadCount > 9 ? "9+" : item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Text content */}
              <View style={styles.chatContent}>
                <View style={styles.chatTopRow}>
                  <Text style={[styles.chatName, item.unreadCount > 0 && styles.chatNameBold]}>
                    {item.adoptantName ?? "Unbekannt"}
                  </Text>
                  <Text style={styles.chatTime}>
                    {timeLabel(item.lastMessageAt, lang)}
                  </Text>
                </View>

                {/* Dog sub-label */}
                <Text style={styles.chatDog}>
                  🐾 {item.petName}
                  {item.adoptantCity ? `  ·  ${item.adoptantCity}` : ""}
                </Text>

                {/* Last message preview */}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.chatPreview,
                    item.unreadCount > 0 && styles.chatPreviewBold,
                    !item.lastMessage && styles.chatPreviewItalic,
                  ]}
                >
                  {item.lastMessageIsMine && item.lastMessage ? "Du: " : ""}
                  {item.lastMessage ?? "Neues Match — schreibe als Erstes!"}
                </Text>
              </View>

              {/* Right column: star (top) + unread dot (bottom) */}
              <View style={styles.rightCol}>
                <TouchableOpacity
                  onPress={() => toggleFavorite(item.matchId)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  style={[
                    styles.starBtn,
                    favorites.has(item.matchId) && styles.starBtnActive,
                  ]}
                >
                  <Ionicons
                    name={favorites.has(item.matchId) ? "star" : "star-outline"}
                    size={12}
                    color={favorites.has(item.matchId) ? "#F4A61E" : Colors.TEXT_MUTED}
                  />
                </TouchableOpacity>
                {item.unreadCount > 0
                  ? <View style={styles.unreadDot} />
                  : <View style={styles.unreadDotPlaceholder} />
                }
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },
  centered: { flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" },

  // Gradient header wrapper
  gradientHeader: {
    paddingTop: 0,
    paddingBottom: 14,
  },

  // Header title row
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.WHITE,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 99,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headerBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

  // Filter button
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  // Filter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.TEXT,
    marginBottom: 10,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.SURFACE,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  modalOptionActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.PRIMARY + "10",
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  modalOptionTextActive: { color: Colors.PRIMARY },
  modalClear: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalClearText: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
  },

  // Dogs strip
  stripWrap: { paddingBottom: 6 },
  stripLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  stripEmpty: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    paddingHorizontal: 20,
    fontStyle: "italic",
  },
  stripScroll: { paddingHorizontal: 16, gap: 14 },

  // Dog bubble
  dogWrap: { alignItems: "center", width: 72 },
  dogRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.4)",
    padding: 2,
    marginBottom: 5,
  },
  dogRingActive: { borderColor: Colors.WHITE },
  dogPhoto: { width: 60, height: 60, borderRadius: 30 },
  dogPhotoFallback: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  dogName: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  dogNameActive: { color: Colors.WHITE, fontWeight: "700" },

  divider: { height: 1, backgroundColor: Colors.BORDER },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.TEXT,
    textAlign: "center",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 21,
  },

  // Chat row
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
    backgroundColor: Colors.BACKGROUND,
  },
  chatRowUnread: { backgroundColor: "#FFF8FA" },

  // Avatar
  avatarWrap: { marginRight: 14, position: "relative" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.SURFACE,
  },
  initialsCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.PRIMARY + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: { fontSize: 18, fontWeight: "700", color: Colors.PRIMARY },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: Colors.BACKGROUND,
  },
  unreadBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },

  // Chat content
  chatContent: { flex: 1, gap: 2 },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: { fontSize: 15, fontWeight: "600", color: Colors.TEXT },
  chatNameBold: { fontWeight: "800" },
  chatTime: { fontSize: 11, color: Colors.TEXT_MUTED },
  chatDog: { fontSize: 12, color: Colors.TEXT_MUTED },
  chatPreview: { fontSize: 13, color: Colors.TEXT_MUTED },
  chatPreviewBold: { color: Colors.TEXT, fontWeight: "600" },
  chatPreviewItalic: { fontStyle: "italic" },

  // Right column (star + unread dot)
  rightCol: {
    width: 22,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: 2,
  },
  starBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  starBtnActive: {
    borderColor: "#F4A61E",
    backgroundColor: "#FFF8E7",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.PRIMARY,
  },
  unreadDotPlaceholder: {
    width: 9,
    height: 9,
  },
});
