import { useCallback, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

function InitialsAvatar({ name }: { name: string | null }) {
  const letters = (name ?? "?")
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={styles.initialsCircle}>
      <Text style={styles.initialsText}>{letters}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TierheimAnfragenScreen() {
  const { lang } = useLanguage();

  const [matchedDogs, setMatchedDogs]     = useState<MatchedDog[]>([]);
  const [allChats, setAllChats]           = useState<ChatItem[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      const chats: ChatItem[] = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const petPhotos = ((m.pet?.pet_photos ?? []) as any[])
            .sort((a: any, b: any) => a.position - b.position);

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

          return {
            matchId:           m.id,
            petId:             m.pet_id ?? "",
            petName:           m.pet?.name ?? "Unbekannt",
            petPhoto:          petPhotos[0]?.url ?? null,
            adoptantId:        m.adoptant_id ?? "",
            adoptantName:      m.adoptant?.name ?? null,
            adoptantPhoto:     m.adoptant?.avatar_url ?? null,
            adoptantCity:      m.adoptant?.city ?? null,
            lastMessage:       msgs?.[0]?.text ?? null,
            lastMessageAt:     msgs?.[0]?.created_at ?? null,
            lastMessageIsMine: msgs?.[0]?.sender_id === user.id,
            unreadCount:       unread ?? 0,
          };
        })
      );

      setAllChats(chats);

      // Unique dogs from accepted matches (preserve order)
      const seen = new Set<string>();
      const dogs: MatchedDog[] = [];
      for (const c of chats) {
        if (!seen.has(c.petId)) {
          seen.add(c.petId);
          dogs.push({ id: c.petId, name: c.petName, photo: c.petPhoto });
        }
      }
      setMatchedDogs(dogs);
    } catch (e) {
      console.error("TierheimAnfragenScreen.load", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const visibleChats = selectedDogId
    ? allChats.filter((c) => c.petId === selectedDogId)
    : allChats;

  const totalUnread = allChats.reduce((s, c) => s + c.unreadCount, 0);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDogPress = (dogId: string) =>
    setSelectedDogId((prev) => (prev === dogId ? null : dogId));

  const handleChatPress = (item: ChatItem) =>
    router.push({
      pathname: "/tierheim/chat/[matchId]",
      params: {
        matchId:      item.matchId,
        petName:      item.petName,
        petPhoto:     item.petPhoto ?? "",
        adoptantName: item.adoptantName ?? "",
        petId:        item.petId,
        adoptantId:   item.adoptantId,
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
    <SafeAreaView edges={["top"]} style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nachrichten</Text>
        {totalUnread > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* Matches strip */}
      <View style={styles.stripWrap}>
        <Text style={styles.stripLabel}>Matches</Text>
        {matchedDogs.length === 0 ? (
          <Text style={styles.stripEmpty}>Noch keine genehmigten Anfragen</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripScroll}
          >
            {matchedDogs.map((dog) => {
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

      {/* Divider */}
      <View style={styles.divider} />

      {/* Chat list */}
      {visibleChats.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubble-ellipses-outline" size={52} color={Colors.BORDER} />
          <Text style={styles.emptyTitle}>
            {allChats.length === 0
              ? "Noch keine Matches"
              : selectedDogId
              ? "Keine Chats für diesen Hund"
              : "Wähle einen Hund aus"}
          </Text>
          <Text style={styles.emptySub}>
            {allChats.length === 0
              ? "Wenn eine Anfrage genehmigt wird, erscheint sie hier."
              : selectedDogId
              ? "Für diesen Hund gibt es noch keine aktiven Gespräche."
              : "Tippe auf einen Hund oben, um seine Chats zu sehen."}
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

              {/* Unread dot */}
              {item.unreadCount > 0 && <View style={styles.unreadDot} />}
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.TEXT,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 99,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  headerBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

  // Matches strip
  stripWrap: { paddingBottom: 14 },
  stripLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  stripEmpty: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
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
    borderColor: Colors.BORDER,
    padding: 2,
    marginBottom: 5,
  },
  dogRingActive: { borderColor: Colors.PRIMARY },
  dogPhoto: { width: 60, height: 60, borderRadius: 30 },
  dogPhotoFallback: {
    backgroundColor: Colors.SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  dogName: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
    textAlign: "center",
  },
  dogNameActive: { color: Colors.PRIMARY, fontWeight: "700" },

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

  // Unread dot
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.PRIMARY,
    marginLeft: 8,
  },
});
