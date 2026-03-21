import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  Image,
  ScrollView,
  PanResponder,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import type { PetWithPhotos } from "../../components/PetCard";
import WarningModal from "../../components/WarningModal";
import FilterModal, { FilterState, DEFAULT_FILTER } from "../(tabs)/swipe/filter";
import { checkAdoptionCompatibility, formatAlter, formatGroesse } from "../../lib/matching";
import type { Database } from "../../lib/supabase";
import { sendAdoptionMatchNotification } from "../../lib/notifications";

type AdoptantProfile = Database["public"]["Tables"]["adoptant_profiles"]["Row"];

const { width: W } = Dimensions.get("window");

const AKTIV_MAP: Record<string, string> = {
  sportlich: "🏃 Sehr aktiv",
  mittel: "🚶 Mäßig aktiv",
  ruhig: "🛋 Ruhig",
};
const KINDER_MAP: Record<string, string> = {
  ja: "Ja",
  nein: "Nicht kinderfreundlich",
  ab_schulalter: "Ab Schulalter",
  ab_teenager: "Ab Teenager",
};
const ERFAHRUNG_MAP: Record<string, string> = {
  anfaenger: "🌱 Einsteiger",
  fortgeschritten: "⭐ Erfahren",
  profi: "🏆 Nur Profis",
};

// ─────────────────────────────────────────────────────────────────────────────
// PropRow
// ─────────────────────────────────────────────────────────────────────────────

