import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

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
  kinderfreundlich: boolean | null;
  erfahrung_benoetigt: boolean | null;
  aktivitaetslevel: string | null;
  status: string;
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

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

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

      const rows: AnfrageRow[] = await Promise.all(
        (matchData ?? []).map(async (m: any) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("text, created_at, sender_id")
            .eq("match_id", m.id)
            .eq("match_type", "adoption")
            .order("created_at", { ascending: false })
            .limit(1);

          const photos = ((m.pet?.pet_photos as any[]) ?? []).sort(
            (a: any, b: any) => a.position - b.position
          );

          return {
            id: m.id,
            status: m.status ?? "pending",
            created_at: m.created_at,
            pet_id: m.pet_id ?? null,
            adoptant_id: m.adoptant_id ?? null,
            adoptant_name: m.adoptant?.name ?? null,
            adoptant_city: m.adoptant?.city ?? null,
            pet_photo: photos[0]?.url ?? null,
            last_message: msgs?.[0]?.text ?? null,
            last_message_at: msgs?.[0]?.created_at ?? null,
          };
        })
      );

      setAnfragen(rows);
    } catch (e) {
      console.error("HundDetailScreen.loadData", e);
    } finally {
      setLoading(false);
    }
  };

  const dogName = dog?.name ?? paramName ?? "Hund";

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
        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 40 }}>
          {/* Photo */}
          {dog?.photos?.[0]?.url ? (
            <Image
              source={{ uri: dog.photos[0].url }}
              style={{ width: "100%", height: 220, borderRadius: Sizes.RADIUS_LG, marginBottom: 16 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{
              width: "100%", height: 160, borderRadius: Sizes.RADIUS_LG,
              backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}>
              <Text style={{ fontSize: 48 }}>🐶</Text>
            </View>
          )}

          {/* Name + basic info */}
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.TEXT, marginBottom: 6 }}>{dogName}</Text>
          <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, marginBottom: 16 }}>
            {[dog?.rasse, dog ? formatAlter(dog.alter_jahre, dog.alter_monate) : null, dog?.groesse_kategorie, dog?.geschlecht]
              .filter(Boolean).join(" · ")}
          </Text>

          {/* Charakter tags */}
          {dog?.charakter_tags && dog.charakter_tags.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {dog.charakter_tags.map((tag) => (
                <View key={tag} style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: Sizes.RADIUS_FULL,
                  backgroundColor: Colors.PRIMARY + "18",
                }}>
                  <Text style={{ fontSize: 13, color: Colors.PRIMARY, fontWeight: "600" }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Beschreibung */}
          {dog?.beschreibung && (
            <View style={{ backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_LG, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 24 }}>{dog.beschreibung}</Text>
            </View>
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
              return (
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: "/tierheim/chat/[matchId]",
                    params: {
                      matchId: item.id,
                      petName: dogName,
                      petPhoto: item.pet_photo ?? "",
                      adoptantName: item.adoptant_name ?? "",
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
