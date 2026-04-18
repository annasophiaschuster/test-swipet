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
import { useLanguage } from "../../contexts/LanguageContext";

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

export default function TierheimDashboard() {
  const { t } = useLanguage();
  const STATUS_LABEL: Record<string, string> = {
    verfuegbar: t.tierheim_status_available,
    reserviert: t.tierheim_status_reserved,
    vermittelt: t.tierheim_status_placed,
  };
  const formatAlter = (jahre?: number | null, monate?: number | null): string => {
    if (jahre && jahre >= 1) return jahre === 1 ? `1 ${t.tierheim_age_year}` : `${jahre} ${t.tierheim_age_years}`;
    if (monate) return `${monate} ${t.tierheim_age_months}`;
    return t.tierheim_age_puppy;
  };
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [pets, setPets]         = useState<PetItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]   = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

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
          orgName: t.tierheim_demo_name,
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
        orgName: shelterRes.data?.org_name ?? "Meine Organisation",
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
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "500" }}>{t.comp_switch_modes}</Text>
            </TouchableOpacity>
            <Text style={{ color: Colors.WHITE, fontSize: 22, fontWeight: "800", marginTop: 4 }}>
              {stats?.orgName ?? t.tierheim_dashboard_your_shelter}
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
              {isGuest ? t.tierheim_dashboard_login : "Logout"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats: Verfügbar / Reserviert / Vermittelt */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard value={stats?.verfuegbar ?? 0} label={t.tierheim_status_available} />
          <StatCard value={stats?.reserviert ?? 0} label={t.tierheim_status_reserved} />
          <StatCard value={stats?.vermittelt ?? 0} label={t.tierheim_status_placed} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={{ padding: Sizes.SPACING_LG, paddingBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT, marginBottom: 12 }}>
          {t.tierheim_dashboard_quick_access}
        </Text>
        <View style={{ gap: 10 }}>
          <ActionCard
            emoji="➕"
            title={t.tierheim_dashboard_add_animal}
            subtitle={t.tierheim_dashboard_add_animal_sub}
            color={Colors.PRIMARY}
            onPress={() => router.push("/tierheim/hunde")}
          />
          <ActionCard
            imageSource={require("../../assets/tab-chat.png")}
            title={t.tierheim_dashboard_requests}
            subtitle={
              stats?.unreadMessages
                ? t.tierheim_dashboard_new_messages(stats.unreadMessages)
                : t.tierheim_dashboard_interested(stats?.totalMatches ?? 0)
            }
            color={Colors.PRIMARY}
            badge={stats?.unreadMessages}
            onPress={() => router.push("/tierheim/anfragen")}
          />
        </View>
      </View>

      {/* All Pets */}
      <View style={{ paddingHorizontal: Sizes.SPACING_LG, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT }}>
            {t.tierheim_dashboard_all_dogs(filterStatus ? pets.filter(p => p.status === filterStatus).length : pets.length)}
          </Text>
        </View>
        {/* Status Filter Chips */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {([null, "verfuegbar", "reserviert", "vermittelt"] as (string | null)[]).map((s) => {
            const active = filterStatus === s;
            const label = s === null
              ? t.tierheim_dashboard_filter_all
              : STATUS_LABEL[s] ?? s;
            return (
              <TouchableOpacity
                key={s ?? "all"}
                onPress={() => setFilterStatus(active ? null : s)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5,
                  borderRadius: 99, borderWidth: 1,
                  borderColor: active ? Colors.SECONDARY : Colors.PRIMARY,
                  backgroundColor: active ? Colors.SECONDARY : Colors.WHITE,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: active ? "700" : "500", color: active ? Colors.WHITE : Colors.PRIMARY }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ gap: 10 }}>
          {(filterStatus ? pets.filter(p => p.status === filterStatus) : pets).map((pet) => (
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

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: Sizes.RADIUS_MD, padding: 12, alignItems: "center",
    }}>
      <Text style={{ color: Colors.WHITE, fontSize: 24, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, textAlign: "center", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function ActionCard({
  emoji, imageSource, title, subtitle, color, badge, onPress,
}: {
  emoji?: string; imageSource?: any; title: string; subtitle: string; color: string; badge?: number; onPress: () => void;
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
        {imageSource
          ? <Image source={imageSource} style={{ width: 26, height: 26, resizeMode: "contain", tintColor: color }} />
          : <Text style={{ fontSize: 22 }}>{emoji}</Text>
        }
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
