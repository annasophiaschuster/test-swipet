import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";

interface ShelterInfo {
  id: string;
  org_name: string;
  beschreibung: string | null;
  website: string | null;
  adresse: string | null;
  telefon: string | null;
  logo_url: string | null;
  city: string | null;
}

interface PetItem {
  id: string;
  name: string;
  rasse: string | null;
  alter_jahre: number | null;
  alter_monate: number | null;
  photo: string | null;
}

function formatAlter(jahre?: number | null, monate?: number | null): string {
  if (jahre && jahre >= 1) return jahre === 1 ? "1 Jahr" : `${jahre} Jahre`;
  if (monate) return `${monate} Monate`;
  return "Welpe";
}

export default function ShelterPublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shelter, setShelter]   = useState<ShelterInfo | null>(null);
  const [pets, setPets]         = useState<PetItem[]>([]);
  const [loading, setLoading]   = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (id) loadShelter(id);
    }, [id])
  );

  const loadShelter = async (shelterId: string) => {
    setLoading(true);
    try {
      const [shelterRes, petsRes] = await Promise.all([
        supabase
          .from("shelter_profiles")
          .select("id, org_name, beschreibung, website, adresse, telefon, logo_url")
          .eq("id", shelterId)
          .single(),
        supabase
          .from("pets")
          .select("id, name, rasse, alter_jahre, alter_monate, pet_photos(url, position)")
          .eq("shelter_id", shelterId)
          .eq("status", "verfuegbar")
          .order("created_at", { ascending: false }),
      ]);

      if (shelterRes.data) {
        // Also get city from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("city")
          .eq("id", shelterId)
          .single();

        setShelter({ ...shelterRes.data, city: profile?.city ?? null });
      }

      if (petsRes.data) {
        setPets(
          petsRes.data.map((p: any) => {
            const photos = (p.pet_photos ?? []).sort((a: any, b: any) => a.position - b.position);
            return {
              id: p.id,
              name: p.name,
              rasse: p.rasse,
              alter_jahre: p.alter_jahre,
              alter_monate: p.alter_monate,
              photo: photos[0]?.url ?? null,
            };
          })
        );
      }
    } catch (e) {
      console.error("ShelterPublicProfile.loadShelter", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.PRIMARY} size="large" />
      </View>
    );
  }

  if (!shelter) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.TEXT_MUTED }}>Tierheim nicht gefunden.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Back Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        backgroundColor: Colors.BACKGROUND,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 24, color: Colors.PRIMARY }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT }}>Tierheim-Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Logo + Name */}
        <View style={{ alignItems: "center", paddingTop: 32, paddingBottom: 24 }}>
          {shelter.logo_url ? (
            <Image
              source={{ uri: shelter.logo_url }}
              style={{
                width: 100, height: 100, borderRadius: 50,
                borderWidth: 3, borderColor: Colors.PRIMARY,
                backgroundColor: Colors.SURFACE,
              }}
            />
          ) : (
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: Colors.BORDER,
            }}>
              <Text style={{ fontSize: 42 }}>🏠</Text>
            </View>
          )}
          <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.TEXT, marginTop: 14, textAlign: "center" }}>
            {shelter.org_name}
          </Text>
          {shelter.city && (
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, marginTop: 4 }}>
              📍 {shelter.city}
            </Text>
          )}
        </View>

        {/* Description */}
        {shelter.beschreibung && (
          <View style={{ marginHorizontal: 20, marginBottom: 20, padding: 16, backgroundColor: Colors.SURFACE, borderRadius: 16 }}>
            <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 24 }}>{shelter.beschreibung}</Text>
          </View>
        )}

        {/* Contact Info */}
        <View style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: Colors.BORDER }}>
          <View style={{ padding: 14, backgroundColor: Colors.SURFACE }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>
              Kontakt
            </Text>
          </View>

          {shelter.telefon && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${shelter.telefon}`)}
              style={{
                flexDirection: "row", alignItems: "center", padding: 16,
                borderTopWidth: 1, borderTopColor: Colors.BORDER,
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 14 }}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>Telefon</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.PRIMARY, marginTop: 2 }}>
                  {shelter.telefon}
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED }}>›</Text>
            </TouchableOpacity>
          )}

          {shelter.website && (
            <TouchableOpacity
              onPress={() => {
                const url = shelter.website!.startsWith("http")
                  ? shelter.website!
                  : `https://${shelter.website}`;
                Linking.openURL(url);
              }}
              style={{
                flexDirection: "row", alignItems: "center", padding: 16,
                borderTopWidth: 1, borderTopColor: Colors.BORDER,
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 14 }}>🌐</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>Website</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.PRIMARY, marginTop: 2 }} numberOfLines={1}>
                  {shelter.website}
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED }}>›</Text>
            </TouchableOpacity>
          )}

          {shelter.adresse && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`maps:?q=${encodeURIComponent(shelter.adresse!)}`)}
              style={{
                flexDirection: "row", alignItems: "center", padding: 16,
                borderTopWidth: 1, borderTopColor: Colors.BORDER,
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 14 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>Adresse</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: Colors.TEXT, marginTop: 2 }}>
                  {shelter.adresse}
                </Text>
              </View>
              <Text style={{ color: Colors.TEXT_MUTED }}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Available Dogs */}
        {pets.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, marginBottom: 14 }}>
              🐾 Verfügbare Hunde ({pets.length})
            </Text>
            <View style={{ gap: 10 }}>
              {pets.map((pet) => (
                <View
                  key={pet.id}
                  style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: Colors.SURFACE, borderRadius: 14, padding: 12,
                    borderWidth: 1, borderColor: Colors.BORDER,
                  }}
                >
                  {pet.photo ? (
                    <Image
                      source={{ uri: pet.photo }}
                      style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: Colors.BORDER, marginRight: 12 }}
                    />
                  ) : (
                    <View style={{
                      width: 56, height: 56, borderRadius: 12,
                      backgroundColor: Colors.BORDER, alignItems: "center", justifyContent: "center", marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 26 }}>🐶</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT }}>{pet.name}</Text>
                    <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                      {[pet.rasse, formatAlter(pet.alter_jahre, pet.alter_monate)].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: Colors.SUCCESS + "20", paddingHorizontal: 10, paddingVertical: 4,
                    borderRadius: 99,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.SUCCESS }}>Verfügbar</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {pets.length === 0 && (
          <View style={{ alignItems: "center", padding: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🐾</Text>
            <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center" }}>
              Aktuell sind keine Tiere verfügbar.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
