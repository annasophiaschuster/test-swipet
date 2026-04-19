import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import GradientHeader from "../../components/GradientHeader";
import { useLanguage } from "../../contexts/LanguageContext";

interface Pet {
  id: string;
  name: string;
  tierart: string;
  rasse: string | null;
  alter_jahre: number | null;
  alter_monate: number | null;
  status: string;
  created_at: string;
  pet_photos: { url: string; position: number }[];
  interessenten: number;
  neue_anfragen: number;
}

function formatAlter(jahre?: number | null, monate?: number | null, puppy?: string, year?: string, years?: string, months?: string): string {
  if (jahre && jahre >= 1) return jahre === 1 ? `1 ${year ?? "Jahr"}` : `${jahre} ${years ?? "Jahre"}`;
  if (monate) return `${monate} ${months ?? "Monate"}`;
  return puppy ?? "Welpe";
}

export default function TierheimHundeScreen() {
  const { t } = useLanguage();

  const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
    verfuegbar: { bg: Colors.SUCCESS,    label: t.tierheim_dogs_verfuegbar },
    reserviert: { bg: Colors.WARNING,    label: t.tierheim_dogs_reserviert },
    vermittelt: { bg: Colors.TEXT_MUTED, label: t.tierheim_dogs_vermittelt },
  };

  const [pets, setPets]         = useState<Pet[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]   = useState(false);

  const lastFetchTime = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchTime.current < 5000) return;
      loadPets();
      lastFetchTime.current = Date.now();
    }, [])
  );

  // Bulk-fetch: 1 Query statt 2×N (ein Query pro Hund)
  const enrichWithStats = async (rawPets: any[]): Promise<Pet[]> => {
    if (rawPets.length === 0) return [];
    const petIds = rawPets.map((p) => p.id);

    const { data: matches } = await supabase
      .from("adoption_matches")
      .select("pet_id, status")
      .in("pet_id", petIds);

    const totals: Record<string, number> = {};
    const pending: Record<string, number> = {};
    for (const m of matches ?? []) {
      totals[m.pet_id] = (totals[m.pet_id] ?? 0) + 1;
      if (m.status === "pending") {
        pending[m.pet_id] = (pending[m.pet_id] ?? 0) + 1;
      }
    }

    console.log(`[hunde] enrichWithStats: 1 bulk query für ${petIds.length} Hunde`);
    return rawPets.map((pet) => ({
      ...pet,
      interessenten: totals[pet.id] ?? 0,
      neue_anfragen: pending[pet.id] ?? 0,
    }));
  };

  const loadPets = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        setIsGuest(true);
        // Demo mode: load ALL pets from Supabase
        const { data } = await supabase
          .from("pets")
          .select("*, pet_photos(url, position)")
          .order("created_at", { ascending: false });
        const enriched = await enrichWithStats(data ?? []);
        setPets(enriched);
        return;
      }

      setIsGuest(false);

      const { data, error } = await supabase
        .from("pets")
        .select("*, pet_photos(url, position)")
        .eq("shelter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const enriched = await enrichWithStats(data ?? []);
      setPets(enriched);
    } catch (e) {
      console.error("TierheimHundeScreen.loadPets", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (pet: Pet) => {
    if (isGuest) {
      Alert.alert(t.tierheim_dogs_demo_title, t.tierheim_dogs_demo_msg);
      return;
    }
    const allStatuses = ["verfuegbar", "reserviert", "vermittelt"];
    const options = allStatuses.filter((s) => s !== pet.status);

    Alert.alert(
      `${t.tierheim_dogs_status_title} ${pet.name}`,
      `${t.tierheim_dogs_status_current} ${STATUS_CONFIG[pet.status]?.label ?? pet.status}`,
      [
        ...options.map((status) => ({
          text: `→ ${STATUS_CONFIG[status]?.label ?? status}`,
          onPress: async () => {
            try {
              await supabase.from("pets").update({ status }).eq("id", pet.id);
              loadPets();
            } catch (e) {
              console.error("handleStatusChange error", e);
            }
          },
        })),
        { text: t.tierheim_dogs_cancel, style: "cancel" as const },
      ]
    );
  };

  const handleDelete = (pet: Pet) => {
    if (isGuest) {
      Alert.alert(t.tierheim_dogs_demo_title, t.tierheim_dogs_demo_delete_msg);
      return;
    }
    Alert.alert(
      `${pet.name} ${t.tierheim_dogs_delete_title}`,
      t.tierheim_dogs_delete_msg,
      [
        {
          text: t.tierheim_dogs_delete_btn,
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("pets").delete().eq("id", pet.id);
              loadPets();
            } catch (e) {
              console.error("handleDelete error", e);
            }
          },
        },
        { text: t.tierheim_dogs_cancel, style: "cancel" },
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
        title="Meine Hunde"
        rightElement={
          <TouchableOpacity
            onPress={() => {
              if (isGuest) {
                Alert.alert(t.tierheim_dogs_demo_title, t.tierheim_dogs_demo_add_msg);
                return;
              }
              router.push("/shelter/pets/add");
            }}
            style={{
              backgroundColor: "rgba(255,255,255,0.25)", borderRadius: Sizes.RADIUS_FULL,
              paddingHorizontal: 14, paddingVertical: 7,
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 15 }}>＋</Text>
          </TouchableOpacity>
        }
      />

      {pets.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Image source={require("../../assets/hunde-empty.png")} style={{ width: 80, height: 73, resizeMode: "contain", tintColor: Colors.PRIMARY, marginBottom: 16 }} />
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            {t.tierheim_dogs_empty_title}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24 }}>
            {t.tierheim_dogs_empty_sub}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/shelter/pets/add")}
            style={{
              backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL,
              paddingHorizontal: 24, height: Sizes.BUTTON_HEIGHT,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700" }}>{t.tierheim_dogs_add_btn}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadPets(true)} tintColor={Colors.PRIMARY} />
          }
          contentContainerStyle={{ padding: Sizes.SPACING_LG, gap: 10 }}
          renderItem={({ item }) => {
            const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.verfuegbar;
            const sortedPhotos = [...(item.pet_photos ?? [])].sort((a, b) => a.position - b.position);
            const coverPhoto = sortedPhotos[0]?.url ?? null;

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: "/tierheim/hund/[id]", params: { id: item.id, name: item.name } })}
                style={{
                  backgroundColor: Colors.WHITE, borderRadius: Sizes.RADIUS_LG,
                  borderWidth: 1, borderColor: Colors.BORDER,
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                  overflow: "hidden",
                }}
              >
                <View style={{ flexDirection: "row", padding: 14, alignItems: "flex-start" }}>
                  {coverPhoto ? (
                    <Image
                      source={{ uri: coverPhoto }}
                      style={{
                        width: 64, height: 64, borderRadius: Sizes.RADIUS_MD,
                        backgroundColor: Colors.SURFACE, marginRight: 12,
                      }}
                    />
                  ) : (
                    <View style={{
                      width: 64, height: 64, borderRadius: Sizes.RADIUS_MD,
                      backgroundColor: Colors.SURFACE,
                      alignItems: "center", justifyContent: "center", marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 28 }}>🐶</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
                        {item.name}
                      </Text>
                      <View style={{
                        backgroundColor: statusCfg.bg + "22",
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: Sizes.RADIUS_FULL,
                      }}>
                        <Text style={{ color: statusCfg.bg, fontSize: 10, fontWeight: "700" }}>
                          {statusCfg.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
                      {[item.rasse, formatAlter(item.alter_jahre, item.alter_monate, t.tierheim_dogs_puppy, t.tierheim_dogs_year, t.tierheim_dogs_years, t.tierheim_dogs_months)].filter(Boolean).join(" · ")}
                    </Text>
                    {/* Stats badges */}
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderRadius: Sizes.RADIUS_FULL,
                        backgroundColor: Colors.PRIMARY + "18",
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: Colors.PRIMARY }}>
                          {item.interessenten} {t.tierheim_dogs_interessenten}
                        </Text>
                      </View>
                      {item.neue_anfragen > 0 && (
                        <View style={{
                          paddingHorizontal: 8, paddingVertical: 3,
                          borderRadius: Sizes.RADIUS_FULL,
                          backgroundColor: "#FFF3CD",
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: "#856404" }}>
                            {item.neue_anfragen} {t.tierheim_dogs_neue_anfragen}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/tierheim/hund/[id]", params: { id: item.id, name: item.name } })}
                    style={{
                      flex: 1, height: 34, borderRadius: Sizes.RADIUS_FULL,
                      backgroundColor: Colors.PRIMARY + "28",
                      borderWidth: 1, borderColor: Colors.PRIMARY + "60",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: Colors.PRIMARY, fontWeight: "700" }}>
                      {t.tierheim_dogs_to_profile}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleStatusChange(item)}
                    style={{
                      flex: 1, height: 34, borderRadius: Sizes.RADIUS_FULL,
                      borderWidth: 1, borderColor: Colors.BORDER,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: Colors.TEXT, fontWeight: "500" }}>
                      {t.tierheim_dogs_status_btn}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
