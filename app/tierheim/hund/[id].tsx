import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#CC96C1", "#5BBF8A", "#5A9EE0", "#F4A261", "#9B72CF", "#E2A27A"];

function InitialsAvatar({ name, size = 44 }: { name: string | null; size?: number }) {
  const letters = (name ?? "?")
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colorIdx = (name ?? "?").charCodeAt(0) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[colorIdx];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + "28",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color }}>{letters}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DogDetail {
  id: string;
  name: string;
  rasse: string | null;
  alter_jahre: number | null;
  alter_monate: number | null;
  geschlecht: string | null;
  groesse_kategorie: string | null;
  beschreibung: string | null;
  charakter_tags: string[] | null;
  kastriert: boolean | null;
  braucht_garten: boolean | null;
  vertraeglich_mit_tieren: boolean | null;
  kinderfreundlich: string | null;
  erfahrung_benoetigt: string | null;
  aktivitaetslevel: string | null;
  status: string;
  herkunft: string | null;
  gewicht: string | null;
  fell_typ: string | null;
  fell_farbe: string | null;
  hund_vertraeglich: boolean | null;
  katze_vertraeglich: boolean | null;
  kleintier_vertraeglich: boolean | null;
  stubenrein: boolean | null;
  leinenfuehrig: boolean | null;
  maulkorbpflicht: boolean | null;
  alleine_bleiben: string | null;
  geimpft: boolean | null;
  gechipt: boolean | null;
  entwurmt: boolean | null;
  erkrankungen: string | null;
  photos: { url: string; position: number }[];
}

interface AnfrageRow {
  id: string;
  status: string;
  created_at: string;
  adoptant_name: string | null;
  adoptant_city: string | null;
  pet_id: string | null;
  adoptant_id: string | null;
  pet_photo: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini UI components (detail view)
// ─────────────────────────────────────────────────────────────────────────────

function InfoSectionLabel({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginTop: 20, marginBottom: 10, gap: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: Colors.BORDER }} />
      <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.TEXT_MUTED, letterSpacing: 1.2, textTransform: "uppercase" }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: Colors.BORDER }} />
    </View>
  );
}

type InfoRow = {
  label: string;
  value: string | boolean | null | undefined;
  type?: "text" | "bool";
};

