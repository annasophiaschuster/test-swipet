import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

interface DashboardStats {
  orgName: string;
  verfuegbar: number;
  reserviert: number;
  vermittelt: number;
  totalMatches: number;
  unreadMessages: number;
}

interface PetItem {
  id: string;
  name: string;
  rasse: string | null;
  alter_jahre: number | null;
  alter_monate: number | null;
  status: string;
  photo: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  verfuegbar: Colors.SUCCESS,
  reserviert: Colors.WARNING,
  vermittelt: Colors.TEXT_MUTED,
};
const STATUS_LABEL: Record<string, string> = {
  verfuegbar: "Verfügbar",
  reserviert: "Reserviert",
  vermittelt: "Vermittelt",
};

function formatAlter(jahre?: number | null, monate?: number | null): string {
  if (jahre && jahre >= 1) return jahre === 1 ? "1 Jahr" : `${jahre} Jahre`;
  if (monate) return `${monate} Monate`;
  return "Welpe";
}

export default function TierheimDashboard() {
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [pets, setPets]         = useState<PetItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const guest = !user;
      setIsGuest(guest);

      if (guest) {
        // Demo mode: load ALL pets from Supabase as demo data
        const { data: allPets } = await supabase
          .from("pets")
          .select("id, name, rasse, alter_jahre, alter_monate, status, pet_photos(url, position)")
          .order("created_at", { ascending: false });

        const petList: PetItem[] = (allPets ?? []).map((p: any) => {
          const photos = (p.pet_photos ?? []).sort((a: any, b: any) => a.position - b.position);
          return {
            id: p.id,
            name: p.name,
            rasse: p.rasse,
            alter_jahre: p.alter_jahre,
            alter_monate: p.alter_monate,
            status: p.status ?? "verfuegbar",
            photo: photos[0]?.url ?? null,
          };
        });

        setPets(petList);
        setStats({
          orgName: "Demo-Tierheim",
          verfuegbar: petList.filter((p) => p.status === "verfuegbar").length,
          reserviert: petList.filter((p) => p.status === "reserviert").length,
          vermittelt: petList.filter((p) => p.status === "vermittelt").length,
          totalMatches: 12,
          unreadMessages: 3,
        });
        return;
      }

      // Logged in shelter
      const [shelterRes, petsRes, matchesRes] = await Promise.all([
        supabase.from("shelter_profiles").select("org_name").eq("id", user.id).single(),
        supabase
          .from("pets")
          .select("id, name, rasse, alter_jahre, alter_monate, status, pet_photos(url, position)")
          .eq("shelter_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("adoption_matches").select("id").eq("shelter_id", user.id),
      ]);

      const petList: PetItem[] = (petsRes.data ?? []).map((p: any) => {
        const photos = (p.pet_photos ?? []).sort((a: any, b: any) => a.position - b.position);
        return {
          id: p.id,
          name: p.name,
          rasse: p.rasse,
          alter_jahre: p.alter_jahre,
          alter_monate: p.alter_monate,
          status: p.status ?? "verfuegbar",
          photo: photos[0]?.url ?? null,
        };
      });

      const matches = matchesRes.data ?? [];
      let unread = 0;
      if (matches.length > 0) {
        const matchIds = matches.map((m) => m.id);
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("match_id", matchIds)
          .neq("sender_id", user.id);
        unread = count ?? 0;
      }

      setPets(petList);
      setStats({
        orgName: shelterRes.data?.org_name ?? "Mein Tierheim",
        verfuegbar: petList.filter((p) => p.status === "verfuegbar").length,
        reserviert: petList.filter((p) => p.status === "reserviert").length,
        vermittelt: petList.filter((p) => p.status === "vermittelt").length,
        totalMatches: matches.length,
        unreadMessages: unread,
      });
    } catch (e) {
      console.error("TierheimDashboard.loadDashboard", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={Colors.PRIMARY} />
      }
    >
      {/* Header with stats */}
      <View style={{
        paddingTop: 60, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 24,
        backgroundColor: Colors.PRIMARY,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <View>
            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}
            >
              <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.7)" }}>‹</Text>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "500" }}>Modi wechseln</Text>
            </TouchableOpacity>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
              🏠 Tierheim Dashboard
            </Text>
            <Text style={{ color: Colors.WHITE, fontSize: 22, fontWeight: "800", marginTop: 4 }}>
              {stats?.orgName ?? "Dein Tierheim"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              paddingHorizontal: 14, paddingVertical: 7,
              borderRadius: Sizes.RADIUS_FULL,
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontSize: 13, fontWeight: "600" }}>
              {isGuest ? "Anmelden 🔑" : "Logout"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats: Verfügbar / Reserviert / Vermittelt */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard value={stats?.verfuegbar ?? 0} label="Verfügbar" emoji="✅" />
          <StatCard value={stats?.reserviert ?? 0} label="Reserviert" emoji="⏳" />
          <StatCard value={stats?.vermittelt ?? 0} label="Vermittelt" emoji="🏡" />
        </View>
      </View>

      {/* Demo Banner */}
      {isGuest && (
        <View style={{
          marginHorizontal: Sizes.SPACING_LG, marginTop: Sizes.SPACING_LG,
          padding: 14, backgroundColor: "#FFF8F0", borderRadius: 12,
          borderWidth: 1, borderColor: "#F0956A40",
          flexDirection: "row", alignItems: "center", gap: 10,
        }}>
          <Text style={{ fontSize: 18 }}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT }}>Demo-Ansicht</Text>
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 }}>
              Melde dich an, um dein echtes Tierheim zu verwalten
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{ backgroundColor: Colors.PRIMARY, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={{ padding: Sizes.SPACING_LG, paddingBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT, marginBottom: 12 }}>
          Schnellzugriff
        </Text>
        <View style={{ gap: 10 }}>
          <ActionCard
            emoji="➕"
            title="Tier hinzufügen"
            subtitle="Neues Tier zur Adoption eintragen"
            color={Colors.PRIMARY}
            onPress={() => router.push("/tierheim/hunde")}
          />
          <ActionCard
            emoji="🔔"
            title="Anfragen"
            subtitle={
              stats?.unreadMessages
                ? `${stats.unreadMessages} neue Nachricht${stats.unreadMessages > 1 ? "en" : ""}`
                : `${stats?.totalMatches ?? 0} Interessenten`
            }
            color="#8A9F79"
            badge={stats?.unreadMessages}
            onPress={() => router.push("/tierheim/anfragen")}
          />
        </View>
      </View>

      {/* All Pets */}
      <View style={{ paddingHorizontal: Sizes.SPACING_LG, paddingTop: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT, marginBottom: 12 }}>
          Alle Hunde ({pets.length})
        </Text>
        <View style={{ gap: 10 }}>
          {pets.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              onPress={() => router.push("/tierheim/hunde")}
              activeOpacity={0.75}
              style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: Colors.WHITE,
                borderRadius: 14, borderWidth: 1, borderColor: Colors.BORDER,
                padding: 12,
                shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
              }}
            >
              {pet.photo ? (
                <Image
                  source={{ uri: pet.photo }}
                  style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: Colors.SURFACE, marginRight: 12 }}
                />
              ) : (
                <View style={{
                  width: 52, height: 52, borderRadius: 10,
                  backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center", marginRight: 12,
                }}>
                  <Text style={{ fontSize: 24 }}>🐶</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.TEXT }}>{pet.name}</Text>
                <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                  {[pet.rasse, formatAlter(pet.alter_jahre, pet.alter_monate)].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <View style={{
                backgroundColor: (STATUS_COLOR[pet.status] ?? Colors.TEXT_MUTED) + "22",
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: "700",
                  color: STATUS_COLOR[pet.status] ?? Colors.TEXT_MUTED,
                }}>
                  {STATUS_LABEL[pet.status] ?? pet.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tip */}
      <View style={{ marginHorizontal: Sizes.SPACING_LG, marginTop: 20 }}>
        <View style={{
          backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_LG,
          padding: 16, borderLeftWidth: 3, borderLeftColor: Colors.PRIMARY,
        }}>
          <Text style={{ fontWeight: "700", color: Colors.TEXT, marginBottom: 4 }}>💡 Tipp</Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: 13, lineHeight: 20 }}>
            Füge möglichst viele Fotos und eine detaillierte Beschreibung hinzu — Profile mit Fotos werden 3x häufiger geliked!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: Sizes.RADIUS_MD, padding: 12, alignItems: "center",
    }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ color: Colors.WHITE, fontSize: 24, fontWeight: "800", marginTop: 4 }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, textAlign: "center", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function ActionCard({
  emoji, title, subtitle, color, badge, onPress,
}: {
  emoji: string; title: string; subtitle: string; color: string; badge?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.WHITE, borderRadius: Sizes.RADIUS_LG,
        padding: 16,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
        borderWidth: 1, borderColor: Colors.BORDER,
      }}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: color + "20",
        alignItems: "center", justifyContent: "center", marginRight: 14,
      }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>{title}</Text>
        <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={{
          backgroundColor: Colors.PRIMARY, borderRadius: 12,
          minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
        }}>
          <Text style={{ color: Colors.WHITE, fontSize: 12, fontWeight: "700" }}>{badge}</Text>
        </View>
      ) : (
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
      )}
    </TouchableOpacity>
  );
}
