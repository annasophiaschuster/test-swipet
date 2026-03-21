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
import type { OwnerPetItem } from "../../components/OwnerPetCard";
import FilterModal, { FilterState, DEFAULT_FILTER } from "../(tabs)/swipe/filter";

const { width: W } = Dimensions.get("window");

const GROESSE_LABEL: Record<string, string> = {
  klein: "Klein",
  mittel: "Mittel",
  gross: "Groß",
  riese: "Riese",
};

const AKTIV_MAP: Record<string, string> = {
  sportlich: "🏃 Sehr aktiv",
  mittel: "🚶 Mäßig aktiv",
  ruhig: "🛋 Ruhig",
};

// ─────────────────────────────────────────────────────────────────────────────

export default function GassiFeed() {
  const [ownerSubMode, setOwnerSubMode] = useState<"gassidate" | "zucht">("gassidate");
  const [isGuest, setIsGuest] = useState(false);

  const [ownerPets, setOwnerPets] = useState<OwnerPetItem[]>([]);
  const [ownerPetIndex, setOwnerPetIndex] = useState(0);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [myDogs, setMyDogs] = useState<OwnerPetItem[] | null>(null);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);
  const [hundeModalVisible, setHundeModalVisible] = useState(false);

  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [filterVisible, setFilterVisible] = useState(false);
  const [dogFilters, setDogFilters] = useState<Record<string, FilterState>>({});
  const [filterDogId, setFilterDogId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [matchVisible, setMatchVisible] = useState(false);
  const [matchPet, setMatchPet] = useState<OwnerPetItem | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const matchScale = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    setOwnerPetIndex(0);
    loadOwnerPets(activeDogId);
  }, [activeDogId]);

  const loadUserInfo = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        setMyDogs([]);
        setLoading(false);
        return;
      }

      setIsGuest(false);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role ?? null;
      setUserRole(role);

      const { data: dogs } = await supabase
        .from("owner_pets")
        .select("*, owner:profiles!owner_id(name, city)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      const dogList: OwnerPetItem[] = (dogs ?? []).map((d: any) => ({
        ...d,
        owner_name: d.owner?.name ?? null,
        owner_city: d.owner?.city ?? null,
      }));
      setMyDogs(dogList);
      if (dogList.length > 0) setActiveDogId(dogList[0].id);
      else setLoading(false);
    } catch (e) {
      console.error("loadUserInfo", e);
      setLoading(false);
    }
  };

  const loadOwnerPets = async (dogId = activeDogId) => {
    if (!dogId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const swipedIds: string[] = [];
      if (user) {
        const { data: swipes } = await supabase
          .from("owner_swipes")
          .select("target_pet_id")
          .eq("swiper_id", user.id)
          .eq("swiper_pet_id", dogId)
          .eq("modus", "gassi");
        swipes?.forEach((s) => swipedIds.push(s.target_pet_id));
      }

      const currentFilter = dogFilters[dogId] ?? DEFAULT_FILTER;
      let query = supabase
        .from("owner_pets")
        .select("*, owner:profiles!owner_id(name, city)")
        .order("created_at", { ascending: false });

      if (user) query = query.neq("owner_id", user.id);
      if (swipedIds.length > 0)
        query = query.not("id", "in", `(${swipedIds.join(",")})`);
      if (currentFilter.groesse.length > 0)
        query = query.in("groesse_kategorie", currentFilter.groesse);

      const { data } = await query;
      setOwnerPets(
        (data ?? []).map((p: any) => ({
          ...p,
          owner_name: p.owner?.name ?? null,
          owner_city: p.owner?.city ?? null,
        }))
      );
      setOwnerPetIndex(0);
    } catch (e) {
      console.error("loadOwnerPets", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleOwnerAction = async (richtung: "ja" | "nein") => {
    const pet = ownerPets[ownerPetIndex];
    if (!pet || saving) return;

    if (isGuest) {
      goToNextPet();
      return;
    }

    if (!activeDogId) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("owner_swipes").upsert({
        swiper_id: user.id,
        swiper_pet_id: activeDogId,
        target_id: pet.owner_id,
        target_pet_id: pet.id,
        richtung,
        modus: "gassi",
      });

      if (richtung === "ja") {
        const { data: mutual } = await supabase
          .from("owner_swipes")
          .select("id")
          .eq("swiper_id", pet.owner_id)
          .eq("target_pet_id", activeDogId)
          .eq("richtung", "ja")
          .eq("modus", "gassi")
          .limit(1);

        if (mutual && mutual.length > 0) {
          const { data: match } = await supabase
            .from("owner_matches")
            .insert({
              pet_a_id: activeDogId,
              pet_b_id: pet.id,
              owner_a_id: user.id,
              owner_b_id: pet.owner_id,
              modus: "gassi",
            })
            .select("id")
            .single();

          setMatchPet(pet);
          setMatchId(match?.id ?? null);
          setMatchVisible(true);
          matchScale.setValue(0);
          matchOpacity.setValue(0);
          Animated.parallel([
            Animated.spring(matchScale, {
              toValue: 1,
              tension: 60,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(matchOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }

      goToNextPet();
    } catch (e) {
      console.error("handleOwnerAction", e);
    } finally {
      setSaving(false);
    }
  };

  const goToNextPet = () => {
    if (ownerPetIndex + 1 < ownerPets.length) setOwnerPetIndex(ownerPetIndex + 1);
    else loadOwnerPets(activeDogId);
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const openFilterForDog = (dogId: string) => {
    setFilterDogId(dogId);
    setFilter(dogFilters[dogId] ?? DEFAULT_FILTER);
    setHundeModalVisible(false);
    setFilterVisible(true);
  };

  const handleFilterApply = (f: FilterState) => {
    if (filterDogId) {
      setDogFilters((prev) => ({ ...prev, [filterDogId]: f }));
      setFilterDogId(null);
      loadOwnerPets(activeDogId);
    } else {
      setFilter(f);
    }
    setFilterVisible(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeDog = myDogs?.find((d) => d.id === activeDogId) ?? null;
  const showHundeButton = userRole === "tierhalter";
  const currentOwnerPet = ownerPets[ownerPetIndex];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>

      {/* ── HEADER ── */}
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
        <View>
          <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.TEXT }}>🦮 Gassidate</Text>
          {activeDog && (
            <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>
              Für {activeDog.name}
            </Text>
          )}
        </View>

        {showHundeButton ? (
          <TouchableOpacity
            onPress={() => setHundeModalVisible(true)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: Sizes.RADIUS_FULL,
              borderWidth: 1.5,
              borderColor: Colors.SECONDARY,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: Colors.SECONDARY + "18",
            }}
          >
            <Text style={{ fontSize: 14 }}>🐕</Text>
            <Text style={{ color: Colors.SECONDARY, fontWeight: "600", fontSize: Sizes.FONT_SM }}>
              Hunde
            </Text>
          </TouchableOpacity>
        ) : (
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
        )}
      </View>

      {/* ── DEMO BANNER ── */}
      {isGuest && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            backgroundColor: "rgba(240,149,106,0.12)",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: "rgba(240,149,106,0.3)",
          }}
        >
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, flex: 1 }}>
            🦮 Demo-Modus —{" "}
            <Text style={{ fontWeight: "600" }}>Anmelden</Text> um Anfragen zu speichern
          </Text>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.SECONDARY }}>
              Login →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── GASSIDATE / ZUCHT SUB-TOGGLE ── */}
      <View
        style={{
          flexDirection: "row",
          margin: 16,
          marginBottom: 0,
          backgroundColor: Colors.SURFACE,
          borderRadius: Sizes.RADIUS_FULL,
          padding: 3,
        }}
      >
        {(["gassidate", "zucht"] as const).map((sub) => (
          <TouchableOpacity
            key={sub}
            onPress={() => setOwnerSubMode(sub)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: Sizes.RADIUS_FULL,
              backgroundColor:
                ownerSubMode === sub ? Colors.SECONDARY : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: ownerSubMode === sub ? Colors.WHITE : Colors.TEXT_MUTED,
                fontWeight: ownerSubMode === sub ? "700" : "400",
              }}
            >
              {sub === "gassidate" ? "🦮 Gassidate" : "🐕 Zucht"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── FEED STATES ── */}
      {myDogs === null && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.SECONDARY} size="large" />
        </View>
      )}

      {myDogs !== null && myDogs.length === 0 && !isGuest && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🐾</Text>
          <Text
            style={{
              fontSize: Sizes.FONT_XL,
              fontWeight: "700",
              color: Colors.TEXT,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Registriere deinen Hund
          </Text>
          <Text
            style={{
              color: Colors.TEXT_MUTED,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            Um Gassidate-Partner zu finden, musst du zuerst deinen Hund registrieren.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/auth/onboarding/tierhalter")}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              paddingHorizontal: 28,
              backgroundColor: Colors.SECONDARY,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
              Hund registrieren
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {myDogs !== null && (myDogs.length > 0 || isGuest) && loading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.SECONDARY} size="large" />
          <Text style={{ color: Colors.TEXT_MUTED, marginTop: 12 }}>Partner werden geladen…</Text>
        </View>
      )}

      {myDogs !== null && (myDogs.length > 0 || isGuest) && !loading && ownerPets.length === 0 && (
        <EmptyState onReload={() => loadOwnerPets(activeDogId)} />
      )}

      {myDogs !== null && (myDogs.length > 0 || isGuest) && !loading && ownerPets.length > 0 && currentOwnerPet && (
        <GassidatePetView
          key={`owner-${ownerPetIndex}`}
          pet={currentOwnerPet}
          saving={saving}
          onAction={handleOwnerAction}
        />
      )}

      {/* ── MODALS ── */}
      <HundeModal
        visible={hundeModalVisible}
        dogs={myDogs ?? []}
        activeDogId={activeDogId}
        dogFilters={dogFilters}
        onSelectDog={(id) => {
          setActiveDogId(id);
          setHundeModalVisible(false);
        }}
        onFilterDog={openFilterForDog}
        onAddDog={() => {
          setHundeModalVisible(false);
          router.push("/auth/onboarding/tierhalter");
        }}
        onClose={() => setHundeModalVisible(false)}
      />

      <FilterModal
        visible={filterVisible}
        filter={filter}
        onApply={handleFilterApply}
        onClose={() => {
          setFilterVisible(false);
          setFilterDogId(null);
        }}
      />

      {/* ── MATCH FEIER ── */}
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
            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: Colors.SECONDARY,
                marginBottom: 4,
              }}
            >
              Es ist ein Match!
            </Text>
            {matchPet?.foto_url && (
              <Image
                source={{ uri: matchPet.foto_url }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  marginVertical: 16,
                  borderWidth: 3,
                  borderColor: Colors.SECONDARY,
                }}
              />
            )}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: Colors.TEXT,
                marginBottom: 4,
              }}
            >
              {matchPet?.name}
            </Text>
            <Text
              style={{
                color: Colors.TEXT_MUTED,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              Du und {matchPet?.owner_name ?? "der andere Hundehalter"} mögen einander — verabredet
              euch jetzt für einen Gassi-Spaziergang!
            </Text>
            <TouchableOpacity
              onPress={() => {
                setMatchVisible(false);
                if (matchId) {
                  router.push({
                    pathname: "/gassi/chat/[matchId]",
                    params: {
                      matchId,
                      petName: matchPet?.name ?? "",
                      petPhoto: matchPet?.foto_url ?? "",
                      ownerName: matchPet?.owner_name ?? "",
                      modus: "gassi",
                    },
                  });
                }
              }}
              style={{
                width: "100%",
                height: Sizes.BUTTON_HEIGHT,
                backgroundColor: Colors.SECONDARY,
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
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Später</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GassidatePetView
// ─────────────────────────────────────────────────────────────────────────────

function GassidatePetView({
  pet,
  saving,
  onAction,
}: {
  pet: OwnerPetItem;
  saving: boolean;
  onAction: (r: "ja" | "nein") => void;
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-W / 2, 0, W / 2],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, W / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-W / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  const flyOff = (direction: "ja" | "nein") => {
    if (saving) return;
    Animated.timing(position, {
      toValue: { x: direction === "ja" ? W + 150 : -(W + 150), y: 20 },
      duration: 260,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onActionRef.current(direction);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8 && Math.abs(gs.dx) > 15,
      onPanResponderGrant: () => {
        position.setOffset({
          x: (position.x as any)._value,
          y: (position.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gs) => {
        position.flattenOffset();
        if (gs.dx > 100 || gs.vx > 0.4) {
          Animated.timing(position, {
            toValue: { x: W + 150, y: gs.dy },
            duration: 240,
            useNativeDriver: false,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onActionRef.current("ja");
          });
        } else if (gs.dx < -100 || gs.vx < -0.4) {
          Animated.timing(position, {
            toValue: { x: -(W + 150), y: gs.dy },
            duration: 240,
            useNativeDriver: false,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onActionRef.current("nein");
          });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        position.flattenOffset();
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { rotate: rotation },
        ],
      }}
      {...panResponder.panHandlers}
    >
      {/* GASSI Stamp */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 52,
          left: 20,
          zIndex: 20,
          opacity: likeOpacity,
          transform: [{ rotate: "-20deg" }],
        }}
      >
        <View
          style={{
            borderWidth: 3,
            borderColor: "#00C853",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "rgba(0,200,83,0.1)",
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "900", color: "#00C853", letterSpacing: 2 }}>
            🐾 GASSI
          </Text>
        </View>
      </Animated.View>

      {/* NOPE Stamp */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 52,
          right: 20,
          zIndex: 20,
          opacity: nopeOpacity,
          transform: [{ rotate: "20deg" }],
        }}
      >
        <View
          style={{
            borderWidth: 3,
            borderColor: "#FF4458",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "rgba(255,68,88,0.1)",
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "900", color: "#FF4458", letterSpacing: 2 }}>
            NOPE ✕
          </Text>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} bounces style={{ flex: 1 }}>
        {/* ── 1. HAUPTFOTO ── */}
        <View style={{ height: W * 1.15, position: "relative" }}>
          {pet.foto_url ? (
            <Image
              source={{ uri: pet.foto_url }}
              style={{ width: W, height: W * 1.15 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: W,
                height: W * 1.15,
                backgroundColor: Colors.SURFACE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 96 }}>🐶</Text>
            </View>
          )}
          <View
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              backgroundColor: Colors.SECONDARY,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 99,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>🦮 Gassidate</Text>
          </View>
        </View>

        {/* ── 2. NAME + INFOS ── */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 }}
          >
            <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.TEXT }}>{pet.name}</Text>
            {pet.alter_jahre != null && (
              <Text style={{ fontSize: 17, color: Colors.TEXT_MUTED }}>
                {pet.alter_jahre === 0
                  ? "Welpe"
                  : pet.alter_jahre === 1
                  ? "1 Jahr"
                  : `${pet.alter_jahre} Jahre`}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED }}>
            {[
              pet.rasse,
              pet.groesse_kategorie ? GROESSE_LABEL[pet.groesse_kategorie] : null,
              pet.owner_city,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>

        {/* ── 3. EIGENSCHAFTEN ── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: Colors.TEXT_MUTED,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 14,
            }}
          >
            Eigenschaften
          </Text>
          {pet.aktivitaetslevel && (
            <PropRow
              icon="🏃"
              label="Aktivitätslevel"
              value={AKTIV_MAP[pet.aktivitaetslevel] ?? pet.aktivitaetslevel}
              ok
            />
          )}
          <PropRow
            icon="👦"
            label="Kinderfreundlich"
            value={pet.kinderfreundlich ? "Ja" : "Nein"}
            ok={!!pet.kinderfreundlich}
          />
          <PropRow
            icon="🐾"
            label="Verträglich mit Tieren"
            value={pet.vertraeglich_mit_tieren ? "Ja" : "Nein"}
            ok={!!pet.vertraeglich_mit_tieren}
          />
        </View>

        {/* ── 4. BESITZER-INFO ── */}
        {pet.owner_name && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              marginBottom: 4,
              padding: 16,
              backgroundColor: Colors.SURFACE,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 28 }}>👤</Text>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.TEXT }}>
                {pet.owner_name}
              </Text>
              {pet.owner_city && (
                <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                  📍 {pet.owner_city}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── 5. NOPE / GASSIDATE BUTTONS ── */}
        <View
          style={{ flexDirection: "row", gap: 14, padding: 20, paddingTop: 24, paddingBottom: 44 }}
        >
          <TouchableOpacity
            onPress={() => flyOff("nein")}
            disabled={saving}
            style={{
              flex: 1,
              height: 62,
              borderRadius: Sizes.RADIUS_FULL,
              backgroundColor: Colors.WHITE,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#FF4458",
              shadowColor: "#FF4458",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#FF4458" }}>✕  Nope</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => flyOff("ja")}
            disabled={saving}
            style={{
              flex: 1,
              height: 62,
              borderRadius: Sizes.RADIUS_FULL,
              backgroundColor: Colors.SECONDARY,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: Colors.SECONDARY,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {saving ? (
              <ActivityIndicator color={Colors.WHITE} />
            ) : (
              <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.WHITE }}>
                🦮  Gassidate
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HundeModal
// ─────────────────────────────────────────────────────────────────────────────

function HundeModal({
  visible,
  dogs,
  activeDogId,
  dogFilters,
  onSelectDog,
  onFilterDog,
  onAddDog,
  onClose,
}: {
  visible: boolean;
  dogs: OwnerPetItem[];
  activeDogId: string | null;
  dogFilters: Record<string, FilterState>;
  onSelectDog: (id: string) => void;
  onFilterDog: (id: string) => void;
  onAddDog: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        {/* Header */}
        <View
          style={{
            paddingTop: 24,
            paddingHorizontal: 20,
            paddingBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: Colors.BORDER,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.TEXT }}>
            🐕 Meine Hunde
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.SURFACE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18, color: Colors.TEXT_MUTED, fontWeight: "700" }}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 4,
            fontSize: 13,
            color: Colors.TEXT_MUTED,
          }}
        >
          Wähle deinen Hund — der Feed zeigt Gassidate-Partner für diesen Hund.
        </Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {dogs.map((dog) => {
            const isActive = dog.id === activeDogId;
            const hasFilter = !!dogFilters[dog.id];
            return (
              <TouchableOpacity
                key={dog.id}
                onPress={() => onSelectDog(dog.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isActive ? Colors.SECONDARY + "12" : Colors.SURFACE,
                  borderRadius: Sizes.RADIUS_LG,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: isActive ? Colors.SECONDARY : Colors.BORDER,
                }}
              >
                {dog.foto_url ? (
                  <Image
                    source={{ uri: dog.foto_url }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      borderWidth: isActive ? 2 : 0,
                      borderColor: Colors.SECONDARY,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: Colors.BORDER,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>🐶</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: Colors.TEXT }}>
                    {dog.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                    {[
                      dog.rasse,
                      dog.groesse_kategorie ? GROESSE_LABEL[dog.groesse_kategorie] : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Mischling"}
                  </Text>
                  {hasFilter && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: Colors.SECONDARY,
                        marginTop: 2,
                        fontWeight: "600",
                      }}
                    >
                      ⚙️ Individueller Filter aktiv
                    </Text>
                  )}
                </View>

                {isActive && (
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: Colors.SECONDARY,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>✓</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => onFilterDog(dog.id)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: Colors.SURFACE,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: Colors.BORDER,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>⚙️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: Colors.BORDER }}>
          <TouchableOpacity
            onPress={onAddDog}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              borderRadius: Sizes.RADIUS_FULL,
              borderWidth: 2,
              borderColor: Colors.SECONDARY,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 20, color: Colors.SECONDARY, fontWeight: "700" }}>+</Text>
            <Text style={{ color: Colors.SECONDARY, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
              Neuen Hund anlegen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────

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
        Alle gesehen!
      </Text>
      <Text
        style={{
          color: Colors.TEXT_MUTED,
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 22,
        }}
      >
        Du hast alle verfügbaren Gassidate-Partner gesehen. Schau später nochmal vorbei!
      </Text>
      <TouchableOpacity
        onPress={onReload}
        style={{
          paddingHorizontal: 28,
          height: Sizes.BUTTON_HEIGHT,
          backgroundColor: Colors.SECONDARY,
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

function PropRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: string;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: Colors.BORDER,
      }}
    >
      <Text style={{ fontSize: 16, marginRight: 10 }}>{icon}</Text>
      <Text style={{ flex: 1, fontSize: 14, color: Colors.TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: ok ? "#2E7D32" : Colors.TEXT_MUTED }}>
        {value}
      </Text>
    </View>
  );
}
