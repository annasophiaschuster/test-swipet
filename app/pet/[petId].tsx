import { useEffect, useRef, useState } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { formatAlter, formatGroesse } from "../../lib/matching";
import type { PetWithPhotos } from "../../components/PetCard";

const { width: W } = Dimensions.get("window");

const ERFAHRUNG_MAP: Record<string, string> = {
  anfaenger:      "🌱 Geeignet für Einsteiger",
  fortgeschritten:"⭐ Erfahrene Halter",
  profi:          "🏆 Nur für Profis",
};

export default function PetProfileScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [pet, setPet]       = useState<PetWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]  = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => { if (petId) loadPet(); }, [petId]);

  const loadPet = async () => {
    try {
      const { data, error } = await supabase
        .from("pets")
        .select("*, pet_photos(*), shelter:profiles!shelter_id(name, city)")
        .eq("id", petId)
        .single();
      if (error) throw error;
      setPet({
        ...data,
        photos: (data.pet_photos ?? []).sort((a: any, b: any) => a.position - b.position),
        shelter_name: (data.shelter as any)?.name ?? null,
        shelter_city: (data.shelter as any)?.city ?? null,
      });
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (richtung: "ja" | "nein") => {
    if (!pet || saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.back(); return; }

      await supabase.from("adoption_swipes").upsert({
        adoptant_id: user.id,
        pet_id: pet.id,
        richtung,
        warnung_ignoriert: false,
      });

      if (richtung === "ja") {
        const { data: match } = await supabase
          .from("adoption_matches")
          .insert({ adoptant_id: user.id, pet_id: pet.id, shelter_id: pet.shelter_id })
          .select("id")
          .single();

        Alert.alert(
          "🎉 Es ist ein Match!",
          `Du hast ${pet.name} geliked!\nDas Tierheim wird sich bald melden.`,
          [
            {
              text: "💬 Chat öffnen",
              onPress: () =>
                router.replace({
                  pathname: "/(tabs)/matches/[matchId]",
                  params: {
                    matchId: match?.id ?? "",
                    petName: pet.name,
                    petPhoto: pet.photos?.[0]?.url ?? "",
                    shelterName: pet.shelter_name ?? "",
                  },
                }),
            },
            { text: "Zurück", style: "cancel", onPress: () => router.back() },
          ]
        );
      } else {
        router.back();
      }
    } catch (e: any) {
      Alert.alert("Fehler", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.PRIMARY} size="large" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.TEXT_MUTED }}>Tier nicht gefunden.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.PRIMARY, fontWeight: "700" }}>← Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos = pet.photos ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>

      {/* Back Button (floating) */}
      <View style={{ position: "absolute", top: 56, left: 16, zIndex: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "700", marginTop: -2 }}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView bounces showsVerticalScrollIndicator={false}>

        {/* ── FOTO GALERIE ── */}
        <View style={{ height: W, position: "relative" }}>
          <FlatList
            ref={flatRef}
            data={photos.length > 0 ? photos : [null]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onScroll={(e) =>
              setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / W))
            }
            scrollEventThrottle={16}
            renderItem={({ item }) =>
              item ? (
                <Image
                  source={{ uri: item.url }}
                  style={{ width: W, height: W }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: W, height: W, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 96 }}>🐶</Text>
                </View>
              )
            }
          />

          {/* Shelter badge */}
          {pet.shelter_name && (
            <View style={{
              position: "absolute", bottom: 16, left: 16,
              backgroundColor: "rgba(0,0,0,0.55)",
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
            }}>
              <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>
                🏠 {pet.shelter_name}
                {pet.shelter_city ? ` · ${pet.shelter_city}` : ""}
              </Text>
            </View>
          )}

          {/* Foto-Punkte */}
          {photos.length > 1 && (
            <View style={{
              position: "absolute", bottom: 16, right: 16,
              flexDirection: "row", gap: 5,
            }}>
              {photos.map((_, i) => (
                <View key={i} style={{
                  width: i === photoIdx ? 18 : 7, height: 7,
                  borderRadius: 4,
                  backgroundColor: i === photoIdx ? "#FFF" : "rgba(255,255,255,0.5)",
                }} />
              ))}
            </View>
          )}
        </View>

        {/* ── DETAILS ── */}
        <View style={{ padding: 20 }}>

          {/* Name + Alter */}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 30, fontWeight: "800", color: Colors.TEXT }}>
              {pet.name}
            </Text>
            <Text style={{ fontSize: 16, color: Colors.TEXT_MUTED }}>
              {formatAlter(pet.alter_jahre, pet.alter_monate)}
            </Text>
            <Text style={{ fontSize: 16, color: Colors.TEXT_MUTED }}>
              {pet.geschlecht === "maennlich" ? "♂" : "♀"}
            </Text>
          </View>

          {/* Rasse + Größe */}
          <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, marginBottom: 16 }}>
            {[pet.rasse, formatGroesse(pet.groesse_kategorie)].filter(Boolean).join(" · ")}
          </Text>

          {/* Beschreibung */}
          {pet.beschreibung && (
            <View style={{
              backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_LG,
              padding: 14, marginBottom: 20,
              borderLeftWidth: 3, borderLeftColor: Colors.PRIMARY,
            }}>
              <Text style={{ fontSize: 14, color: Colors.TEXT, lineHeight: 22 }}>
                {pet.beschreibung}
              </Text>
            </View>
          )}

          {/* Charakter Tags */}
          {pet.charakter_tags && pet.charakter_tags.length > 0 && (
            <Section title="Charakter">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {pet.charakter_tags.map((tag) => (
                  <View key={tag} style={{
                    paddingHorizontal: 12, paddingVertical: 6,
                    backgroundColor: "#FFF0F3", borderRadius: 99,
                    borderWidth: 1, borderColor: Colors.BORDER,
                  }}>
                    <Text style={{ fontSize: 13, color: Colors.PRIMARY, fontWeight: "600" }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* Eigenschaften */}
          <Section title="Eigenschaften">
            <View style={{ gap: 0 }}>
              <PropRow icon="🌿" label="Braucht Garten"              value={pet.braucht_garten ? "Ja" : "Nein"} ok={!pet.braucht_garten} />
              <PropRow icon="✂️" label="Kastriert"                   value={pet.kastriert ? "Ja" : "Nein"}        ok={pet.kastriert} />
              <PropRow icon="👦" label="Kinderfreundlich"             value={KINDER_MAP[pet.kinderfreundlich ?? ""] ?? "–"} ok={pet.kinderfreundlich !== "nein"} />
              <PropRow icon="🐾" label="Verträglich mit anderen Tieren" value={pet.vertraeglich_mit_tieren ? "Ja" : "Nein"} ok={pet.vertraeglich_mit_tieren} />
              <PropRow icon="🏃" label="Aktivitätslevel"              value={AKTIV_MAP[pet.aktivitaetslevel ?? ""] ?? "–"} ok />
              {pet.erfahrung_benoetigt && (
                <PropRow icon="📚" label="Erfahrung"                  value={ERFAHRUNG_MAP[pet.erfahrung_benoetigt] ?? "–"} ok={pet.erfahrung_benoetigt === "anfaenger"} />
              )}
            </View>
          </Section>

          {/* Im Heim seit */}
          {pet.im_heim_seit && (
            <Section title="Im Tierheim seit">
              <Text style={{ fontSize: 14, color: Colors.TEXT }}>{pet.im_heim_seit}</Text>
            </Section>
          )}

        </View>

        {/* Spacer für die floating Buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── LIKE / NOPE BUTTONS ── */}
      <View
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingBottom: 36,
          paddingTop: 14,
          gap: 14,
          backgroundColor: Colors.WHITE,
          borderTopWidth: 1,
          borderTopColor: Colors.BORDER,
        }}
      >
        <TouchableOpacity
          onPress={() => handleAction("nein")}
          disabled={saving}
          style={{
            flex: 1, height: 56,
            borderRadius: Sizes.RADIUS_FULL,
            backgroundColor: Colors.WHITE,
            alignItems: "center", justifyContent: "center",
            borderWidth: 2, borderColor: "#FF4458",
            shadowColor: "#FF4458", shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#FF4458" }}>✕ Nope</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleAction("ja")}
          disabled={saving}
          style={{
            flex: 1, height: 56,
            borderRadius: Sizes.RADIUS_FULL,
            backgroundColor: Colors.PRIMARY,
            alignItems: "center", justifyContent: "center",
            shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          {saving
            ? <ActivityIndicator color={Colors.WHITE} />
            : <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.WHITE }}>❤️ Like</Text>
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const KINDER_MAP: Record<string, string> = {
  ja:           "Ja, kinderfreundlich",
  nein:         "Nicht kinderfreundlich",
  ab_schulalter:"Ab Schulalter",
  ab_teenager:  "Ab Teenager",
};

const AKTIV_MAP: Record<string, string> = {
  sportlich: "🏃 Sehr aktiv",
  mittel:    "🚶 Mäßig aktiv",
  ruhig:     "🛋 Ruhig",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function PropRow({ icon, label, value, ok }: { icon: string; label: string; value: string; ok: boolean }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingVertical: 11,
      borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
    }}>
      <Text style={{ fontSize: 16, marginRight: 10 }}>{icon}</Text>
      <Text style={{ flex: 1, fontSize: 14, color: Colors.TEXT_MUTED }}>{label}</Text>
      <Text style={{
        fontSize: 13, fontWeight: "600",
        color: ok ? "#2E7D32" : Colors.TEXT_MUTED,
      }}>
        {value}
      </Text>
    </View>
  );
}
