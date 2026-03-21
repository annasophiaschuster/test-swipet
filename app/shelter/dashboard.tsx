import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

interface DashboardStats {
  orgName: string;
  totalPets: number;
  verfuegbarePets: number;
  totalMatches: number;
  unreadMessages: number;
}

export default function ShelterDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      checkGuest();
    }, [])
  );

  // Demo-Placeholder für unangemeldete Besucher
  const DEMO_STATS: DashboardStats = {
    orgName: "Demo-Tierheim",
    totalPets: 8,
    verfuegbarePets: 6,
    totalMatches: 12,
    unreadMessages: 3,
  };

  const loadStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Demo-Modus: Placeholder-Daten anzeigen
        setStats(DEMO_STATS);
        return;
      }

      const [shelterRes, petsRes, matchesRes] = await Promise.all([
        supabase.from("shelter_profiles").select("org_name").eq("id", user.id).single(),
        supabase.from("pets").select("id, status").eq("shelter_id", user.id),
        supabase.from("adoption_matches").select("id").eq("shelter_id", user.id),
      ]);

      const pets = petsRes.data ?? [];
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

      setStats({
        orgName: shelterRes.data?.org_name ?? "Tierheim",
        totalPets: pets.length,
        verfuegbarePets: pets.filter((p) => p.status === "verfuegbar").length,
        totalMatches: matches.length,
        unreadMessages: unread,
      });
    } catch (e) {
      console.error("loadStats error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [isGuest, setIsGuest] = useState(false);

  const handleLogout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  // isGuest nach Stats laden setzen
  const checkGuest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsGuest(!user);
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
        <RefreshControl refreshing={refreshing} onRefresh={() => loadStats(true)} tintColor={Colors.PRIMARY} />
      }
    >
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 20, backgroundColor: Colors.PRIMARY }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
              🏠 Tierheim Dashboard
            </Text>
            <Text style={{ color: Colors.WHITE, fontSize: 22, fontWeight: "800", marginTop: 4 }}>
              {stats?.orgName ?? "Dein Tierheim"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Sizes.RADIUS_FULL, backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Text style={{ color: Colors.WHITE, fontSize: 13, fontWeight: "600" }}>
              {isGuest ? "Anmelden 🔑" : "Logout"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <StatCard value={stats?.verfuegbarePets ?? 0} label="Verfügbar" emoji="🐾" />
          <StatCard value={stats?.totalPets ?? 0} label="Gesamt" emoji="📋" />
          <StatCard value={stats?.totalMatches ?? 0} label="Matches" emoji="❤️" />
        </View>
      </View>

      {/* Demo-Banner */}
      {isGuest && (
        <View style={{ marginHorizontal: Sizes.SPACING_LG, marginTop: Sizes.SPACING_LG, padding: 14, backgroundColor: "#FFF8F0", borderRadius: 12, borderWidth: 1, borderColor: "#F0956A40", flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 18 }}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT }}>Demo-Ansicht</Text>
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 }}>Melde dich an, um dein echtes Tierheim zu verwalten</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/auth/login")} style={{ backgroundColor: Colors.PRIMARY, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 }}>
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={{ padding: Sizes.SPACING_LG }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT, marginBottom: 12 }}>
          Schnellzugriff
        </Text>
        <View style={{ gap: 10 }}>
          <ActionCard
            emoji="➕"
            title="Tier hinzufügen"
            subtitle="Neues Tier zur Adoption eintragen"
            color={Colors.PRIMARY}
            onPress={() => router.push("/shelter/pets/add")}
          />
          <ActionCard
            emoji="📋"
            title="Meine Tiere"
            subtitle={`${stats?.totalPets ?? 0} Tiere verwalten`}
            color={Colors.SECONDARY}
            onPress={() => router.push("/shelter/pets")}
          />
          <ActionCard
            emoji="❤️"
            title="Matches & Nachrichten"
            subtitle={
              stats?.unreadMessages
                ? `${stats.unreadMessages} neue Nachricht${stats.unreadMessages > 1 ? "en" : ""}`
                : `${stats?.totalMatches ?? 0} Matches`
            }
            color="#8A9F79"
            badge={stats?.unreadMessages}
            onPress={() => router.push("/shelter/matches")}
          />
        </View>
      </View>

      {/* Tip */}
      <View style={{ marginHorizontal: Sizes.SPACING_LG }}>
        <View style={{ backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_LG, padding: 16, borderLeftWidth: 3, borderLeftColor: Colors.PRIMARY }}>
          <Text style={{ fontWeight: "700", color: Colors.TEXT, marginBottom: 4 }}>💡 Tipp</Text>
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: 13, lineHeight: 20 }}>
            Füge möglichst viele Fotos und eine detaillierte Beschreibung hinzu — Tiere mit vollständigen Profilen werden häufiger geliked!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: Sizes.RADIUS_MD, padding: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ color: Colors.WHITE, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, textAlign: "center", marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function ActionCard({ emoji, title, subtitle, color, badge, onPress }: {
  emoji: string; title: string; subtitle: string; color: string; badge?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.WHITE,
        borderRadius: Sizes.RADIUS_LG,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.BORDER,
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color + "20", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>{title}</Text>
        <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 1 }}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={{ backgroundColor: Colors.PRIMARY, borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
          <Text style={{ color: Colors.WHITE, fontSize: 12, fontWeight: "700" }}>{badge}</Text>
        </View>
      ) : (
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: 18 }}>›</Text>
      )}
    </TouchableOpacity>
  );
}
