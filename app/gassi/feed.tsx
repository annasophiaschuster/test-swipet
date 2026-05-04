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
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

const { width: W, height: H } = Dimensions.get("window");
const CARD_W = W - 16; // Card has 8px margin each side
const PHOTO_H = Math.round(H * 0.38); // Dog photo area height

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Labels
// ─────────────────────────────────────────────────────────────────────────────

const GROESSE_OPTIONS = ["klein", "mittel", "gross", "riese"] as const;
const AKTIV_OPTIONS   = ["ruhig", "mittel", "sportlich"] as const;
const GESCHLECHT_OPTIONS = ["männlich", "weiblich", "divers"] as const;

// Labels are built dynamically inside the component using translations

// ─────────────────────────────────────────────────────────────────────────────
// Demo Owner Profiles (3 Musterdaten)
// ─────────────────────────────────────────────────────────────────────────────

// DEMO_OWNERS is built inside the component using translations

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OwnerInfo {
  name: string;
  alter: number;
  geschlecht: string;
  bio: string | null;
  stadt: string;
  avatar_url: string | null;
  interessen: string[];
}

interface PartnerCard {
  id: string;
  name: string;
  rasse: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  geschlecht: string | null;
  kinderfreundlich: boolean;
  vertraeglich_mit_tieren: boolean;
  kastriert: boolean;
  aktivitaetslevel: string | null;
  charakter_tags: string[];
  beschreibung: string | null;
  photos: string[];
  modus: "gassidate";
  owner: OwnerInfo;
}

interface MyDog {
  id: string;
  name: string;
  rasse: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  foto_url: string | null;
  modus: "gassidate";
}

// ─────────────────────────────────────────────────────────────────────────────
// SwipeCard — Dog-first card layout with owner mini-profile + full profile modal
// ─────────────────────────────────────────────────────────────────────────────

