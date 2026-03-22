import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

interface Pet {
  id: string;
  name: string;
  tierart: string;
  rasse: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  alter_monate: number | null;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  verfuegbar: { bg: "#E8F5E9", text: "#2E7D32" },
  reserviert: { bg: "#FFF8E1", text: "#F57F17" },
  vermittelt: { bg: "#F3E5F5", text: "#6A1B9A" },
};

export default function ShelterPetsScreen() {
  const { t } = useLanguage();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const statusLabel = (status: string) => {
    if (status === "verfuegbar") return t.tierheim_status_available;
    if (status === "reserviert") return t.tierheim_status_reserved;
    if (status === "vermittelt") return t.tierheim_status_placed;
    return status;
  };

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
      if (!user) return;

      const { data, error } = await supabase
        .from("pets")
        .select("id, name, tierart, rasse, groesse_kategorie, alter_jahre, alter_monate, status, created_at")
        .eq("shelter_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) setPets(data ?? []);
    } catch (e) {
      console.error("loadPets error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (pet: Pet) => {
    const options = ["verfuegbar", "reserviert", "vermittelt"].filter((s) => s !== pet.status);

    Alert.alert(
      `${t.tierheim_dogs_status_title} ${pet.name}`,
      `${t.tierheim_dogs_status_current} ${statusLabel(pet.status)}`,
      [
        ...options.map((status) => ({
          text: `→ ${statusLabel(status)}`,
          onPress: async () => {
            await supabase.from("pets").update({ status }).eq("id", pet.id);
            loadPets();
          },
        })),
        { text: t.tierheim_dogs_cancel, style: "cancel" as const },
      ]
    );
  };

  const handleDelete = (pet: Pet) => {
    Alert.alert(
      `${pet.name} ${t.tierheim_dogs_delete_title}`,
      t.tierheim_dogs_delete_msg,
      [
        {
          text: t.tierheim_dogs_delete_btn,
          style: "destructive",
          onPress: async () => {
            await supabase.from("pets").delete().eq("id", pet.id);
            loadPets();
          },
        },
        { text: t.tierheim_dogs_cancel, style: "cancel" },
      ]
    );
  };

  const formatAlter = (jahre?: number | null, monate?: number | null) => {
    if (jahre && jahre >= 1) return jahre === 1 ? `1 ${t.tierheim_age_year}` : `${jahre} ${t.tierheim_age_years}`;
    if (monate) return `${monate} ${t.tierheim_age_months}`;
    return t.tierheim_age_puppy;
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
      <View style={{ paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.BORDER, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 20, color: Colors.PRIMARY }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>{t.tierheim_dogs_my_animals}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/shelter/pets/add")}
          style={{ backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL, paddingHorizontal: 14, paddingVertical: 7 }}
        >
          <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 13 }}>{t.tierheim_dogs_add_short}</Text>
        </TouchableOpacity>
      </View>

      {pets.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🐾</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            {t.tierheim_dogs_empty_title}
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24 }}>
            {t.tierheim_dogs_empty_sub2}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/shelter/pets/add")}
            style={{ backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL, paddingHorizontal: 24, height: Sizes.BUTTON_HEIGHT, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700" }}>{t.tierheim_dogs_add_btn}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPets(true)} tintColor={Colors.PRIMARY} />}
          contentContainerStyle={{ padding: Sizes.SPACING_LG, gap: 10 }}
          renderItem={({ item }) => {
            const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.verfuegbar;
            return (
              <View style={{ backgroundColor: Colors.WHITE, borderRadius: Sizes.RADIUS_LG, padding: 14, borderWidth: 1, borderColor: Colors.BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 20 }}>{item.tierart === "hund" ? "🐶" : "🐱"}</Text>
                      <Text style={{ fontSize: Sizes.FONT_LG, fontWeight: "700", color: Colors.TEXT }}>{item.name}</Text>
                      <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Sizes.RADIUS_FULL }}>
                        <Text style={{ color: statusStyle.text, fontSize: 11, fontWeight: "600" }}>{statusLabel(item.status)}</Text>
                      </View>
                    </View>
                    <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
                      {[item.rasse, formatAlter(item.alter_jahre, item.alter_monate)].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleStatusChange(item)}
                    style={{ flex: 1, height: 34, borderRadius: Sizes.RADIUS_FULL, borderWidth: 1, borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 12, color: Colors.TEXT, fontWeight: "500" }}>{t.tierheim_dogs_status_change}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#FFCDD2", backgroundColor: "#FFF5F5", alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 14 }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
