import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  Image,
} from "react-native";
import { router } from "expo-router";
import Swiper from "react-native-deck-swiper";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import PetCard, { PetWithPhotos, CARD_HEIGHT, CARD_WIDTH } from "../../../components/PetCard";
import OwnerPetCard, { OwnerPetItem, OWNER_CARD_WIDTH, OWNER_CARD_HEIGHT } from "../../../components/OwnerPetCard";
import WarningModal from "../../../components/WarningModal";
import FilterModal, { FilterState, DEFAULT_FILTER } from "./filter";
import { checkAdoptionCompatibility } from "../../../lib/matching";
import type { Database } from "../../../lib/supabase";
import GradientHeader from "../../../components/GradientHeader";
import { sendAdoptionMatchNotification } from "../../../lib/notifications";

type AdoptantProfile = Database["public"]["Tables"]["adoptant_profiles"]["Row"];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SwipeFeed() {
  const [mode, setMode] = useState<"adoption" | "owner">("adoption");
  const [pets, setPets] = useState<PetWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [adoptantProfile, setAdoptantProfile] = useState<AdoptantProfile | null>(null);

  // Warning Modal State
  const [warningVisible, setWarningVisible] = useState(false);
  const [pendingSwipeIndex, setPendingSwipeIndex] = useState<number | null>(null);
  const [currentWarnings, setCurrentWarnings] = useState<string[]>([]);

  // Match Celebration State
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchPet, setMatchPet] = useState<PetWithPhotos | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const matchScale = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  // Owner mode state
  const [ownerPets, setOwnerPets] = useState<OwnerPetItem[]>([]);
  const [ownerCardIndex, setOwnerCardIndex] = useState(0);
  const [myOwnerPet, setMyOwnerPet] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [ownerModus, setOwnerModus] = useState<"gassi" | "spieldate">("gassi");
  const ownerSwiperRef = useRef<Swiper<OwnerPetItem>>(null);

  const swiperRef = useRef<Swiper<PetWithPhotos>>(null);

  useEffect(() => {
    loadAdoptantProfile();
    loadMyOwnerPet();
  }, []);

  useEffect(() => {
    loadPets();
  }, [filter]);

  useEffect(() => {
    if (mode === "owner") loadOwnerPets();
  }, [mode, ownerModus]);

  const loadAdoptantProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("adoptant_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setAdoptantProfile(data);
    } catch (_) {}
  };

  const loadMyOwnerPet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMyOwnerPet(null); return; }
      const { data } = await supabase
        .from("owner_pets")
        .select("id, name")
        .eq("owner_id", user.id)
        .limit(1)
        .single();
      setMyOwnerPet(data ?? null);
    } catch (_) { setMyOwnerPet(null); }
  };

  const loadOwnerPets = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Already swiped
      const swipedIds: string[] = [];
      if (user) {
        const { data: swipes } = await supabase
          .from("owner_swipes")
          .select("target_pet_id")
          .eq("swiper_id", user.id)
          .eq("modus", ownerModus);
        swipes?.forEach((s) => swipedIds.push(s.target_pet_id));
      }

      let query = supabase
        .from("owner_pets")
        .select("*, owner:profiles!owner_id(name, city)")
        .order("created_at", { ascending: false });

      if (user) query = query.neq("owner_id", user.id);
      if (swipedIds.length > 0) query = query.not("id", "in", `(${swipedIds.join(",")})`);

      const { data } = await query;
      const items: OwnerPetItem[] = (data ?? []).map((p: any) => ({
        ...p,
        owner_name: p.owner?.name ?? null,
        owner_city: p.owner?.city ?? null,
      }));
      setOwnerPets(items);
      setOwnerCardIndex(0);
    } catch (e) {
      console.error("loadOwnerPets error", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPets = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Bereits geswifte Tiere laden
      const swipedIds: string[] = [];
      if (user) {
        const { data: swipes } = await supabase
          .from("adoption_swipes")
          .select("pet_id")
          .eq("adoptant_id", user.id);
        swipes?.forEach((s) => swipedIds.push(s.pet_id));
      }

      let query = supabase
        .from("pets")
        .select(`*, pet_photos(*), shelter:profiles!shelter_id(name, city)`)
        .eq("status", "verfuegbar")
        .order("created_at", { ascending: false });

      if (filter.tierart !== "alle") {
        query = query.eq("tierart", filter.tierart);
      }
      if (filter.groesse.length > 0) {
        query = query.in("groesse_kategorie", filter.groesse);
      }
      if (filter.maxAlterJahre < 15) {
        query = query.lte("alter_jahre", filter.maxAlterJahre);
      }
      if (swipedIds.length > 0) {
        query = query.not("id", "in", `(${swipedIds.join(",")})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const petsWithPhotos: PetWithPhotos[] = (data ?? []).map((p: any) => ({
        ...p,
        photos: (p.pet_photos ?? []).sort((a: any, b: any) => a.position - b.position),
        shelter_name: p.shelter?.name ?? null,
        shelter_city: p.shelter?.city ?? null,
      }));

      setPets(petsWithPhotos);
      setCardIndex(0);
    } catch (e) {
      console.error("loadPets error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeRight = useCallback(
    (index: number) => {
      const pet = pets[index];
      if (!pet || !adoptantProfile) {
        saveSwipe(index, "ja", false);
        return;
      }
      const { compatible, warnings } = checkAdoptionCompatibility(adoptantProfile, pet);
      if (!compatible) {
        setPendingSwipeIndex(index);
        setCurrentWarnings(warnings);
        setWarningVisible(true);
      } else {
        saveSwipe(index, "ja", false);
      }
    },
    [pets, adoptantProfile]
  );

  const handleSwipeLeft = useCallback(
    (index: number) => {
      saveSwipe(index, "nein", false);
    },
    [pets]
  );

  const saveSwipe = async (
    index: number,
    richtung: "ja" | "nein",
    warnungIgnoriert: boolean
  ) => {
    const pet = pets[index];
    if (!pet) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("adoption_swipes").upsert({
        adoptant_id: user.id,
        pet_id: pet.id,
        richtung,
        warnung_ignoriert: warnungIgnoriert,
      });

      if (richtung === "ja") {
        const { data: match } = await supabase
          .from("adoption_matches")
          .insert({
            adoptant_id: user.id,
            pet_id: pet.id,
            shelter_id: pet.shelter_id,
          })
          .select("id")
          .single();

        // Notify shelter about new match (fire-and-forget)
        if (match?.id) {
          sendAdoptionMatchNotification({
            shelterUserId: pet.shelter_id,
            matchId: match.id,
            petName: pet.name,
            petPhoto: pet.photos?.[0]?.url,
          });
        }

        // Show match celebration
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
      console.error("saveSwipe error", e);
    }
  };

  const handleWarningConfirm = () => {
    setWarningVisible(false);
    if (pendingSwipeIndex !== null) {
      saveSwipe(pendingSwipeIndex, "ja", true);
    }
    setPendingSwipeIndex(null);
  };

  const handleWarningCancel = () => {
    setWarningVisible(false);
    setPendingSwipeIndex(null);
    // Karte zurücklegen
    swiperRef.current?.swipeBack();
  };

  const handleOwnerSwipeRight = useCallback(async (index: number) => {
    const targetPet = ownerPets[index];
    if (!targetPet || !myOwnerPet) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save swipe
      await supabase.from("owner_swipes").upsert({
        swiper_id: user.id,
        swiper_pet_id: myOwnerPet.id,
        target_id: targetPet.owner_id,
        target_pet_id: targetPet.id,
        richtung: "ja",
        modus: ownerModus,
      });

      // Check if target already swiped right on my pet
      const { data: mutual } = await supabase
        .from("owner_swipes")
        .select("id")
        .eq("swiper_id", targetPet.owner_id)
        .eq("target_pet_id", myOwnerPet.id)
        .eq("richtung", "ja")
        .eq("modus", ownerModus)
        .limit(1);

      if (mutual && mutual.length > 0) {
        // Create mutual match
        const { data: match } = await supabase
          .from("owner_matches")
          .insert({
            pet_a_id: myOwnerPet.id,
            pet_b_id: targetPet.id,
            owner_a_id: user.id,
            owner_b_id: targetPet.owner_id,
            modus: ownerModus,
          })
          .select("id")
          .single();

        // Show celebration
        setMatchPet({ ...targetPet, photos: [], shelter_name: targetPet.owner_name ?? null, shelter_city: targetPet.owner_city ?? null } as any);
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
      console.error("handleOwnerSwipeRight error", e);
    }
  }, [ownerPets, myOwnerPet, ownerModus]);

  const handleOwnerSwipeLeft = useCallback(async (index: number) => {
    const targetPet = ownerPets[index];
    if (!targetPet || !myOwnerPet) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("owner_swipes").upsert({
        swiper_id: user.id,
        swiper_pet_id: myOwnerPet.id,
        target_id: targetPet.owner_id,
        target_pet_id: targetPet.id,
        richtung: "nein",
        modus: ownerModus,
      });
    } catch (e) {
      console.error("handleOwnerSwipeLeft error", e);
    }
  }, [ownerPets, myOwnerPet, ownerModus]);

  const currentPet = pets[cardIndex];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: Sizes.SPACING_LG,
          paddingBottom: 12,
          backgroundColor: Colors.BACKGROUND,
          borderBottomWidth: 1,
          borderBottomColor: Colors.BORDER,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>
          🐾 Swipet
        </Text>
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: Sizes.RADIUS_FULL,
            borderWidth: 1.5,
            borderColor: Colors.BORDER,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 14 }}>⚙️</Text>
          <Text style={{ color: Colors.TEXT, fontWeight: "500", fontSize: Sizes.FONT_SM }}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode Toggle */}
      <View style={{ flexDirection: "row", margin: 16, backgroundColor: Colors.SURFACE, borderRadius: Sizes.RADIUS_FULL, padding: 4 }}>
        {(["adoption", "owner"] as const).map((m) => (
          <TouchableOpacity key={m} onPress={() => setMode(m)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: Sizes.RADIUS_FULL, backgroundColor: mode === m ? Colors.PRIMARY : "transparent", alignItems: "center" }}>
            <Text style={{ color: mode === m ? Colors.WHITE : Colors.TEXT_MUTED, fontWeight: mode === m ? "700" : "400", fontSize: Sizes.FONT_SM }}>
              {m === "adoption" ? "❤️ Adoption" : "🐾 Gassi & Spieldate"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Owner Mode Sub-toggle */}
      {mode === "owner" && (
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 8, gap: 8 }}>
          {(["gassi", "spieldate"] as const).map((m) => (
            <TouchableOpacity key={m} onPress={() => setOwnerModus(m)}
              style={{ flex: 1, paddingVertical: 7, borderRadius: Sizes.RADIUS_FULL, backgroundColor: ownerModus === m ? Colors.SECONDARY : Colors.SURFACE, alignItems: "center", borderWidth: 1.5, borderColor: ownerModus === m ? Colors.SECONDARY : Colors.BORDER }}>
              <Text style={{ color: ownerModus === m ? Colors.WHITE : Colors.TEXT_MUTED, fontWeight: "600", fontSize: 12 }}>
                {m === "gassi" ? "🦮 Gassi-Partner" : "🎾 Spieldate"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Owner mode: no pet registered */}
      {mode === "owner" && myOwnerPet === null && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🐾</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            Registriere dein Haustier
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
            Um Gassi- und Spieldate-Partner zu finden, musst du zuerst dein eigenes Tier registrieren.
          </Text>
          <TouchableOpacity onPress={() => router.push("/auth/onboarding/tierhalter")}
            style={{ height: Sizes.BUTTON_HEIGHT, paddingHorizontal: 28, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>Tier registrieren</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Owner mode deck */}
      {mode === "owner" && myOwnerPet !== null && myOwnerPet !== undefined && (
        loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.SECONDARY} size="large" />
            <Text style={{ color: Colors.TEXT_MUTED, marginTop: 12 }}>Tiere werden geladen…</Text>
          </View>
        ) : ownerPets.length === 0 ? (
          <EmptyState onReload={loadOwnerPets} />
        ) : (
          <View style={{ flex: 1 }}>
            <Swiper
              ref={ownerSwiperRef}
              cards={ownerPets}
              cardIndex={ownerCardIndex}
              renderCard={(pet) => <OwnerPetCard pet={pet} modus={ownerModus} />}
              onSwipedRight={handleOwnerSwipeRight}
              onSwipedLeft={handleOwnerSwipeLeft}
              onSwipedAll={loadOwnerPets}
              onSwiped={(i) => setOwnerCardIndex(i + 1)}
              backgroundColor="transparent"
              stackSize={3}
              stackScale={8}
              stackSeparation={14}
              disableBottomSwipe
              disableTopSwipe
              animateOverlayLabelsOpacity
              overlayLabels={{
                left: { title: "NOPE", style: { label: { backgroundColor: "#FF4458", borderColor: "#FF4458", color: Colors.WHITE, borderWidth: 1, fontSize: 24, fontWeight: "800", padding: 8, borderRadius: 8 }, wrapper: { flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-start", marginTop: 30, marginLeft: -30 } } },
                right: { title: "LIKE", style: { label: { backgroundColor: Colors.SECONDARY, borderColor: Colors.SECONDARY, color: Colors.WHITE, borderWidth: 1, fontSize: 24, fontWeight: "800", padding: 8, borderRadius: 8 }, wrapper: { flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", marginTop: 30, marginLeft: 30 } } },
              }}
              cardStyle={{ top: 0, left: 16 }}
              containerStyle={{ flex: 1 }}
            />
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 24, paddingBottom: 16, paddingTop: 8 }}>
              <TouchableOpacity onPress={() => ownerSwiperRef.current?.swipeLeft()}
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.WHITE, alignItems: "center", justifyContent: "center", shadowColor: "#FF4458", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, borderWidth: 1.5, borderColor: "#FF4458" }}>
                <Text style={{ fontSize: 28 }}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => ownerSwiperRef.current?.swipeRight()}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.SECONDARY, alignItems: "center", justifyContent: "center", shadowColor: Colors.SECONDARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }}>
                <Text style={{ fontSize: 32 }}>🐾</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      )}

      {/* Adoption Deck */}
      {mode === "adoption" && loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.PRIMARY} size="large" />
          <Text style={{ color: Colors.TEXT_MUTED, marginTop: 12 }}>Tiere werden geladen…</Text>
        </View>
      ) : mode === "adoption" && pets.length === 0 ? (
        <EmptyState onReload={loadPets} />
      ) : mode === "adoption" && (
        <View style={{ flex: 1 }}>
          <Swiper
            ref={swiperRef}
            cards={pets}
            cardIndex={cardIndex}
            renderCard={(pet) => <PetCard pet={pet} />}
            onSwipedRight={handleSwipeRight}
            onSwipedLeft={handleSwipeLeft}
            onSwipedAll={loadPets}
            onSwiped={(i) => setCardIndex(i + 1)}
            backgroundColor="transparent"
            stackSize={3}
            stackScale={8}
            stackSeparation={14}
            disableBottomSwipe
            disableTopSwipe
            animateOverlayLabelsOpacity
            overlayLabels={{
              left: {
                title: "NOPE",
                style: {
                  label: {
                    backgroundColor: "#FF4458",
                    borderColor: "#FF4458",
                    color: Colors.WHITE,
                    borderWidth: 1,
                    fontSize: 24,
                    fontWeight: "800",
                    padding: 8,
                    borderRadius: 8,
                  },
                  wrapper: {
                    flexDirection: "column",
                    alignItems: "flex-end",
                    justifyContent: "flex-start",
                    marginTop: 30,
                    marginLeft: -30,
                  },
                },
              },
              right: {
                title: "LIKE",
                style: {
                  label: {
                    backgroundColor: Colors.PRIMARY,
                    borderColor: Colors.PRIMARY,
                    color: Colors.WHITE,
                    borderWidth: 1,
                    fontSize: 24,
                    fontWeight: "800",
                    padding: 8,
                    borderRadius: 8,
                  },
                  wrapper: {
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    marginTop: 30,
                    marginLeft: 30,
                  },
                },
              },
            }}
            cardStyle={{
              top: 0,
              left: 16,
            }}
            containerStyle={{ flex: 1 }}
          />

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 24,
              paddingBottom: 16,
              paddingTop: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => swiperRef.current?.swipeLeft()}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.WHITE,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#FF4458",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
                borderWidth: 1.5,
                borderColor: "#FF4458",
              }}
            >
              <Text style={{ fontSize: 28 }}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => swiperRef.current?.swipeRight()}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: Colors.PRIMARY,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: Colors.PRIMARY,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 32 }}>❤️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      <FilterModal
        visible={filterVisible}
        filter={filter}
        onApply={(f) => { setFilter(f); }}
        onClose={() => setFilterVisible(false)}
      />

      <WarningModal
        visible={warningVisible}
        petName={currentPet?.name ?? ""}
        warnings={currentWarnings}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />

      {/* Match Celebration */}
      <Modal transparent visible={matchVisible} animationType="none">
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            alignItems: "center",
            justifyContent: "center",
            opacity: matchOpacity,
          }}
        >
          <Animated.View
            style={{
              backgroundColor: Colors.WHITE,
              borderRadius: 28,
              padding: 32,
              alignItems: "center",
              width: "82%",
              transform: [{ scale: matchScale }],
            }}
          >
            <Text style={{ fontSize: 52, marginBottom: 8 }}>🎉</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.PRIMARY, marginBottom: 4 }}>
              Es ist ein Match!
            </Text>
            {matchPet?.photos?.[0]?.url && (
              <Image
                source={{ uri: matchPet.photos[0].url }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  marginVertical: 16,
                  borderWidth: 3,
                  borderColor: Colors.PRIMARY,
                }}
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
                    pathname: "/(tabs)/matches/[matchId]",
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
                width: "100%",
                height: Sizes.BUTTON_HEIGHT,
                backgroundColor: Colors.PRIMARY,
                borderRadius: Sizes.RADIUS_FULL,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
                💬 Nachricht schreiben
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMatchVisible(false)}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
                Später
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

function EmptyState({ onReload }: { onReload: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🐾</Text>
      <Text
        style={{
          fontSize: Sizes.FONT_XL,
          fontWeight: "700",
          color: Colors.TEXT,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Alle Tiere gesehen!
      </Text>
      <Text
        style={{
          color: Colors.TEXT_MUTED,
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 22,
        }}
      >
        Du hast alle verfügbaren Tiere gesehen. Schau später nochmal vorbei!
      </Text>
      <TouchableOpacity
        onPress={onReload}
        style={{
          paddingHorizontal: 28,
          height: Sizes.BUTTON_HEIGHT,
          backgroundColor: Colors.PRIMARY,
          borderRadius: Sizes.RADIUS_FULL,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: Colors.WHITE, fontWeight: "600", fontSize: Sizes.FONT_MD }}>
          Nochmal laden
        </Text>
      </TouchableOpacity>
    </View>
  );
}
