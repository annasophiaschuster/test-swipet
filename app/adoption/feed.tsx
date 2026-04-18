import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import type { PetWithPhotos } from "../../components/PetCard";
import WarningModal from "../../components/WarningModal";
import FilterModal, { FilterState, DEFAULT_FILTER } from "../(tabs)/swipe/filter";
import { checkAdoptionCompatibility, formatAlter, formatGroesse } from "../../lib/matching";
import type { Database } from "../../lib/supabase";
import { sendAdoptionMatchNotification } from "../../lib/notifications";
import { useLanguage } from "../../contexts/LanguageContext";

type AdoptantProfile = Database["public"]["Tables"]["adoptant_profiles"]["Row"];

const { width: W } = Dimensions.get("window");


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
      backgroundColor: Colors.PRIMARY + "12",
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
        <Text style={{ fontSize: 14, color: Colors.TEXT, fontWeight: "500" }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: "700", color: ok ? Colors.SUCCESS : Colors.ERROR }}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onReload }: { onReload: () => void }) {
  const { t } = useLanguage();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🐾</Text>
      <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
        {t.adoption_empty_title}
      </Text>
      <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
        {t.adoption_empty_sub}
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
          {t.adoption_reload}
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
  const { t } = useLanguage();
  const formatAlterLocal = (jahre?: number | null, monate?: number | null): string => {
    if (jahre && jahre >= 1) return jahre === 1 ? `1 ${t.tierheim_age_year}` : `${jahre} ${t.tierheim_age_years}`;
    if (monate) return `${monate} ${t.tierheim_age_months}`;
    return t.tierheim_age_puppy;
  };
  const formatGroesseLocal = (groesse?: string | null): string => {
    const map: Record<string, string> = {
      klein: t.gassi_size_small_label, mittel: t.gassi_size_medium_label,
      gross: t.gassi_size_large_label, riese: t.gassi_size_giant_label,
    };
    return map[groesse ?? ""] ?? groesse ?? "";
  };
  const AKTIV_MAP: Record<string, string> = {
    sportlich: t.adoption_activity_very,
    mittel: t.adoption_activity_medium,
    ruhig: t.adoption_activity_calm,
  };
  const KINDER_MAP: Record<string, string> = {
    ja: t.adoption_children_yes,
    nein: t.adoption_children_no,
    ab_schulalter: t.adoption_children_school,
    ab_teenager: t.adoption_children_teen,
  };
  const ERFAHRUNG_MAP: Record<string, string> = {
    anfaenger: t.adoption_exp_beginner,
    fortgeschritten: t.adoption_exp_experienced,
    profi: t.adoption_exp_pro,
  };
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
        </View>

        {/* 2. Name + Alter + Geschlecht + Rasse + Beschreibung */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.TEXT }}>{pet.name}</Text>
            <Text style={{ fontSize: 17, color: Colors.TEXT_MUTED }}>{formatAlterLocal(pet.alter_jahre, pet.alter_monate)}</Text>
            <Text style={{ fontSize: 17, color: Colors.TEXT_MUTED }}>{pet.geschlecht === "maennlich" ? "♂" : "♀"}</Text>
          </View>
          <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, marginBottom: pet.beschreibung ? 14 : 0 }}>
            {[pet.rasse, formatGroesseLocal(pet.groesse_kategorie)].filter(Boolean).join(" · ")}
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
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{t.adoption_feed_char_label}</Text>
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
          <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>{t.adoption_feed_props_label}</Text>
          <PropRow icon="🌿" label={t.pet_label_garden}         value={pet.braucht_garten ? t.adoption_feed_garden_yes : t.adoption_feed_garden_no}           ok={!pet.braucht_garten} />
          <PropRow icon="✂️" label={t.pet_label_neutered}              value={pet.kastriert ? t.adoption_feed_garden_yes : t.adoption_feed_garden_no}                ok={!!pet.kastriert} />
          <PropRow icon="👦" label={t.pet_label_children}       value={KINDER_MAP[pet.kinderfreundlich ?? ""] ?? "–"}  ok={pet.kinderfreundlich !== "nein"} />
          <PropRow icon="🐾" label={t.pet_label_animals} value={pet.vertraeglich_mit_tieren ? t.adoption_feed_garden_yes : t.adoption_feed_garden_no}   ok={!!pet.vertraeglich_mit_tieren} />
          <PropRow icon="🏃" label={t.pet_label_activity}        value={AKTIV_MAP[pet.aktivitaetslevel ?? ""] ?? "–"}  ok />
          {pet.erfahrung_benoetigt && (
            <PropRow icon="📚" label={t.pet_label_exp} value={ERFAHRUNG_MAP[pet.erfahrung_benoetigt] ?? "–"} ok={pet.erfahrung_benoetigt === "anfaenger"} />
          )}
          {pet.im_heim_seit && (
            <PropRow icon="📅" label={t.adoption_feed_in_shelter_since} value={pet.im_heim_seit} ok />
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
            <Text style={{ fontSize: 13, color: Colors.PRIMARY }}>{t.adoption_feed_shelter_link}</Text>
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
  const { t } = useLanguage();
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

  const [newsletterVisible, setNewsletterVisible] = useState(false);

  useEffect(() => { loadUserInfo(); }, []);

  useEffect(() => {
    AsyncStorage.getItem("show_newsletter_popup").then((val) => {
      if (val === "true") {
        setNewsletterVisible(true);
        AsyncStorage.removeItem("show_newsletter_popup");
      }
    });
  }, []);

  const handleNewsletterResponse = async (subscribe: boolean) => {
    setNewsletterVisible(false);
    if (subscribe) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ newsletter: true }).eq("id", user.id);
      }
    }
  };

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
      if (currentFilter.geschlecht !== "alle")
        query = query.eq("geschlecht", currentFilter.geschlecht);
      if (currentFilter.aktivitaetslevel.length > 0)
        query = query.in("aktivitaetslevel", currentFilter.aktivitaetslevel);
      if (currentFilter.kinderfreundlich === "ja")
        query = query.neq("kinderfreundlich", "nein");
      if (currentFilter.braucht_garten === "nein")
        query = query.eq("braucht_garten", false);
      if (currentFilter.braucht_garten === "ja")
        query = query.eq("braucht_garten", true);
      if (currentFilter.vertraeglich === "ja")
        query = query.eq("vertraeglich_mit_tieren", true);
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
      <LinearGradient
        colors={[Colors.SECONDARY, Colors.PRIMARY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <View style={{ width: 60 }} />
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.WHITE }}>🐾 {t.tab_discover}</Text>
        <View style={{ width: 60 }} />
      </LinearGradient>

      {/* Loading */}
      {loading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.PRIMARY} size="large" />
          <Text style={{ color: Colors.TEXT_MUTED, marginTop: 12 }}>{t.adoption_feed_loading}</Text>
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
              {t.adoption_feed_match_title}
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
              {t.adoption_feed_match_sub(matchPet?.shelter_name ?? t.matches_shelter_fallback)}
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
                {t.adoption_feed_msg_btn}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMatchVisible(false)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>{t.adoption_feed_later}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Newsletter Popup */}
      <Modal transparent visible={newsletterVisible} animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ backgroundColor: Colors.WHITE, borderRadius: 24, padding: 28, width: "85%", alignItems: "center" }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🐾</Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
              Bleib auf dem Laufenden!
            </Text>
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
              Erhalte Neuigkeiten über neue Hunde in deiner Nähe und hilfreiche Tipps zur Adoption.
            </Text>
            <TouchableOpacity
              onPress={() => handleNewsletterResponse(true)}
              style={{ width: "100%", paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.PRIMARY, alignItems: "center", marginBottom: 10 }}
            >
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>Ja, ich möchte den Newsletter</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNewsletterResponse(false)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: 14 }}>Nein danke</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