function InfoCard({ rows }: { rows: InfoRow[] }) {
  const visibleRows = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  if (visibleRows.length === 0) return null;
  return (
    <View style={{
      marginHorizontal: 20,
      backgroundColor: Colors.SURFACE,
      borderRadius: Sizes.RADIUS_LG,
      overflow: "hidden",
      marginBottom: 4,
    }}>
      {visibleRows.map((row, i) => {
        const isBool = row.type === "bool" || typeof row.value === "boolean";
        return (
          <View
            key={row.label}
            style={{
              flexDirection: "row", alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16, paddingVertical: 13,
              borderBottomWidth: i < visibleRows.length - 1 ? 1 : 0,
              borderBottomColor: Colors.BORDER,
            }}
          >
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, flex: 1 }}>{row.label}</Text>
            {isBool ? (
              <View style={{
                paddingHorizontal: 10, paddingVertical: 3, borderRadius: Sizes.RADIUS_FULL,
                backgroundColor: row.value ? Colors.SUCCESS + "22" : "#FFEBEE",
              }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: row.value ? Colors.SUCCESS : "#D32F2F" }}>
                  {row.value ? "Ja" : "Nein"}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.TEXT, textAlign: "right", maxWidth: "55%" }}>
                {String(row.value)}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatAlter(jahre?: number | null, monate?: number | null): string {
  if (jahre && jahre >= 1) return jahre === 1 ? `1 Jahr` : `${jahre} Jahre`;
  if (monate) return `${monate} Monate`;
  return "Welpe";
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Gestern";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: "#FFF9C4", color: "#B8860B", label: "Ausstehend" },
  accepted: { bg: Colors.SUCCESS + "22", color: Colors.SUCCESS, label: "Akzeptiert" },
  rejected: { bg: "#FFEBEE", color: "#D32F2F", label: "Abgelehnt" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HundDetailScreen() {
  const { t } = useLanguage();
  const { id, name: paramName } = useLocalSearchParams<{ id: string; name?: string }>();

  const [activeTab, setActiveTab] = useState<"infos" | "anfragen" | "nachrichten">("infos");
  const [dog, setDog] = useState<DogDetail | null>(null);
  const [anfragen, setAnfragen] = useState<AnfrageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadData();

    // Realtime: neue Anfragen + Statusänderungen für diesen Hund
    channelRef.current = supabase
      .channel(`tierheim-hund-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "adoption_matches",
          filter: `pet_id=eq.${id}`,
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      `${dogName} ${t.tierheim_dogs_delete_title}`,
      t.tierheim_dogs_delete_msg,
      [
        {
          text: t.tierheim_dogs_delete_btn,
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("pets").delete().eq("id", id);
              router.back();
            } catch (e) {
              console.error("handleDelete error", e);
            }
          },
        },
        { text: t.tierheim_dogs_cancel, style: "cancel" },
      ]
    );
  };

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setIsGuest(!user);

      // Load dog details
      const { data: petData } = await supabase
        .from("pets")
        .select("*, pet_photos(url, position)")
        .eq("id", id)
        .maybeSingle();

      if (petData) {
        const photos = ((petData.pet_photos as any[]) ?? []).sort(
          (a: any, b: any) => a.position - b.position
        );
        setDog({ ...petData, photos });
      }

      // Load adoption matches for this pet
      const { data: matchData } = await supabase
        .from("adoption_matches")
        .select(`
          id, status, created_at, pet_id, adoptant_id,
          adoptant:profiles!adoptant_id(name, city),
          pet:pets(pet_photos(url, position))
        `)
        .eq("pet_id", id)
        .order("created_at", { ascending: false });

      const matchIds = (matchData ?? []).map((m: any) => m.id);

      // Bulk-fetch last messages for all matches in one query
      const { data: bulkMsgs } = matchIds.length > 0
        ? await supabase
            .from("messages")
            .select("match_id, text, created_at, sender_id")
            .in("match_id", matchIds)
            .eq("match_type", "adoption")
            .order("created_at", { ascending: false })
        : { data: [] };

      // Group in JS: first entry per match_id = latest message (already ordered desc)
      const lastMsgMap: Record<string, { text: string; created_at: string }> = {};
      for (const msg of bulkMsgs ?? []) {
        if (!lastMsgMap[msg.match_id]) lastMsgMap[msg.match_id] = msg;
      }

      console.log(`[hund/${id}] enriched ${matchIds.length} anfragen with 1 bulk query`);

      const rows: AnfrageRow[] = (matchData ?? []).map((m: any) => {
        const photos = ((m.pet?.pet_photos as any[]) ?? []).sort(
          (a: any, b: any) => a.position - b.position
        );
        const lastMsg = lastMsgMap[m.id] ?? null;
        return {
          id: m.id,
          status: m.status ?? "pending",
          created_at: m.created_at,
          pet_id: m.pet_id ?? null,
          adoptant_id: m.adoptant_id ?? null,
          adoptant_name: m.adoptant?.name ?? null,
          adoptant_city: m.adoptant?.city ?? null,
          pet_photo: photos[0]?.url ?? null,
          last_message: lastMsg?.text ?? null,
          last_message_at: lastMsg?.created_at ?? null,
        };
      });

      setAnfragen(rows);
    } catch (e) {
      console.error("HundDetailScreen.loadData", e);
    } finally {
      setLoading(false);
    }
  };

  const dogName = dog?.name ?? paramName ?? "Hund";

  const handleStatusChange = async (matchId: string, newStatus: "accepted" | "rejected") => {
    setAnfragen((prev) =>
      prev.map((a) => (a.id === matchId ? { ...a, status: newStatus } : a))
    );
    await supabase
      .from("adoption_matches")
      .update({ status: newStatus })
      .eq("id", matchId);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.PRIMARY} size="large" />
      </View>
    );
  }

  // Messages tab: only anfragen with at least one message
  const mitNachrichten = anfragen.filter((a) => a.last_message !== null);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Gradient header */}
      <LinearGradient
        colors={[Colors.SECONDARY, Colors.PRIMARY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 20 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 }}
        >
          <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.8)" }}>‹</Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "500" }}>{t.tierheim_dog_back}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.WHITE }}>{dogName}</Text>

        {/* Tab buttons */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {(["infos", "anfragen", "nachrichten"] as const).map((tab) => {
            const label =
              tab === "infos" ? t.tierheim_dog_tab_infos :
              tab === "anfragen" ? t.tierheim_dog_tab_anfragen :
              t.tierheim_dog_tab_nachrichten;
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 7, borderRadius: Sizes.RADIUS_FULL,
                  backgroundColor: active ? Colors.WHITE : "rgba(255,255,255,0.2)",
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: "700",
                  color: active ? Colors.PRIMARY : Colors.WHITE,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Tab content */}
      {activeTab === "infos" && (
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

          {/* ── Photos ───────────────────────────────────────────── */}
          {dog?.photos && dog.photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ height: 240 }}
            >
              {dog.photos.map((p, i) => (
                <Image
                  key={i}
                  source={{ uri: p.url }}
                  style={{ width: 400, height: 240 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={{
              height: 180, backgroundColor: Colors.SURFACE,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 56 }}>🐶</Text>
            </View>
          )}

          {/* ── Status badge + Name ──────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
            {dog?.status && (() => {
              const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                verfuegbar: { label: "Verfügbar", bg: Colors.SUCCESS + "22", color: Colors.SUCCESS },
                reserviert: { label: "Reserviert", bg: "#FFF3E0", color: "#E65100" },
                vermittelt: { label: "Vermittelt", bg: Colors.PRIMARY + "22", color: Colors.PRIMARY },
              };
              const s = statusMap[dog.status] ?? statusMap.verfuegbar;
              return (
                <View style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10, paddingVertical: 3,
                  borderRadius: Sizes.RADIUS_FULL,
                  backgroundColor: s.bg, marginBottom: 6,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: s.color }}>{s.label}</Text>
                </View>
              );
            })()}
            <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.TEXT }}>{dogName}</Text>
          </View>

          {/* ── BASISDATEN ───────────────────────────────────────── */}
          <InfoSectionLabel label="Basisdaten" />
          <InfoCard rows={[
            { label: "Rasse", value: dog?.rasse },
            { label: "Alter", value: dog ? formatAlter(dog.alter_jahre, dog.alter_monate) : null },
            { label: "Geschlecht", value: dog?.geschlecht === "maennlich" ? "Männlich" : dog?.geschlecht === "weiblich" ? "Weiblich" : null },
            { label: "Größe", value: dog?.groesse_kategorie ? ({ klein: "Klein", mittel: "Mittel", gross: "Groß", riese: "Riese" } as any)[dog.groesse_kategorie] : null },
            { label: "Gewicht", value: dog?.gewicht ? `${dog.gewicht} kg` : null },
            { label: "Herkunft", value: dog?.herkunft ? ({ abgabetier: "Abgabetier", fundtier: "Fundtier", auslandsrettung: "Auslandsrettung", beschlagnahmt: "Beschlagnahmt" } as any)[dog.herkunft] ?? dog.herkunft : null },
            { label: "Fell", value: [dog?.fell_typ, dog?.fell_farbe].filter(Boolean).join(", ") || null },
          ]} />

          {/* ── CHARAKTER ────────────────────────────────────────── */}
          <InfoSectionLabel label="Charakter" />
          {dog?.charakter_tags && dog.charakter_tags.length > 0 && (
            <View style={{ paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {dog.charakter_tags.map((tag) => (
                <View key={tag} style={{
                  paddingHorizontal: 12, paddingVertical: 5,
                  borderRadius: Sizes.RADIUS_FULL,
                  backgroundColor: Colors.PRIMARY + "18",
                }}>
                  <Text style={{ fontSize: 13, color: Colors.PRIMARY, fontWeight: "700" }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <InfoCard rows={[
            { label: "Kinderfreundlich", value: dog?.kinderfreundlich ? ({ ja: "Ja", nein: "Nein", ab_schulalter: "Ab Schulalter", ab_teenager: "Ab Teenager" } as any)[dog.kinderfreundlich] ?? dog.kinderfreundlich : null },
            { label: "Aktivitätslevel", value: dog?.aktivitaetslevel ? ({ sportlich: "Sehr aktiv", mittel: "Mittel", ruhig: "Gemütlich" } as any)[dog.aktivitaetslevel] ?? dog.aktivitaetslevel : null },
            { label: "Erfahrung", value: dog?.erfahrung_benoetigt ? ({ anfaenger: "Anfänger geeignet", fortgeschritten: "Fortgeschrittene", profi: "Nur Profis" } as any)[dog.erfahrung_benoetigt] ?? dog.erfahrung_benoetigt : null },
          ]} />

          {/* ── VERTRÄGLICHKEIT & HALTUNG ────────────────────────── */}
          <InfoSectionLabel label="Verträglichkeit & Haltung" />
          <InfoCard rows={[
            { label: "Verträglich mit Hunden", value: dog?.hund_vertraeglich, type: "bool" },
            { label: "Verträglich mit Katzen", value: dog?.katze_vertraeglich, type: "bool" },
            { label: "Verträglich mit Kleintieren", value: dog?.kleintier_vertraeglich, type: "bool" },
            { label: "Stubenrein", value: dog?.stubenrein, type: "bool" },
            { label: "Leinenführig", value: dog?.leinenfuehrig, type: "bool" },
            { label: "Maulkorbpflicht", value: dog?.maulkorbpflicht, type: "bool" },
            { label: "Braucht Garten", value: dog?.braucht_garten, type: "bool" },
            { label: "Alleine bleiben", value: dog?.alleine_bleiben ? ({ nicht_moeglich: "Nicht möglich", bis_2h: "Bis 2 Std.", bis_4h: "Bis 4 Std.", bis_6h: "Bis 6 Std." } as any)[dog.alleine_bleiben] ?? dog.alleine_bleiben : null },
          ]} />

          {/* ── GESUNDHEIT ───────────────────────────────────────── */}
          <InfoSectionLabel label="Gesundheit" />
          <InfoCard rows={[
            { label: "Geimpft", value: dog?.geimpft, type: "bool" },
            { label: "Gechipt", value: dog?.gechipt, type: "bool" },
            { label: "Kastriert", value: dog?.kastriert, type: "bool" },
            { label: "Entwurmt", value: dog?.entwurmt, type: "bool" },
            { label: "Bekannte Erkrankungen", value: dog?.erkrankungen ?? "Keine" },
          ]} />

          {/* ── BESCHREIBUNG ─────────────────────────────────────── */}
          {dog?.beschreibung && (
            <>
              <InfoSectionLabel label="Beschreibung" />
              <View style={{ marginHorizontal: 20, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_LG, padding: 16, marginBottom: 8 }}>
                <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 24 }}>{dog.beschreibung}</Text>
              </View>
            </>
          )}

          {/* Delete button – only for logged-in shelter staff */}
          {!isGuest && (
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                marginTop: 8, height: 46, borderRadius: Sizes.RADIUS_FULL,
                borderWidth: 1.5, borderColor: "#FFCDD2",
                backgroundColor: "#FFF5F5",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: "#D32F2F", fontWeight: "600" }}>
                {t.tierheim_dogs_delete_full}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {activeTab === "anfragen" && (
        anfragen.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, textAlign: "center" }}>{t.tierheim_dog_no_requests}</Text>
          </View>
        ) : (
          <FlatList
            data={anfragen}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
              const isPending = item.status === "pending";
              return (
                <View style={{
                  paddingHorizontal: Sizes.SPACING_LG, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
                }}>
                  {/* Top row: avatar + name + badge + time */}
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: "/tierheim/chat/[matchId]",
                      params: {
                        matchId: item.id,
                        petName: dogName,
                        petPhoto: item.pet_photo ?? "",
                        adoptantName: item.adoptant_name ?? "",
                        adoptantPhoto: "",
                        petId: item.pet_id ?? "",
                        adoptantId: item.adoptant_id ?? "",
                      },
                    })}
                    activeOpacity={0.7}
                    style={{ flexDirection: "row", alignItems: "center", marginBottom: isPending ? 12 : 0 }}
                  >
                    <View style={{ marginRight: 12 }}>
                      <InitialsAvatar name={item.adoptant_name} size={44} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
                        {item.adoptant_name ?? "Unbekannt"}
                      </Text>
                      {item.adoptant_city && (
                        <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                          {item.adoptant_city}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderRadius: Sizes.RADIUS_FULL,
                        backgroundColor: badge.bg,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: badge.color }}>{badge.label}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Accept / Reject buttons — only for pending */}
                  {isPending && (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => handleStatusChange(item.id, "accepted")}
                        activeOpacity={0.75}
                        style={{
                          flex: 1, paddingVertical: 9, borderRadius: Sizes.RADIUS_FULL,
                          backgroundColor: Colors.SUCCESS,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFF" }}>Annehmen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleStatusChange(item.id, "rejected")}
                        activeOpacity={0.75}
                        style={{
                          flex: 1, paddingVertical: 9, borderRadius: Sizes.RADIUS_FULL,
                          backgroundColor: "#FFEBEE",
                          alignItems: "center",
                          borderWidth: 1, borderColor: "#D32F2F",
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#D32F2F" }}>Ablehnen</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )
      )}

      {activeTab === "nachrichten" && (
        mitNachrichten.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, textAlign: "center" }}>{t.tierheim_dog_no_messages}</Text>
          </View>
        ) : (
          <FlatList
            data={mitNachrichten}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
              return (
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: "/tierheim/chat/[matchId]",
                    params: {
                      matchId: item.id,
                      petName: dogName,
                      petPhoto: item.pet_photo ?? "",
                      adoptantName: item.adoptant_name ?? "",
                      adoptantPhoto: "",
                      petId: item.pet_id ?? "",
                      adoptantId: item.adoptant_id ?? "",
                    },
                  })}
                  style={{
                    flexDirection: "row", alignItems: "center",
                    paddingHorizontal: Sizes.SPACING_LG, paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ marginRight: 12 }}>
                    <InitialsAvatar name={item.adoptant_name} size={44} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
                      {item.adoptant_name ?? "Unbekannt"}
                    </Text>
                    {item.last_message && (
                      <Text numberOfLines={1} style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                        {item.last_message}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3,
                      borderRadius: Sizes.RADIUS_FULL,
                      backgroundColor: badge.bg,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: badge.color }}>{badge.label}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>
                      {formatTime(item.last_message_at ?? item.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )
      )}
    </View>
  );
}