function PropRow({
  icon, label, value, ok,
}: {
  icon: string;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
    }}>
      <Text style={{ fontSize: 14, color: Colors.TEXT }}>
        {icon}  {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: ok ? Colors.SUCCESS : Colors.ERROR }}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onReload }: { onReload: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🐾</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        Keine Tiere mehr
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
        Du hast alle Tiere in deiner Nähe gesehen. Schau später nochmal vorbei!
      </Text>
      <TouchableOpacity
        onPress={onReload}
        style={{
          height: Sizes.BUTTON_HEIGHT, paddingHorizontal: 28,
          backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
          Nochmal laden
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdoptionPetView — full Tinder-style card with scroll + swipe
// ─────────────────────────────────────────────────────────────────────────────

function AdoptionPetView({
  pet, saving, onAction,
}: {
  pet: PetWithPhotos;
  saving: boolean;
  onAction: (r: "ja" | "nein") => void;
}) {
  const photos = pet.photos ?? [];

  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-W / 2, 0, W / 2],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, W / 4], outputRange: [0, 1], extrapolate: "clamp",
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-W / 4, 0], outputRange: [1, 0], extrapolate: "clamp",
  });

  const onActionRef = useRef(onAction);
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);

  const flyOff = (direction: "ja" | "nein") => {
    if (saving) return;
    Animated.timing(position, {
      toValue: { x: direction === "ja" ? W + 150 : -(W + 150), y: 20 },
      duration: 260, useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onActionRef.current(direction);
    });
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8 && Math.abs(gs.dx) > 15,
    onPanResponderGrant: () => {
      position.setOffset({
        x: (position.x as any)._value,
        y: (position.y as any)._value,
      });
    },
    onPanResponderMove: Animated.event(
      [null, { dx: position.x, dy: position.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gs) => {
      position.flattenOffset();
      if (gs.dx > 100 || gs.vx > 0.4) {
        Animated.timing(position, {
          toValue: { x: W + 150, y: gs.dy },
          duration: 240, useNativeDriver: false,
        }).start(() => { position.setValue({ x: 0, y: 0 }); onActionRef.current("ja"); });
      } else if (gs.dx < -100 || gs.vx < -0.4) {
        Animated.timing(position, {
          toValue: { x: -(W + 150), y: gs.dy },
          duration: 240, useNativeDriver: false,
        }).start(() => { position.setValue({ x: 0, y: 0 }); onActionRef.current("nein"); });
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 }, friction: 5, tension: 40, useNativeDriver: false,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      position.flattenOffset();
      Animated.spring(position, {
        toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false,
      }).start();
    },
  })).current;

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX: position.x }, { translateY: position.y }, { rotate: rotation }],
      }}
      {...panResponder.panHandlers}
    >
      {/* LIKE Stamp */}
      <Animated.View pointerEvents="none" style={{
        position: "absolute", top: 52, left: 20, zIndex: 20,
        opacity: likeOpacity, transform: [{ rotate: "-20deg" }],
      }}>
        <View style={{ borderWidth: 3, borderColor: "#00C853", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(0,200,83,0.1)" }}>
          <Text style={{ fontSize: 26, fontWeight: "900", color: "#00C853", letterSpacing: 2 }}>❤️ LIKE</Text>
        </View>
      </Animated.View>

      {/* NOPE Stamp */}
      <Animated.View pointerEvents="none" style={{
        position: "absolute", top: 52, right: 20, zIndex: 20,
        opacity: nopeOpacity, transform: [{ rotate: "20deg" }],
      }}>
        <View style={{ borderWidth: 3, borderColor: "#FF4458", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,68,88,0.1)" }}>
          <Text style={{ fontSize: 26, fontWeight: "900", color: "#FF4458", letterSpacing: 2 }}>NOPE ✕</Text>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} bounces style={{ flex: 1 }}>

        {/* 1. Hauptfoto */}
        <View style={{ height: W * 1.15, position: "relative" }}>
          {photos[0] ? (
            <Image source={{ uri: photos[0].url }} style={{ width: W, height: W * 1.15 }} resizeMode="cover" />
          ) : (
            <View style={{ width: W, height: W * 1.15, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 96 }}>🐶</Text>
            </View>
          )}
          {photos.length > 1 && (
            <View style={{ position: "absolute", top: 14, right: 14, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>1 / {photos.length}</Text>
            </View>
          )}
        </View>

        {/* 2. Name + Alter + Geschlecht + Rasse + Beschreibung */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.TEXT }}>{pet.name}</Text>
            <Text style={{ fontSize: 17, color: Colors.TEXT_MUTED }}>{formatAlter(pet.alter_jahre, pet.alter_monate)}</Text>
            <Text style={{ fontSize: 17, color: Colors.TEXT_MUTED }}>{pet.geschlecht === "maennlich" ? "♂" : "♀"}</Text>
          </View>
          <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, marginBottom: pet.beschreibung ? 14 : 0 }}>
            {[pet.rasse, formatGroesse(pet.groesse_kategorie)].filter(Boolean).join(" · ")}
          </Text>
          {pet.beschreibung && (
            <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 24 }}>{pet.beschreibung}</Text>
          )}
        </View>

        {/* 3. Zweites Foto */}
        {photos[1] && (
          <Image source={{ uri: photos[1].url }} style={{ width: W, height: W * 0.72 }} resizeMode="cover" />
        )}

        {/* 4. Charakter-Tags */}
        {pet.charakter_tags && pet.charakter_tags.length > 0 && (
          <View style={{ padding: 20, paddingTop: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Charakter</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {pet.charakter_tags.map((tag) => (
                <View key={tag} style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#FFF0F3", borderRadius: 99, borderWidth: 1, borderColor: Colors.BORDER }}>
                  <Text style={{ fontSize: 14, color: Colors.PRIMARY, fontWeight: "600" }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 5. Drittes Foto */}
        {photos[2] && (
          <Image source={{ uri: photos[2].url }} style={{ width: W, height: W * 0.72 }} resizeMode="cover" />
        )}

        {/* 6. Eigenschaften */}
        <View style={{ padding: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Eigenschaften</Text>
          <PropRow icon="🌿" label="Braucht Garten"         value={pet.braucht_garten ? "Ja" : "Nein"}           ok={!pet.braucht_garten} />
          <PropRow icon="✂️" label="Kastriert"              value={pet.kastriert ? "Ja" : "Nein"}                ok={!!pet.kastriert} />
          <PropRow icon="👦" label="Kinderfreundlich"       value={KINDER_MAP[pet.kinderfreundlich ?? ""] ?? "–"}  ok={pet.kinderfreundlich !== "nein"} />
          <PropRow icon="🐾" label="Verträglich mit Tieren" value={pet.vertraeglich_mit_tieren ? "Ja" : "Nein"}   ok={!!pet.vertraeglich_mit_tieren} />
          <PropRow icon="🏃" label="Aktivitätslevel"        value={AKTIV_MAP[pet.aktivitaetslevel ?? ""] ?? "–"}  ok />
          {pet.erfahrung_benoetigt && (
            <PropRow icon="📚" label="Erfahrung" value={ERFAHRUNG_MAP[pet.erfahrung_benoetigt] ?? "–"} ok={pet.erfahrung_benoetigt === "anfaenger"} />
          )}
          {pet.im_heim_seit && (
            <PropRow icon="📅" label="Im Heim seit" value={pet.im_heim_seit} ok />
          )}
        </View>

        {/* 7. Tierheim-Info — klickbar → öffentliches Profil */}
        {pet.shelter_name && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/adoption/tierheim/[id]", params: { id: pet.shelter_id } })}
            activeOpacity={0.75}
            style={{ marginHorizontal: 20, marginBottom: 4, padding: 16, backgroundColor: Colors.SURFACE, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text style={{ fontSize: 28 }}>🏠</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.TEXT }}>{pet.shelter_name}</Text>
              {pet.shelter_city && <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 }}>📍 {pet.shelter_city}</Text>}
            </View>
            <Text style={{ fontSize: 13, color: Colors.PRIMARY }}>Profil →</Text>
          </TouchableOpacity>
        )}

        {/* 8. Like / Nope Buttons */}
        <View style={{ flexDirection: "row", gap: 14, padding: 20, paddingTop: 24, paddingBottom: 44 }}>
          <TouchableOpacity
            onPress={() => flyOff("nein")}
            disabled={saving}
            style={{
              flex: 1, height: 62, borderRadius: Sizes.RADIUS_FULL, backgroundColor: Colors.WHITE,
              alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FF4458",
              shadowColor: "#FF4458", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#FF4458" }}>✕  Nope</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => flyOff("ja")}
            disabled={saving}
            style={{
              flex: 1, height: 62, borderRadius: Sizes.RADIUS_FULL, backgroundColor: Colors.PRIMARY,
              alignItems: "center", justifyContent: "center",
              shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            {saving
              ? <ActivityIndicator color={Colors.WHITE} />
              : <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.WHITE }}>❤️  Like</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AdoptionFeed() {
  const [isGuest, setIsGuest]                     = useState(false);
  const [pets, setPets]                           = useState<PetWithPhotos[]>([]);
  const [petIndex, setPetIndex]                   = useState(0);
  const [adoptantProfile, setAdoptantProfile]     = useState<AdoptantProfile | null>(null);
  const [filter, setFilter]                       = useState<FilterState>(DEFAULT_FILTER);
  const [filterVisible, setFilterVisible]         = useState(false);
  const [loading, setLoading]                     = useState(true);
  const [saving, setSaving]                       = useState(false);

  const [warningVisible, setWarningVisible]       = useState(false);
  const [pendingLikeIndex, setPendingLikeIndex]   = useState<number | null>(null);
  const [currentWarnings, setCurrentWarnings]     = useState<string[]>([]);

  const [matchVisible, setMatchVisible]           = useState(false);
  const [matchPet, setMatchPet]                   = useState<PetWithPhotos | null>(null);
  const [matchId, setMatchId]                     = useState<string | null>(null);
  const matchScale   = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadUserInfo(); }, []);

  useEffect(() => {
    setPetIndex(0);
    loadPets();
  }, [filter]);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        return;
      }
      setIsGuest(false);
      const { data: ap } = await supabase
        .from("adoptant_profiles").select("*").eq("id", user.id).single();
      setAdoptantProfile(ap);
    } catch (e) {
      console.error("AdoptionFeed.loadUserInfo", e);
    }
  };

  const loadPets = async (currentFilter = filter) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const swipedIds: string[] = [];
      if (user) {
        const { data: swipes } = await supabase
          .from("adoption_swipes").select("pet_id").eq("adoptant_id", user.id);
        swipes?.forEach((s) => swipedIds.push(s.pet_id));
      }

      let query = supabase
        .from("pets")
        .select("*, pet_photos(*), shelter:profiles!shelter_id(name, city)")
        .eq("status", "verfuegbar")
        .order("created_at", { ascending: false });

      if (currentFilter.tierart !== "alle")
        query = query.eq("tierart", currentFilter.tierart);
      if (currentFilter.groesse.length > 0)
        query = query.in("groesse_kategorie", currentFilter.groesse);
      if (currentFilter.maxAlterJahre < 15)
        query = query.lte("alter_jahre", currentFilter.maxAlterJahre);
      if (swipedIds.length > 0)
        query = query.not("id", "in", `(${swipedIds.join(",")})`);

      const { data, error } = await query;
      if (error) throw error;

      setPets((data ?? []).map((p: any) => ({
        ...p,
        photos: (p.pet_photos ?? []).sort((a: any, b: any) => a.position - b.position),
        shelter_name: p.shelter?.name ?? null,
        shelter_city: p.shelter?.city ?? null,
      })));
      setPetIndex(0);
    } catch (e) {
      console.error("AdoptionFeed.loadPets", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (richtung: "ja" | "nein") => {
    const pet = pets[petIndex];
    if (!pet || saving) return;

    if (isGuest) {
      goToNext();
      return;
    }

    if (richtung === "ja" && adoptantProfile) {
      const { compatible, warnings } = checkAdoptionCompatibility(adoptantProfile, pet);
      if (!compatible) {
        setPendingLikeIndex(petIndex);
        setCurrentWarnings(warnings);
        setWarningVisible(true);
        return;
      }
    }
    await saveSwipe(petIndex, richtung, false);
    goToNext();
  };

  const saveSwipe = async (
    index: number, richtung: "ja" | "nein", warnungIgnoriert: boolean
  ) => {
    const pet = pets[index];
    if (!pet) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("adoption_swipes").upsert({
        adoptant_id: user.id, pet_id: pet.id,
        richtung, warnung_ignoriert: warnungIgnoriert,
      });

      if (richtung === "ja") {
        const { data: match } = await supabase
          .from("adoption_matches")
          .insert({ adoptant_id: user.id, pet_id: pet.id, shelter_id: pet.shelter_id })
          .select("id").single();

        if (match?.id) {
          sendAdoptionMatchNotification({
            shelterUserId: pet.shelter_id, matchId: match.id,
            petName: pet.name, petPhoto: pet.photos?.[0]?.url,
          });
        }
        setMatchPet(pet);
        setMatchId(match?.id ?? null);
        setMatchVisible(true);
        matchScale.setValue(0);
        matchOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(matchScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(matchOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    } catch (e) {
      console.error("AdoptionFeed.saveSwipe", e);
    } finally {
      setSaving(false);
    }
  };

  const goToNext = () => {
    if (petIndex + 1 < pets.length) setPetIndex(petIndex + 1);
    else loadPets();
  };

  const handleWarningConfirm = () => {
    setWarningVisible(false);
    if (pendingLikeIndex !== null) {
      saveSwipe(pendingLikeIndex, "ja", true);
      goToNext();
    }
    setPendingLikeIndex(null);
  };

  const handleWarningCancel = () => {
    setWarningVisible(false);
    setPendingLikeIndex(null);
  };

  const handleFilterApply = (f: FilterState) => {
    setFilter(f);
    setFilterVisible(false);
  };

  const currentPet = pets[petIndex];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>

      {/* Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12,
        backgroundColor: Colors.BACKGROUND,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ fontSize: 18, color: Colors.TEXT_MUTED }}>‹</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.TEXT }}>🐾 Adoption</Text>
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          style={{
            paddingHorizontal: 14, paddingVertical: 7,
            borderRadius: Sizes.RADIUS_FULL, borderWidth: 1.5, borderColor: Colors.BORDER,
            flexDirection: "row", alignItems: "center", gap: 6,
          }}
        >
          <Text style={{ fontSize: 14 }}>⚙️</Text>
          <Text style={{ color: Colors.TEXT, fontWeight: "500", fontSize: Sizes.FONT_SM }}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.PRIMARY} size="large" />
          <Text style={{ color: Colors.TEXT_MUTED, marginTop: 12 }}>Tiere werden geladen…</Text>
        </View>
      )}

      {/* Empty */}
      {!loading && pets.length === 0 && (
        <EmptyState onReload={() => loadPets()} />
      )}

      {/* Feed */}
      {!loading && pets.length > 0 && currentPet && (
        <AdoptionPetView
          key={`pet-${petIndex}`}
          pet={currentPet}
          saving={saving}
          onAction={handleAction}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        filter={filter}
        onApply={handleFilterApply}
        onClose={() => setFilterVisible(false)}
      />

      {/* Warning Modal */}
      <WarningModal
        visible={warningVisible}
        petName={pets[pendingLikeIndex ?? petIndex]?.name ?? ""}
        warnings={currentWarnings}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />

      {/* Match Celebration Modal */}
      <Modal transparent visible={matchVisible} animationType="none">
        <Animated.View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
          alignItems: "center", justifyContent: "center", opacity: matchOpacity,
        }}>
          <Animated.View style={{
            backgroundColor: Colors.WHITE, borderRadius: 28, padding: 32,
            alignItems: "center", width: "82%", transform: [{ scale: matchScale }],
          }}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>🎉</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.PRIMARY, marginBottom: 4 }}>
              Es ist ein Match!
            </Text>
            {matchPet?.photos?.[0]?.url && (
              <Image
                source={{ uri: matchPet.photos[0].url }}
                style={{ width: 100, height: 100, borderRadius: 50, marginVertical: 16, borderWidth: 3, borderColor: Colors.PRIMARY }}
              />
            )}
            <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, marginBottom: 4 }}>
              {matchPet?.name}
            </Text>
            <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              Du und {matchPet?.shelter_name ?? "das Tierheim"} mögen einander — schreib jetzt eine Nachricht!
            </Text>
            <TouchableOpacity
              onPress={() => {
                setMatchVisible(false);
                if (matchId) {
                  router.push({
                    pathname: "/adoption/chat/[matchId]",
                    params: {
                      matchId,
                      petName: matchPet?.name ?? "",
                      petPhoto: matchPet?.photos?.[0]?.url ?? "",
                      shelterName: matchPet?.shelter_name ?? "",
                    },
                  });
                }
              }}
              style={{
                width: "100%", height: Sizes.BUTTON_HEIGHT,
                backgroundColor: Colors.PRIMARY, borderRadius: Sizes.RADIUS_FULL,
                alignItems: "center", justifyContent: "center", marginBottom: 10,
              }}
            >
              <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
                💬 Nachricht schreiben
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMatchVisible(false)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Später</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}
