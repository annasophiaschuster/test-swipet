import { useCallback, useState } from "react";
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
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

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
}

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  verfuegbar: { bg: Colors.SUCCESS,     label: "Verfügbar"  },
  reserviert: { bg: Colors.WARNING,     label: "Reserviert" },
  vermittelt: { bg: Colors.TEXT_MUTED,  label: "Vermittelt" },
};

function formatAlter(jahre?: number | null, monate?: number | null): string {
  if (jahre && jahre >= 1) return jahre === 1 ? "1 Jahr" : `${jahre} Jahre`;
  if (monate) return `${monate} Monate`;
  return "Welpe";
}

export default function TierheimHundeScreen() {
  const [pets, setPets]         = useState<Pet[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [])
  );

  const loadPets = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        // Demo mode: load ALL pets from Supabase
        const { data } = await supabase
          .from("pets")
          .select("*, pet_photos(url, position)")
          .order("created_at", { ascending: false });
        setPets(data ?? []);
        return;
      }

      setIsGuest(false);

      const { data, error } = await supabase
        .from("pets")
        .select("*, pet_photos(url, position)")
        .eq("shelter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPets(data ?? []);
    } catch (e) {
      console.error("TierheimHundeScreen.loadPets", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (pet: Pet) => {
    if (isGuest) {
      Alert.alert("Demo-Ansicht", "Melde dich an um den Status zu ändern.");
      return;
    }
    const allStatuses = ["verfuegbar", "reserviert", "vermittelt"];
    const options = allStatuses.filter((s) => s !== pet.status);

    Alert.alert(
      `Status von ${pet.name}`,
      `Aktuell: ${STATUS_CONFIG[pet.status]?.label ?? pet.status}`,
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
        { text: "Abbrechen", style: "cancel" },
      ]
    );
  };

  const handleDelete = (pet: Pet) => {
    if (isGuest) {
      Alert.alert("Demo-Ansicht", "Melde dich an um Tiere zu löschen.");
      return;
    }
    Alert.alert(
      `${pet.name} löschen?`,
      "Alle Fotos und Matches werden ebenfalls gelöscht.",
      [
        {
          text: "Löschen",
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>🐕 Meine Hunde</Text>
        <TouchableOpacity
          onPress={() => {
            if (isGuest) {
              Alert.alert("Demo-Ansicht", "Melde dich an um Hunde hinzuzufügen.");
              return;
            }
            router.push("/shelter/pets/add");
          }}
          style={{
            backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL,
            paddingHorizontal: 14, paddingVertical: 7,
          }}
        >
          <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 15 }}>＋</Text>
        </TouchableOpacity>
        </View>
      </View>

      {/* Demo banner */}
      {isGuest && (
        <View style={{
          marginHorizontal: Sizes.SPACING_LG, marginTop: Sizes.SPACING_MD,
          padding: 12, backgroundColor: "#FFF8F0", borderRadius: 10,
          borderWidth: 1, borderColor: "#F0956A40",
          flexDirection: "row", alignItems: "center", gap: 10,
        }}>
          <Text style={{ fontSize: 16 }}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.TEXT }}>Demo-Ansicht</Text>
            <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED }}>Melde dich an für deine echten Tiere</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={{ backgroundColor: Colors.PRIMARY, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {pets.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🐾</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            Noch keine Tiere
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24 }}>
            Trage deinen ersten Hund ein und finde ein neues Zuhause!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/shelter/pets/add")}
            style={{
              backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL,
              paddingHorizontal: 24, height: Sizes.BUTTON_HEIGHT,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700" }}>Tier hinzufügen</Text>
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
              <View style={{
                backgroundColor: Colors.WHITE, borderRadius: Sizes.RADIUS_LG,
                borderWidth: 1, borderColor: Colors.BORDER,
                shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                overflow: "hidden",
              }}>
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
                      {[item.rasse, formatAlter(item.alter_jahre, item.alter_monate)].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleStatusChange(item)}
                    style={{
                      flex: 1, height: 34, borderRadius: Sizes.RADIUS_FULL,
                      borderWidth: 1, borderColor: Colors.BORDER,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: Colors.TEXT, fontWeight: "500" }}>
                      ⇄ Status ändern
                    </Text>
                  </TouchableOpacity>
                  {!isGuest && (
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={{
                        width: 34, height: 34, borderRadius: 17,
                        borderWidth: 1, borderColor: "#FFCDD2",
                        backgroundColor: "#FFF5F5",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