function SwipeCard({
  card, saving, onAction,
}: {
  card: PartnerCard;
  saving: boolean;
  onAction: (r: "ja" | "nein") => void;
}) {
  const { t } = useLanguage();
  const GROESSE_LABEL: Record<string, string> = {
    klein: "Klein", mittel: "Mittel", gross: "Groß", riese: "Riese",
  };
  const AKTIV_LABEL: Record<string, string> = {
    ruhig: t.gassi_activity_calm, mittel: t.gassi_activity_medium, sportlich: t.gassi_activity_very,
  };
  const [profileOpen, setProfileOpen] = useState(false);
  const photos = card.photos.length > 0 ? card.photos : [];

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
          toValue: { x: W + 150, y: gs.dy }, duration: 240, useNativeDriver: false,
        }).start(() => { position.setValue({ x: 0, y: 0 }); onActionRef.current("ja"); });
      } else if (gs.dx < -100 || gs.vx < -0.4) {
        Animated.timing(position, {
          toValue: { x: -(W + 150), y: gs.dy }, duration: 240, useNativeDriver: false,
        }).start(() => { position.setValue({ x: 0, y: 0 }); onActionRef.current("nein"); });
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 }, friction: 5, tension: 40, useNativeDriver: false,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      position.flattenOffset();
      Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
    },
  })).current;

  const { owner } = card;

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
        position: "absolute", top: 44, left: 20, zIndex: 30,
        opacity: likeOpacity, transform: [{ rotate: "-20deg" }],
      }}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "#7EB77F", alignItems: "center", justifyContent: "center", shadowColor: "#7EB77F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
          <Ionicons name="heart" size={34} color="#fff" />
        </View>
      </Animated.View>

      {/* NOPE Stamp */}
      <Animated.View pointerEvents="none" style={{
        position: "absolute", top: 44, right: 20, zIndex: 30,
        opacity: nopeOpacity, transform: [{ rotate: "20deg" }],
      }}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "#E2858F", alignItems: "center", justifyContent: "center", shadowColor: "#E2858F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
          <Ionicons name="close" size={36} color="#fff" />
        </View>
      </Animated.View>

      {/* ── Visuelle Karte (shadow wrapper + clip wrapper) ── */}
      <View style={{
        flex: 1, margin: 8, marginBottom: 4, borderRadius: 24,
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.13, shadowRadius: 16, elevation: 8,
      }}>
        <View style={{ flex: 1, borderRadius: 24, overflow: "hidden", backgroundColor: Colors.WHITE }}>

          {/* ── Komplett scrollbarer Karteninhalt (inkl. Hauptfoto oben) ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            nestedScrollEnabled
          >
            {/* ── 1. HAUPTFOTO (scrollt mit) ── */}
            {photos[0] ? (
              <Image source={{ uri: photos[0] }} style={{ width: CARD_W, height: PHOTO_H }} resizeMode="cover" />
            ) : (
              <View style={{ width: CARD_W, height: PHOTO_H, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="paw-outline" size={64} color={Colors.TEXT_MUTED} />
              </View>
            )}

            {/* ── 2. HUND: Name, Rasse, Geschlecht, Alter ── */}
            <View style={{
              flexDirection: "row", alignItems: "center", flexWrap: "wrap",
              paddingHorizontal: 14, paddingTop: 11, paddingBottom: 8, gap: 5,
            }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: Colors.TEXT }}>{card.name}</Text>
              {card.geschlecht === "maennlich" && (
                <Text style={{ fontSize: 20, color: "#5B9BD5", fontWeight: "700" }}>♂</Text>
              )}
              {card.geschlecht === "weiblich" && (
                <Text style={{ fontSize: 20, color: Colors.PRIMARY, fontWeight: "700" }}>♀</Text>
              )}
              {card.alter_jahre != null && (
                <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, fontWeight: "600" }}>
                  · {card.alter_jahre} {card.alter_jahre === 1 ? "Jahr" : "Jahre"}
                </Text>
              )}
              {card.rasse && (
                <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, flex: 1 }} numberOfLines={1}>
                  · {card.rasse}
                </Text>
              )}
            </View>

            {/* ── 2b. BESCHREIBUNG ── */}
            {card.beschreibung && (
              <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, lineHeight: 19, paddingHorizontal: 14, paddingBottom: 12 }}>
                {card.beschreibung}
              </Text>
            )}

            {/* ── 3. BESITZERPROFIL (umrandet) ── */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setProfileOpen(true)}
              style={{
                marginHorizontal: 12, marginBottom: 12,
                borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 16,
                padding: 11, flexDirection: "row", alignItems: "center", gap: 11,
              }}
            >
              {/* Avatar */}
              {owner.avatar_url ? (
                <Image source={{ uri: owner.avatar_url }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.BORDER }} />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.SECONDARY, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff" }}>{owner.name.charAt(0)}</Text>
                </View>
              )}

              {/* Info */}
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: Colors.TEXT }}>{owner.name}</Text>
                  {owner.alter > 0 && (
                    <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED }}>{owner.alter}</Text>
                  )}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="location-outline" size={11} color={Colors.TEXT_MUTED} />
                  <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>{owner.stadt}</Text>
                </View>
                {owner.interessen.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                    {owner.interessen.slice(0, 3).map((tag) => (
                      <View key={tag} style={{ paddingHorizontal: 7, paddingVertical: 2, backgroundColor: Colors.PRIMARY + "12", borderRadius: 99, borderWidth: 1, borderColor: Colors.PRIMARY + "28" }}>
                        <Text style={{ fontSize: 10, color: Colors.PRIMARY, fontWeight: "600" }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Chevron */}
              <Ionicons name="chevron-forward-circle-outline" size={22} color={Colors.TEXT_MUTED} />
            </TouchableOpacity>

            {/* ── 4. ZWEITES HUNDEFOTO (zwischen Besitzer & Eigenschaften) ── */}
            {photos[1] && (
              <Image
                source={{ uri: photos[1] }}
                style={{
                  width: CARD_W, height: Math.round(CARD_W * 0.6),
                  marginBottom: 14,
                  backgroundColor: Colors.SURFACE,
                }}
                resizeMode="cover"
              />
            )}

            {/* ── 5. RESTLICHE HUNDEEIGENSCHAFTEN ── */}
            <View style={{ paddingHorizontal: 12, gap: 12 }}>
              {/* Eigenschaften */}
              <View style={{ gap: 7 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT }}>Eigenschaften</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                  {card.groesse_kategorie && (
                    <View style={propChip}>
                      <Text style={propChipText}>{GROESSE_LABEL[card.groesse_kategorie] ?? card.groesse_kategorie}</Text>
                    </View>
                  )}
                  {card.aktivitaetslevel && (
                    <View style={propChip}>
                      <Text style={propChipText}>{AKTIV_LABEL[card.aktivitaetslevel] ?? card.aktivitaetslevel}</Text>
                    </View>
                  )}
                  {card.kastriert && (
                    <View style={propChip}>
                      <Text style={propChipText}>Kastriert</Text>
                    </View>
                  )}
                  {card.kinderfreundlich && (
                    <View style={propChip}>
                      <Text style={propChipText}>Kinderlieb</Text>
                    </View>
                  )}
                  {card.vertraeglich_mit_tieren ? (
                    <View style={propChip}>
                      <Text style={propChipText}>Sozial</Text>
                    </View>
                  ) : (
                    <View style={[propChip, { borderColor: Colors.TEXT_MUTED + "40", backgroundColor: Colors.SURFACE }]}>
                      <Text style={[propChipText, { color: Colors.TEXT_MUTED }]}>Einzelhund</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Charakter */}
              {card.charakter_tags?.length > 0 && (
                <View style={{ gap: 7 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT }}>Charakter</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {card.charakter_tags.map((tag) => (
                      <View key={tag} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.SECONDARY + "14", borderRadius: 99, borderWidth: 1, borderColor: Colors.SECONDARY + "38" }}>
                        <Text style={{ fontSize: 12, color: Colors.SECONDARY, fontWeight: "600" }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* ── 6. DRITTES HUNDEFOTO (Abschluss am Ende der Karte) ── */}
            {photos[2] && (
              <Image
                source={{ uri: photos[2] }}
                style={{
                  width: CARD_W, height: Math.round(CARD_W * 0.65),
                  marginTop: 14,
                  backgroundColor: Colors.SURFACE,
                }}
                resizeMode="cover"
              />
            )}
          </ScrollView>
        </View>
      </View>

      {/* ── Like / Nope Buttons (nur Icons, kein Text) ── */}
      <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: 32, paddingBottom: 12, paddingTop: 4 }}>
        <TouchableOpacity
          onPress={() => flyOff("nein")} disabled={saving}
          style={{
            flex: 1, height: 58, borderRadius: Sizes.RADIUS_FULL,
            backgroundColor: "#E2858F",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#E2858F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => flyOff("ja")} disabled={saving}
          style={{
            flex: 1, height: 58, borderRadius: Sizes.RADIUS_FULL,
            backgroundColor: "#7EB77F",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#7EB77F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Ionicons name="heart" size={27} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* ── Besitzerprofil Modal ── */}
      <Modal
        visible={profileOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: 20, paddingVertical: 14,
            borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.TEXT }}>Besitzer</Text>
            <TouchableOpacity onPress={() => setProfileOpen(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
            <View style={{ alignItems: "center", paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24 }}>
              {owner.avatar_url ? (
                <Image source={{ uri: owner.avatar_url }} style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.BORDER, marginBottom: 16 }} />
              ) : (
                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.SECONDARY, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Text style={{ fontSize: 40, fontWeight: "700", color: "#fff" }}>{owner.name.charAt(0)}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 26, fontWeight: "900", color: Colors.TEXT }}>{owner.name}</Text>
                {owner.alter > 0 && <Text style={{ fontSize: 18, color: Colors.TEXT_MUTED }}>{owner.alter}</Text>}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 }}>
                <Ionicons name="location-outline" size={13} color={Colors.TEXT_MUTED} />
                <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>{owner.stadt}</Text>
              </View>
              {owner.bio && (
                <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 23, fontStyle: "italic", textAlign: "center", marginBottom: 24 }}>
                  „{owner.bio}"
                </Text>
              )}
              {owner.interessen.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {owner.interessen.map((tag) => (
                    <View key={tag} style={{ paddingHorizontal: 13, paddingVertical: 7, backgroundColor: Colors.PRIMARY + "15", borderRadius: 99, borderWidth: 1, borderColor: Colors.PRIMARY + "35" }}>
                      <Text style={{ fontSize: 13, color: Colors.PRIMARY, fontWeight: "600" }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileSetupScreen — owner registration (Pflichtfelder)
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSetupScreen({ onDone }: { onDone: (profile: OwnerInfo) => void }) {
  const { t } = useLanguage();
  const [name, setName]         = useState("");
  const [alter, setAlter]       = useState("");
  const [geschlecht, setGeschlecht] = useState<"männlich" | "weiblich" | "divers" | null>(null);
  const [bio, setBio]           = useState("");
  const [stadt, setStadt]       = useState("");
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t.gassi_setup_required_title, t.gassi_setup_required_name); return; }
    if (!alter.trim() || isNaN(Number(alter))) { Alert.alert(t.gassi_setup_required_title, t.gassi_setup_required_age); return; }
    if (!geschlecht) { Alert.alert(t.gassi_setup_required_title, t.gassi_setup_required_gender); return; }
    if (!stadt.trim()) { Alert.alert(t.gassi_setup_required_title, t.gassi_setup_required_city); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          name: name.trim(),
          city: stadt.trim(),
        });
      }
    } catch (e) {
      console.error("ProfileSetupScreen.handleSave", e);
    } finally {
      setSaving(false);
    }

    onDone({
      name: name.trim(),
      alter: parseInt(alter),
      geschlecht,
      bio: bio.trim() || null,
      stadt: stadt.trim(),
      avatar_url: null,
      interessen: [],
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}
    >
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
      }}>
        <TouchableOpacity onPress={() => router.replace("/")} style={{ padding: 4 }}>
          <Text style={{ fontSize: 24, color: Colors.SECONDARY }}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>{t.gassi_setup_title}</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>{t.gassi_setup_subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>
        {/* Avatar Placeholder */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View style={{
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: Colors.SECONDARY + "18",
            alignItems: "center", justifyContent: "center",
            borderWidth: 2, borderStyle: "dashed", borderColor: Colors.SECONDARY,
          }}>
            <Text style={{ fontSize: 36 }}>📸</Text>
          </View>
          <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 8 }}>{t.gassi_setup_photo_soon}</Text>
        </View>

        {/* Vorname */}
        <Text style={fieldLabel}>{t.gassi_setup_label_firstname}</Text>
        <TextInput
          value={name} onChangeText={setName}
          placeholder={t.gassi_setup_ph_firstname} placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Alter */}
        <Text style={fieldLabel}>{t.gassi_setup_label_age}</Text>
        <TextInput
          value={alter} onChangeText={setAlter}
          placeholder={t.gassi_setup_ph_age} keyboardType="numeric"
          placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Geschlecht */}
        <Text style={fieldLabel}>{t.gassi_setup_label_gender}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {GESCHLECHT_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGeschlecht(g as any)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
                alignItems: "center",
                borderColor: geschlecht === g ? Colors.SECONDARY : Colors.BORDER,
                backgroundColor: geschlecht === g ? Colors.SECONDARY + "12" : Colors.BACKGROUND,
              }}
            >
              <Text style={{ fontSize: 18 }}>
                {g === "männlich" ? "♂" : g === "weiblich" ? "♀" : "⚧"}
              </Text>
              <Text style={{ fontSize: 11, color: geschlecht === g ? Colors.SECONDARY : Colors.TEXT_MUTED, fontWeight: "600", marginTop: 3 }}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stadt/Stadtteil */}
        <Text style={fieldLabel}>{t.gassi_setup_label_city}</Text>
        <TextInput
          value={stadt} onChangeText={setStadt}
          placeholder={t.gassi_setup_ph_city}
          placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Bio */}
        <Text style={fieldLabel}>{t.gassi_setup_label_bio}</Text>
        <TextInput
          value={bio} onChangeText={setBio}
          placeholder={t.gassi_setup_ph_bio}
          placeholderTextColor={Colors.TEXT_MUTED}
          multiline numberOfLines={3}
          style={[inputStyle, { height: 80, textAlignVertical: "top" }]}
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            height: Sizes.BUTTON_HEIGHT, borderRadius: Sizes.RADIUS_FULL,
            backgroundColor: Colors.SECONDARY,
            alignItems: "center", justifyContent: "center", marginTop: 8,
          }}
        >
          {saving
            ? <ActivityIndicator color={Colors.WHITE} />
            : <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 17 }}>{t.gassi_setup_next}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterDogScreen
// ─────────────────────────────────────────────────────────────────────────────

function RegisterDogScreen({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { t } = useLanguage();
  const GROESSE_LABEL: Record<string, string> = {
    klein: t.gassi_size_small, mittel: t.gassi_size_medium,
    gross: t.gassi_size_large, riese: t.gassi_size_giant,
  };
  const AKTIV_LABEL: Record<string, string> = {
    ruhig: t.gassi_activity_calm, mittel: t.gassi_activity_medium, sportlich: t.gassi_activity_very,
  };
  const [name, setName]         = useState("");
  const [rasse, setRasse]       = useState("");
  const [alterJahre, setAlterJahre] = useState("");
  const [groesse, setGroesse]   = useState<typeof GROESSE_OPTIONS[number] | null>(null);
  const [aktiv, setAktiv]       = useState<typeof AKTIV_OPTIONS[number] | null>(null);
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t.gassi_register_missing_name_title, t.gassi_register_missing_name_msg); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { error } = await supabase.from("owner_pets").insert({
        owner_id: user.id,
        name: name.trim(),
        tierart: "hund",
        rasse: rasse.trim() || null,
        alter_jahre: alterJahre ? parseInt(alterJahre) : null,
        groesse_kategorie: groesse,
        aktivitaetslevel: aktiv,
        kinderfreundlich: false,
        vertraeglich_mit_tieren: false,
      });
      if (error) throw error;
      onDone();
    } catch (e: any) {
      Alert.alert(t.gassi_register_error_title, e.message ?? t.gassi_register_error_msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}
    >
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
      }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Text style={{ fontSize: 24, color: Colors.SECONDARY }}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>{t.gassi_register_title}</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>{t.gassi_register_step2}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>
        <Text style={fieldLabel}>{t.gassi_register_label_name}</Text>
        <TextInput value={name} onChangeText={setName} placeholder={t.gassi_register_ph_name} placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

        <Text style={fieldLabel}>{t.gassi_register_label_breed}</Text>
        <TextInput value={rasse} onChangeText={setRasse} placeholder={t.gassi_register_ph_breed} placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

        <Text style={fieldLabel}>{t.gassi_register_label_age}</Text>
        <TextInput value={alterJahre} onChangeText={setAlterJahre} placeholder={t.gassi_register_ph_age} keyboardType="numeric" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

        <Text style={fieldLabel}>{t.gassi_register_label_size}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {GROESSE_OPTIONS.map((g) => (
            <TouchableOpacity key={g} onPress={() => setGroesse(g)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: groesse === g ? Colors.SECONDARY : Colors.BORDER, backgroundColor: groesse === g ? Colors.SECONDARY + "15" : Colors.BACKGROUND }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: groesse === g ? Colors.SECONDARY : Colors.TEXT_MUTED }}>
                {GROESSE_LABEL[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={fieldLabel}>{t.gassi_register_label_activity}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {AKTIV_OPTIONS.map((a) => (
            <TouchableOpacity key={a} onPress={() => setAktiv(a)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: "center", borderColor: aktiv === a ? Colors.SECONDARY : Colors.BORDER, backgroundColor: aktiv === a ? Colors.SECONDARY + "15" : Colors.BACKGROUND }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: aktiv === a ? Colors.SECONDARY : Colors.TEXT_MUTED }}>
                {AKTIV_LABEL[a]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={{ height: Sizes.BUTTON_HEIGHT, borderRadius: Sizes.RADIUS_FULL, backgroundColor: Colors.SECONDARY, alignItems: "center", justifyContent: "center" }}
        >
          {saving ? <ActivityIndicator color={Colors.WHITE} /> : <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 17 }}>Hund anlegen →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meine Hunde Modal
// ─────────────────────────────────────────────────────────────────────────────

function MeineHundeModal({
  visible, dogs, activeDogId, onClose, onSelectDog, onAddDog,
}: {
  visible: boolean; dogs: MyDog[]; activeDogId: string | null;
  onClose: () => void; onSelectDog: (id: string) => void;
  onAddDog: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        <View style={{
          paddingTop: 20, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>{t.gassi_dogs_modal_title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: Colors.TEXT_MUTED }}>{t.gassi_dogs_modal_close}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, gap: 10 }}>
          {dogs.map((dog) => (
            <View key={dog.id} style={{
              borderRadius: 16, borderWidth: 2,
              borderColor: activeDogId === dog.id ? Colors.SECONDARY : Colors.BORDER,
              backgroundColor: activeDogId === dog.id ? Colors.SECONDARY + "08" : Colors.BACKGROUND,
              overflow: "hidden",
            }}>
              <TouchableOpacity
                onPress={() => onSelectDog(dog.id)}
                style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}
              >
                {dog.foto_url ? (
                  <Image source={{ uri: dog.foto_url }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                ) : (
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 24 }}>🐶</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT }}>{dog.name}</Text>
                  <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 }}>{dog.rasse ?? t.gassi_dogs_modal_mixed_breed}</Text>
                </View>
                </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={onAddDog}
            style={{
              height: 52, borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
              borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 8,
            }}
          >
            <Text style={{ fontSize: 20, color: Colors.SECONDARY }}>+</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.TEXT_MUTED }}>{t.gassi_dogs_modal_add}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GassiFilterModal — Gassi-Date & Deck-Date filters
// ─────────────────────────────────────────────────────────────────────────────

export interface GassiFilterState {
  groesse: string[];
  aktivitaetslevel: string[];
  maxAlterJahre: number;
  besitzerAlterMin: number;
  besitzerAlterMax: number;
  besitzerGeschlecht: "alle" | "männlich" | "weiblich";
  umkreis: number;
}

export const DEFAULT_GASSI_FILTER: GassiFilterState = {
  groesse: [],
  aktivitaetslevel: [],
  maxAlterJahre: 15,
  besitzerAlterMin: 18,
  besitzerAlterMax: 80,
  besitzerGeschlecht: "alle",
  umkreis: 100,
};

function GassiFilterModal({
  visible, filter, onApply, onClose,
}: {
  visible: boolean;
  filter: GassiFilterState;
  onApply: (f: GassiFilterState) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const GROESSE_LABEL_PLAIN: Record<string, string> = {
    klein: "Klein", mittel: "Mittel", gross: "Groß", riese: "Riese",
  };
  const AKTIV_LABEL: Record<string, string> = {
    ruhig: t.gassi_activity_calm, mittel: t.gassi_activity_medium, sportlich: t.gassi_activity_very,
  };
  const [local, setLocal] = useState<GassiFilterState>(filter);

  const toggleArr = (key: keyof GassiFilterState, val: string) => {
    const arr = local[key] as string[];
    setLocal((prev) => ({
      ...prev,
      [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
    }));
  };

  const Pill = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: Sizes.RADIUS_FULL, borderWidth: 1.5,
        borderColor: selected ? Colors.PRIMARY : Colors.BORDER,
        backgroundColor: selected ? Colors.PRIMARY + "18" : Colors.SURFACE,
        marginRight: 8, marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: selected ? "600" : "400", color: selected ? Colors.PRIMARY : Colors.TEXT }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.TEXT, marginBottom: 6 }}>{children}</Text>
  );
  const ValueLabel = ({ children }: { children: React.ReactNode }) => (
    <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginBottom: 4 }}>{children}</Text>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          padding: Sizes.SPACING_LG, paddingTop: 20,
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}>
          <TouchableOpacity onPress={() => setLocal(DEFAULT_GASSI_FILTER)}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 13 }}>{t.filter_reset}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "700", color: Colors.TEXT }}>{t.filter_title}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={Colors.TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>

          {/* ── 1. UMKREIS (oben, wichtigster) ── */}
          <SectionTitle>Umkreis</SectionTitle>
          <ValueLabel>
            {local.umkreis >= 100 ? "Unbegrenzt" : `${local.umkreis} km`}
          </ValueLabel>
          <Slider
            style={{ width: "100%", height: 40, marginBottom: 22 }}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={local.umkreis}
            onValueChange={(v) => setLocal({ ...local, umkreis: Math.round(v) })}
            minimumTrackTintColor={Colors.PRIMARY}
            maximumTrackTintColor={Colors.BORDER}
            thumbTintColor={Colors.PRIMARY}
          />

          {/* ── 2. HUNDEGRÖSSE (ohne kg) ── */}
          <SectionTitle>Hundegröße</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 22 }}>
            {GROESSE_OPTIONS.map((g) => (
              <Pill key={g} label={GROESSE_LABEL_PLAIN[g]} selected={local.groesse.includes(g)} onPress={() => toggleArr("groesse", g)} />
            ))}
          </View>

          {/* ── 3. AKTIVITÄTSLEVEL (ohne Emojis) ── */}
          <SectionTitle>Aktivitätslevel</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 22 }}>
            {AKTIV_OPTIONS.map((a) => (
              <Pill key={a} label={AKTIV_LABEL[a]} selected={local.aktivitaetslevel.includes(a)} onPress={() => toggleArr("aktivitaetslevel", a)} />
            ))}
          </View>

          {/* ── 4. ALTER HUND (Slider) ── */}
          <SectionTitle>Alter des Hundes</SectionTitle>
          <ValueLabel>
            {local.maxAlterJahre >= 15 ? "Bis 15+ Jahre" : `Bis ${local.maxAlterJahre} ${local.maxAlterJahre === 1 ? "Jahr" : "Jahre"}`}
          </ValueLabel>
          <Slider
            style={{ width: "100%", height: 40, marginBottom: 22 }}
            minimumValue={1}
            maximumValue={15}
            step={1}
            value={local.maxAlterJahre}
            onValueChange={(v) => setLocal({ ...local, maxAlterJahre: Math.round(v) })}
            minimumTrackTintColor={Colors.PRIMARY}
            maximumTrackTintColor={Colors.BORDER}
            thumbTintColor={Colors.PRIMARY}
          />

          {/* ── 5. ALTER BESITZER (Slider Min/Max) ── */}
          <SectionTitle>Alter des Besitzers</SectionTitle>
          <ValueLabel>{`${local.besitzerAlterMin} – ${local.besitzerAlterMax >= 80 ? "80+" : local.besitzerAlterMax} Jahre`}</ValueLabel>
          <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 }}>Mindestalter</Text>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={18}
            maximumValue={80}
            step={1}
            value={local.besitzerAlterMin}
            onValueChange={(v) => {
              const min = Math.round(v);
              setLocal((prev) => ({ ...prev, besitzerAlterMin: min, besitzerAlterMax: Math.max(min, prev.besitzerAlterMax) }));
            }}
            minimumTrackTintColor={Colors.PRIMARY}
            maximumTrackTintColor={Colors.BORDER}
            thumbTintColor={Colors.PRIMARY}
          />
          <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 }}>Höchstalter</Text>
          <Slider
            style={{ width: "100%", height: 40, marginBottom: 22 }}
            minimumValue={18}
            maximumValue={80}
            step={1}
            value={local.besitzerAlterMax}
            onValueChange={(v) => {
              const max = Math.round(v);
              setLocal((prev) => ({ ...prev, besitzerAlterMax: max, besitzerAlterMin: Math.min(prev.besitzerAlterMin, max) }));
            }}
            minimumTrackTintColor={Colors.PRIMARY}
            maximumTrackTintColor={Colors.BORDER}
            thumbTintColor={Colors.PRIMARY}
          />

          {/* ── 6. GESCHLECHT BESITZER ── */}
          <SectionTitle>Geschlecht des Besitzers</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
            {[{ k: "alle", l: t.filter_gender_all }, { k: "männlich", l: t.filter_gender_male }, { k: "weiblich", l: t.filter_gender_female }].map(({ k, l }) => (
              <Pill key={k} label={l} selected={local.besitzerGeschlecht === k} onPress={() => setLocal({ ...local, besitzerGeschlecht: k as any })} />
            ))}
          </View>
        </ScrollView>

        <View style={{ padding: Sizes.SPACING_LG, borderTopWidth: 1, borderTopColor: Colors.BORDER }}>
          <TouchableOpacity
            onPress={() => { onApply(local); onClose(); }}
            style={{
              height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.PRIMARY,
              borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>{t.filter_apply}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const fieldLabel = {
  fontSize: 13, fontWeight: "700" as const, color: Colors.TEXT_MUTED,
  textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8,
};
const inputStyle = {
  borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 12,
  paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.TEXT,
  backgroundColor: Colors.BACKGROUND, marginBottom: 18,
};
const propChip = {
  paddingHorizontal: 10, paddingVertical: 4,
  backgroundColor: Colors.PRIMARY + "12", borderRadius: 99 as const,
  borderWidth: 1, borderColor: Colors.PRIMARY + "30",
};
const propChipText = {
  fontSize: 12, color: Colors.PRIMARY, fontWeight: "600" as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Feed Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiFeed() {
  const { t } = useLanguage();
  const GROESSE_LABEL: Record<string, string> = {
    klein: t.gassi_size_small,
    mittel: t.gassi_size_medium,
    gross: t.gassi_size_large,
    riese: t.gassi_size_giant,
  };
  const AKTIV_LABEL: Record<string, string> = {
    ruhig: t.gassi_activity_calm,
    mittel: t.gassi_activity_medium,
    sportlich: t.gassi_activity_very,
  };
  const DEMO_OWNERS: OwnerInfo[] = [
    {
      name: "Max", alter: 28, geschlecht: "männlich", bio: t.gassi_bio_max,
      stadt: "München, Schwabing",
      avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&fit=crop&q=80",
      interessen: ["Joggen", "Wandern", "Café", "Fotografie"],
    },
    {
      name: "Sophie", alter: 32, geschlecht: "weiblich", bio: t.gassi_bio_sophie,
      stadt: "Hamburg, Altona",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&fit=crop&q=80",
      interessen: ["Musik", "Natur", "Kochen", "Tierliebe"],
    },
    {
      name: "Jonas", alter: 25, geschlecht: "männlich", bio: t.gassi_bio_jonas,
      stadt: "Berlin, Prenzlauer Berg",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&fit=crop&q=80",
      interessen: ["Radfahren", "Gaming", "Craft Beer", "Camping"],
    },
    {
      name: "Lena", alter: 30, geschlecht: "weiblich",
      bio: "Ich liebe lange Spaziergänge und gemütliche Café-Besuche mit meinem Hund.",
      stadt: "München, Maxvorstadt",
      avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&fit=crop&q=80",
      interessen: ["Lesen", "Yoga", "Kunst", "Café"],
    },
    {
      name: "Tom", alter: 34, geschlecht: "männlich",
      bio: "Hundebesitzer aus Leidenschaft. Immer auf der Suche nach neuen Gassi-Routen.",
      stadt: "München, Haidhausen",
      avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&fit=crop&q=80",
      interessen: ["Fußball", "Fitness", "Reisen", "Hundeplatz"],
    },
  ];
  const [isGuest, setIsGuest]               = useState(false);
  const [myOwnerProfile, setMyOwnerProfile] = useState<OwnerInfo | null>(null);
  const [myDogs, setMyDogs]                 = useState<MyDog[]>([]);
  const [activeDogId, setActiveDogId]       = useState<string | null>(null);
  const [partnerCards, setPartnerCards]     = useState<PartnerCard[]>([]);
  const [cardIndex, setCardIndex]           = useState(0);

  const [gassiFilter, setGassiFilter]       = useState<GassiFilterState>(DEFAULT_GASSI_FILTER);
  const [filterVisible, setFilterVisible]   = useState(false);

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showRegister, setShowRegister]         = useState(false);
  const [hundeModalVisible, setHundeModalVisible] = useState(false);

  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);

  const [matchVisible, setMatchVisible]     = useState(false);
  const [matchCard, setMatchCard]           = useState<PartnerCard | null>(null);
  const matchScale   = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadUserInfo(); }, []);

  useEffect(() => {
    if (!showProfileSetup && !showRegister && (myDogs.length > 0 || isGuest)) {
      loadPartnerCards();
    }
  }, [activeDogId, isGuest, showProfileSetup, showRegister, gassiFilter]);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setLoading(false);
        return;
      }

      setIsGuest(false);

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, city, avatar_url")
        .eq("id", user.id)
        .single();

      if (!profile?.name || !profile?.city) {
        setShowProfileSetup(true);
        setLoading(false);
        return;
      }

      setMyOwnerProfile({
        name: profile.name,
        alter: 0,
        geschlecht: "–",
        bio: null,
        stadt: profile.city,
        avatar_url: profile.avatar_url ?? null,
        interessen: [],
      });

      // Load my dogs
      const { data: dogs } = await supabase
        .from("owner_pets")
        .select("id, name, rasse, groesse_kategorie, alter_jahre, foto_url")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (!dogs || dogs.length === 0) {
        setShowRegister(true);
        setLoading(false);
        return;
      }

      const myDogList: MyDog[] = dogs.map((d: any) => ({ ...d, modus: "gassidate" }));
      setMyDogs(myDogList);
      setActiveDogId(myDogList[0].id);
    } catch (e) {
      console.error("GassiFeed.loadUserInfo", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerCards = async () => {
    try {
      const gf = gassiFilter;

      // Load dogs from Supabase and pair with rotating demo owners
      let query = supabase
        .from("pets")
        .select("id, name, rasse, groesse_kategorie, alter_jahre, geschlecht, aktivitaetslevel, kinderfreundlich, vertraeglich_mit_tieren, charakter_tags, beschreibung, kastriert, pet_photos(url, position)")
        .eq("status", "verfuegbar")
        .order("created_at", { ascending: false })
        .limit(20);

      if (gf.groesse.length > 0) query = query.in("groesse_kategorie", gf.groesse);
      if (gf.aktivitaetslevel.length > 0) query = query.in("aktivitaetslevel", gf.aktivitaetslevel);
      if (gf.maxAlterJahre < 15) query = query.lte("alter_jahre", gf.maxAlterJahre);

      const { data, error } = await query;

      if (error) throw error;

      const cards: PartnerCard[] = (data ?? []).map((p: any, i: number) => {
        const photos = (p.pet_photos ?? [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((ph: any) => ph.url);

        const owner = DEMO_OWNERS[i % DEMO_OWNERS.length];

        return {
          id: p.id,
          name: p.name,
          rasse: p.rasse,
          groesse_kategorie: p.groesse_kategorie,
          alter_jahre: p.alter_jahre,
          geschlecht: p.geschlecht ?? null,
          kinderfreundlich: !!p.kinderfreundlich,
          vertraeglich_mit_tieren: !!p.vertraeglich_mit_tieren,
          kastriert: !!p.kastriert,
          aktivitaetslevel: p.aktivitaetslevel,
          charakter_tags: p.charakter_tags ?? [],
          beschreibung: p.beschreibung,
          photos,
          modus: "gassidate",
          owner,
        };
      });

      setPartnerCards(cards);
      setCardIndex(0);
    } catch (e) {
      console.error("GassiFeed.loadPartnerCards", e);
    }
  };

  const handleAction = async (richtung: "ja" | "nein") => {
    const card = partnerCards[cardIndex];
    if (!card) return;

    if (richtung === "ja") {
      setMatchCard(card);
      setMatchVisible(true);
      matchScale.setValue(0);
      matchOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(matchScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(matchOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    goToNext();
  };

  const goToNext = () => {
    if (cardIndex + 1 < partnerCards.length) setCardIndex(cardIndex + 1);
    else loadPartnerCards();
  };

  const handleProfileSetupDone = (profile: OwnerInfo) => {
    setMyOwnerProfile(profile);
    setShowProfileSetup(false);
    setShowRegister(true);
  };

  const handleRegisterDone = async () => {
    setShowRegister(false);
    setLoading(true);
    await loadUserInfo();
  };

  // ── Flows ─────────────────────────────────────────────────────────────────

  if (showProfileSetup) {
    return <ProfileSetupScreen onDone={handleProfileSetupDone} />;
  }

  if (showRegister) {
    return (
      <RegisterDogScreen
        onDone={handleRegisterDone}
        onBack={() => setShowProfileSetup(true)}
      />
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.SECONDARY} size="large" />
      </View>
    );
  }

  const currentCard = partnerCards[cardIndex];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: Colors.WHITE,
          paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}
      >
        {/* Back to splash */}
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
        >
          <Text style={{ fontSize: 18, color: Colors.SECONDARY }}>‹</Text>
          <Text style={{ fontSize: 12, color: Colors.SECONDARY, fontWeight: "500" }}> {t.gassi_feed_back}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Right side: Hunde + Filter */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!isGuest && myDogs.length > 0 && (
            <TouchableOpacity
              onPress={() => setHundeModalVisible(true)}
              style={{
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: Sizes.RADIUS_FULL,
                backgroundColor: Colors.SURFACE,
                flexDirection: "row", alignItems: "center", gap: 5,
              }}
            >
              <Ionicons name="paw" size={13} color={Colors.SECONDARY} />
              <Text style={{ color: Colors.SECONDARY, fontWeight: "600", fontSize: 11 }}>
                {myDogs.find((d) => d.id === activeDogId)?.name ?? t.gassi_dogs_modal_title}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={{
              paddingHorizontal: 12, paddingVertical: 7,
              borderRadius: Sizes.RADIUS_FULL,
              backgroundColor: Colors.SURFACE,
              flexDirection: "row", alignItems: "center", gap: 5,
            }}
          >
            <Ionicons name="options-outline" size={14} color={Colors.SECONDARY} />
            <Text style={{ color: Colors.SECONDARY, fontWeight: "600", fontSize: 11 }}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty */}
      {partnerCards.length === 0 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="paw-outline" size={56} color={Colors.TEXT_MUTED} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            {t.gassi_feed_no_partners}
          </Text>
          <TouchableOpacity
            onPress={() => loadPartnerCards()}
            style={{ height: Sizes.BUTTON_HEIGHT, paddingHorizontal: 28, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700" }}>{t.gassi_feed_reload}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feed */}
      {partnerCards.length > 0 && currentCard && (
        <SwipeCard
          key={`card-${cardIndex}`}
          card={currentCard}
          saving={saving}
          onAction={handleAction}
        />
      )}

      {/* Meine Hunde Modal */}
      <MeineHundeModal
        visible={hundeModalVisible}
        dogs={myDogs}
        activeDogId={activeDogId}
        onClose={() => setHundeModalVisible(false)}
        onSelectDog={(id) => { setActiveDogId(id); setHundeModalVisible(false); }}
        onAddDog={() => { setHundeModalVisible(false); setShowRegister(true); }}
      />

      {/* Filter Modals */}
      <GassiFilterModal
        visible={filterVisible}
        filter={gassiFilter}
        onApply={(f) => { setGassiFilter(f); setCardIndex(0); }}
        onClose={() => setFilterVisible(false)}
      />

      {/* Match Modal */}
      <Modal transparent visible={matchVisible} animationType="none">
        <Animated.View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
          alignItems: "center", justifyContent: "center", opacity: matchOpacity,
        }}>
          <Animated.View style={{
            backgroundColor: Colors.WHITE, borderRadius: 28, padding: 32,
            alignItems: "center", width: "82%", transform: [{ scale: matchScale }],
          }}>
            <Ionicons name="heart" size={48} color={Colors.PRIMARY} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.SECONDARY, marginBottom: 4 }}>Match!</Text>
            {matchCard?.photos[0] && (
              <Image source={{ uri: matchCard.photos[0] }} style={{ width: 100, height: 100, borderRadius: 50, marginVertical: 16, borderWidth: 3, borderColor: Colors.SECONDARY }} />
            )}
            <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, marginBottom: 2 }}>{matchCard?.name}</Text>
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, marginBottom: 4 }}>
              {matchCard ? t.gassi_feed_match_owner(matchCard.owner.name, matchCard.owner.stadt) : ""}
            </Text>
            <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              {t.gassi_feed_match_desc}
            </Text>
            <TouchableOpacity
              onPress={() => setMatchVisible(false)}
              style={{ width: "100%", height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center", marginBottom: 10 }}
            >
              <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>{t.gassi_feed_match_message}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMatchVisible(false)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>{t.gassi_feed_match_keep_swiping}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}
