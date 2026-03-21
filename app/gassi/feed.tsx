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
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

const { width: W } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Labels
// ─────────────────────────────────────────────────────────────────────────────

const GROESSE_OPTIONS = ["klein", "mittel", "gross", "riese"] as const;
const AKTIV_OPTIONS   = ["ruhig", "mittel", "sportlich"] as const;
const GESCHLECHT_OPTIONS = ["männlich", "weiblich", "divers"] as const;

const GROESSE_LABEL: Record<string, string> = {
  klein: "Klein (< 10 kg)",
  mittel: "Mittel (10–25 kg)",
  gross: "Groß (25–40 kg)",
  riese: "Riese (> 40 kg)",
};
const AKTIV_LABEL: Record<string, string> = {
  ruhig: "🛋 Ruhig",
  mittel: "🚶 Mäßig aktiv",
  sportlich: "🏃 Sehr aktiv",
};

// ─────────────────────────────────────────────────────────────────────────────
// Demo Owner Profiles (3 Musterdaten)
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_OWNERS = [
  {
    name: "Max",
    alter: 28,
    geschlecht: "männlich",
    bio: "Laufe gerne durch Parks und liebe lange Morgenspaziergänge. Mein Hund ist mein bester Freund!",
    stadt: "München, Schwabing",
    avatar_url: null as string | null,
  },
  {
    name: "Sophie",
    alter: 32,
    geschlecht: "weiblich",
    bio: "Leidenschaftliche Hundemama seit 5 Jahren. Liebe Outdoor-Aktivitäten und freue mich über neue Hundekontakte.",
    stadt: "Hamburg, Altona",
    avatar_url: null as string | null,
  },
  {
    name: "Jonas",
    alter: 25,
    geschlecht: "männlich",
    bio: "Täglich 2 Stunden aktiv — mein Hund und ich sind unzertrennlich. Suche regelmäßige Gassipartner.",
    stadt: "Berlin, Prenzlauer Berg",
    avatar_url: null as string | null,
  },
];

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
}

interface PartnerCard {
  id: string;
  name: string;
  rasse: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  kinderfreundlich: boolean;
  vertraeglich_mit_tieren: boolean;
  aktivitaetslevel: string | null;
  charakter_tags: string[];
  beschreibung: string | null;
  photos: string[];
  modus: "gassidate" | "zucht";
  owner: OwnerInfo;
}

interface MyDog {
  id: string;
  name: string;
  rasse: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  foto_url: string | null;
  modus: "gassidate" | "zucht";
}

// ─────────────────────────────────────────────────────────────────────────────
// SwipeCard — interleaved layout with owner section
// ─────────────────────────────────────────────────────────────────────────────

function SwipeCard({
  card, saving, onAction,
}: {
  card: PartnerCard;
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
        <View style={{ height: W * 1.1, position: "relative" }}>
          {card.photos[0] ? (
            <Image source={{ uri: card.photos[0] }} style={{ width: W, height: W * 1.1 }} resizeMode="cover" />
          ) : (
            <View style={{ width: W, height: W * 1.1, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 96 }}>🐶</Text>
            </View>
          )}
          {/* Modus badge */}
          <View style={{
            position: "absolute", top: 14, left: 14,
            backgroundColor: card.modus === "gassidate" ? Colors.SECONDARY : "#9B59B6",
            paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
          }}>
            <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>
              {card.modus === "gassidate" ? "🦮 Gassidate" : "🌸 Zucht"}
            </Text>
          </View>
          {card.photos.length > 1 && (
            <View style={{
              position: "absolute", top: 14, right: 14,
              backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>1 / {card.photos.length}</Text>
            </View>
          )}
        </View>

        {/* 2. Hund: Name + Alter + Rasse + Größe + Beschreibung */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 30, fontWeight: "800", color: Colors.TEXT }}>{card.name}</Text>
            {card.alter_jahre && (
              <Text style={{ fontSize: 16, color: Colors.TEXT_MUTED }}>
                {card.alter_jahre} {card.alter_jahre === 1 ? "Jahr" : "Jahre"}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, marginBottom: card.beschreibung ? 12 : 0 }}>
            {[card.rasse, card.groesse_kategorie ? GROESSE_LABEL[card.groesse_kategorie] : null]
              .filter(Boolean).join(" · ")}
          </Text>
          {card.beschreibung && (
            <Text style={{ fontSize: 15, color: Colors.TEXT, lineHeight: 23 }}>{card.beschreibung}</Text>
          )}
        </View>

        {/* 3. Besitzer-Sektion */}
        <View style={{
          marginHorizontal: 16, marginBottom: 4,
          padding: 16, backgroundColor: Colors.SURFACE, borderRadius: 18,
          borderWidth: 1, borderColor: Colors.BORDER,
        }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Besitzer
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
            {/* Avatar */}
            {owner.avatar_url ? (
              <Image
                source={{ uri: owner.avatar_url }}
                style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.BORDER }}
              />
            ) : (
              <View style={{
                width: 60, height: 60, borderRadius: 30,
                backgroundColor: Colors.SECONDARY + "22",
                alignItems: "center", justifyContent: "center",
                borderWidth: 2, borderColor: Colors.SECONDARY + "40",
              }}>
                <Text style={{ fontSize: 26 }}>👤</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT }}>{owner.name}</Text>
                <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>
                  {owner.alter} · {owner.geschlecht === "männlich" ? "♂" : owner.geschlecht === "weiblich" ? "♀" : "⚧"}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginBottom: 6 }}>
                📍 {owner.stadt}
              </Text>
              {owner.bio && (
                <Text style={{ fontSize: 14, color: Colors.TEXT, lineHeight: 21, fontStyle: "italic" }}>
                  "{owner.bio}"
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 4. Zweites Foto */}
        {card.photos[1] && (
          <Image source={{ uri: card.photos[1] }} style={{ width: W, height: W * 0.72, marginTop: 12 }} resizeMode="cover" />
        )}

        {/* 5. Charakter-Tags */}
        {card.charakter_tags && card.charakter_tags.length > 0 && (
          <View style={{ padding: 20, paddingTop: 18 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Charakter
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {card.charakter_tags.map((tag) => (
                <View key={tag} style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  backgroundColor: Colors.SECONDARY + "15", borderRadius: 99,
                  borderWidth: 1, borderColor: Colors.SECONDARY + "40",
                }}>
                  <Text style={{ fontSize: 13, color: Colors.SECONDARY, fontWeight: "600" }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 6. Drittes Foto */}
        {card.photos[2] && (
          <Image source={{ uri: card.photos[2] }} style={{ width: W, height: W * 0.72 }} resizeMode="cover" />
        )}

        {/* 7. Eigenschaften */}
        <View style={{ padding: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Eigenschaften
          </Text>
          {[
            { icon: "🏃", label: "Aktivitätslevel", value: AKTIV_LABEL[card.aktivitaetslevel ?? ""] ?? "–" },
            { icon: "🐾", label: "Verträgl. mit Tieren", value: card.vertraeglich_mit_tieren ? "Ja" : "Nein" },
            { icon: "👦", label: "Kindergeeignet", value: card.kinderfreundlich ? "Ja" : "Nein" },
            { icon: "🎯", label: "Modus", value: card.modus === "gassidate" ? "🦮 Gassidate" : "🌸 Zucht" },
          ].map((row) => (
            <View key={row.label} style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
            }}>
              <Text style={{ fontSize: 14, color: Colors.TEXT }}>{row.icon}  {row.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.TEXT }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* 8. Like / Nope Buttons */}
        <View style={{ flexDirection: "row", gap: 14, padding: 20, paddingTop: 20, paddingBottom: 44 }}>
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
              flex: 1, height: 62, borderRadius: Sizes.RADIUS_FULL, backgroundColor: Colors.SECONDARY,
              alignItems: "center", justifyContent: "center",
              shadowColor: Colors.SECONDARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
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
// ProfileSetupScreen — owner registration (Pflichtfelder)
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSetupScreen({ onDone }: { onDone: (profile: OwnerInfo) => void }) {
  const [name, setName]         = useState("");
  const [alter, setAlter]       = useState("");
  const [geschlecht, setGeschlecht] = useState<"männlich" | "weiblich" | "divers" | null>(null);
  const [bio, setBio]           = useState("");
  const [stadt, setStadt]       = useState("");
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Pflichtfeld", "Bitte gib deinen Vornamen ein."); return; }
    if (!alter.trim() || isNaN(Number(alter))) { Alert.alert("Pflichtfeld", "Bitte gib dein Alter ein."); return; }
    if (!geschlecht) { Alert.alert("Pflichtfeld", "Bitte wähle dein Geschlecht."); return; }
    if (!stadt.trim()) { Alert.alert("Pflichtfeld", "Bitte gib deinen Stadtteil / deine Stadt ein."); return; }

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
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>👤 Dein Profil</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>Damit andere dich kennenlernen können</Text>
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
          <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 8 }}>Profilfoto (kommt bald)</Text>
        </View>

        {/* Vorname */}
        <Text style={fieldLabel}>Vorname *</Text>
        <TextInput
          value={name} onChangeText={setName}
          placeholder="z.B. Max" placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Alter */}
        <Text style={fieldLabel}>Alter *</Text>
        <TextInput
          value={alter} onChangeText={setAlter}
          placeholder="z.B. 28" keyboardType="numeric"
          placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Geschlecht */}
        <Text style={fieldLabel}>Geschlecht *</Text>
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
        <Text style={fieldLabel}>Stadt / Stadtteil *</Text>
        <TextInput
          value={stadt} onChangeText={setStadt}
          placeholder="z.B. München, Schwabing"
          placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Bio */}
        <Text style={fieldLabel}>Kurze Bio (optional)</Text>
        <TextInput
          value={bio} onChangeText={setBio}
          placeholder="Ich bin... (wird auf deiner Karte angezeigt)"
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
            : <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 17 }}>Weiter →</Text>
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
  const [name, setName]         = useState("");
  const [rasse, setRasse]       = useState("");
  const [alterJahre, setAlterJahre] = useState("");
  const [groesse, setGroesse]   = useState<typeof GROESSE_OPTIONS[number] | null>(null);
  const [aktiv, setAktiv]       = useState<typeof AKTIV_OPTIONS[number] | null>(null);
  const [modus, setModus]       = useState<"gassidate" | "zucht">("gassidate");
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Name fehlt", "Bitte gib deinem Hund einen Namen."); return; }
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
      Alert.alert("Fehler", e.message ?? "Konnte Hund nicht speichern.");
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
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>🐕 Hund registrieren</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>Schritt 2 von 2</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>
        <Text style={fieldLabel}>Name *</Text>
        <TextInput value={name} onChangeText={setName} placeholder="z.B. Buddy" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

        <Text style={fieldLabel}>Rasse</Text>
        <TextInput value={rasse} onChangeText={setRasse} placeholder="z.B. Labrador" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

        <Text style={fieldLabel}>Alter (Jahre)</Text>
        <TextInput value={alterJahre} onChangeText={setAlterJahre} placeholder="z.B. 3" keyboardType="numeric" placeholderTextColor={Colors.TEXT_MUTED} style={inputStyle} />

        <Text style={fieldLabel}>Größe</Text>
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

        <Text style={fieldLabel}>Aktivitätslevel</Text>
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

        <Text style={fieldLabel}>Modus</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 32 }}>
          <TouchableOpacity onPress={() => setModus("gassidate")}
            style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 2, alignItems: "center", borderColor: modus === "gassidate" ? Colors.SECONDARY : Colors.BORDER, backgroundColor: modus === "gassidate" ? Colors.SECONDARY + "10" : Colors.BACKGROUND }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🦮</Text>
            <Text style={{ fontWeight: "700", color: modus === "gassidate" ? Colors.SECONDARY : Colors.TEXT }}>Gassidate</Text>
            <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED, textAlign: "center", marginTop: 2 }}>Gemeinsam Gassi gehen</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModus("zucht")}
            style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 2, alignItems: "center", borderColor: modus === "zucht" ? "#9B59B6" : Colors.BORDER, backgroundColor: modus === "zucht" ? "#9B59B620" : Colors.BACKGROUND }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🌸</Text>
            <Text style={{ fontWeight: "700", color: modus === "zucht" ? "#9B59B6" : Colors.TEXT }}>Zucht</Text>
            <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED, textAlign: "center", marginTop: 2 }}>Nachwuchs finden</Text>
          </TouchableOpacity>
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
  visible, dogs, activeDogId, onClose, onSelectDog, onAddDog, onChangeModus,
}: {
  visible: boolean; dogs: MyDog[]; activeDogId: string | null;
  onClose: () => void; onSelectDog: (id: string) => void;
  onAddDog: () => void; onChangeModus: (dog: MyDog) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        <View style={{
          paddingTop: 20, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>🐕 Meine Hunde</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: Colors.TEXT_MUTED }}>Schließen</Text>
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
                  <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 }}>{dog.rasse ?? "Mischling"}</Text>
                </View>
                <View style={{
                  backgroundColor: dog.modus === "gassidate" ? Colors.SECONDARY + "22" : "#F3EDFF",
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: dog.modus === "gassidate" ? Colors.SECONDARY : "#9B59B6" }}>
                    {dog.modus === "gassidate" ? "Gassidate" : "Zucht"}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>
                <TouchableOpacity
                  onPress={() => onChangeModus(dog)}
                  style={{ flex: 1, height: 32, borderRadius: 99, borderWidth: 1, borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 12, color: Colors.TEXT }}>⇄ Modus ändern</Text>
                </TouchableOpacity>
              </View>
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
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.TEXT_MUTED }}>Neuen Hund anlegen</Text>
          </TouchableOpacity>
        </ScrollView>
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Feed Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiFeed() {
  const [isGuest, setIsGuest]               = useState(false);
  const [myOwnerProfile, setMyOwnerProfile] = useState<OwnerInfo | null>(null);
  const [myDogs, setMyDogs]                 = useState<MyDog[]>([]);
  const [activeDogId, setActiveDogId]       = useState<string | null>(null);
  const [ownerSubMode, setOwnerSubMode]     = useState<"gassidate" | "zucht">("gassidate");

  const [partnerCards, setPartnerCards]     = useState<PartnerCard[]>([]);
  const [cardIndex, setCardIndex]           = useState(0);

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
  }, [activeDogId, ownerSubMode, isGuest, showProfileSetup, showRegister]);

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
        alter: 0, // stored locally; not in DB
        geschlecht: "–",
        bio: null,
        stadt: profile.city,
        avatar_url: profile.avatar_url ?? null,
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
      // Load dogs from Supabase and pair with rotating demo owners
      const { data, error } = await supabase
        .from("pets")
        .select("id, name, rasse, groesse_kategorie, alter_jahre, aktivitaetslevel, kinderfreundlich, vertraeglich_mit_tieren, charakter_tags, beschreibung, pet_photos(url, position)")
        .eq("status", "verfuegbar")
        .order("created_at", { ascending: false })
        .limit(20);

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
          kinderfreundlich: !!p.kinderfreundlich,
          vertraeglich_mit_tieren: !!p.vertraeglich_mit_tieren,
          aktivitaetslevel: p.aktivitaetslevel,
          charakter_tags: p.charakter_tags ?? [],
          beschreibung: p.beschreibung,
          photos,
          modus: ownerSubMode,
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

  const handleChangeModus = (dog: MyDog) => {
    Alert.alert(
      `Modus von ${dog.name}`,
      `Aktuell: ${dog.modus === "gassidate" ? "Gassidate" : "Zucht"}`,
      [
        {
          text: `→ ${dog.modus === "gassidate" ? "Zucht" : "Gassidate"}`,
          onPress: () => {
            setMyDogs((prev) => prev.map((d) =>
              d.id === dog.id ? { ...d, modus: d.modus === "gassidate" ? "zucht" : "gassidate" } : d
            ));
          },
        },
        { text: "Abbrechen", style: "cancel" },
      ]
    );
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
  const activeModus = myDogs.find((d) => d.id === activeDogId)?.modus ?? ownerSubMode;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 12,
        backgroundColor: Colors.BACKGROUND,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Back to splash */}
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ fontSize: 18, color: Colors.TEXT_MUTED }}>‹</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, fontWeight: "500" }}>Modi</Text>
        </TouchableOpacity>

        {/* Mode toggle */}
        <View style={{
          flexDirection: "row", borderRadius: 99, overflow: "hidden",
          borderWidth: 1, borderColor: Colors.BORDER,
        }}>
          {(["gassidate", "zucht"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setOwnerSubMode(m)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7,
                backgroundColor: ownerSubMode === m ? Colors.SECONDARY : Colors.BACKGROUND,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: ownerSubMode === m ? Colors.WHITE : Colors.TEXT_MUTED }}>
                {m === "gassidate" ? "🦮 Gassi" : "🌸 Zucht"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meine Hunde button */}
        {!isGuest && myDogs.length > 0 ? (
          <TouchableOpacity
            onPress={() => setHundeModalVisible(true)}
            style={{
              paddingHorizontal: 10, paddingVertical: 7,
              borderRadius: Sizes.RADIUS_FULL, borderWidth: 1.5, borderColor: Colors.BORDER,
              flexDirection: "row", alignItems: "center", gap: 4,
            }}
          >
            <Text style={{ fontSize: 13 }}>🐕</Text>
            <Text style={{ color: Colors.TEXT, fontWeight: "500", fontSize: 11 }}>
              {myDogs.find((d) => d.id === activeDogId)?.name ?? "Hunde"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Empty */}
      {partnerCards.length === 0 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🐾</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            Keine Partner in der Nähe
          </Text>
          <TouchableOpacity
            onPress={() => loadPartnerCards()}
            style={{ height: Sizes.BUTTON_HEIGHT, paddingHorizontal: 28, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700" }}>Nochmal laden</Text>
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
        onChangeModus={handleChangeModus}
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
            <Text style={{ fontSize: 52, marginBottom: 8 }}>🎉</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.SECONDARY, marginBottom: 4 }}>Match!</Text>
            {matchCard?.photos[0] && (
              <Image source={{ uri: matchCard.photos[0] }} style={{ width: 100, height: 100, borderRadius: 50, marginVertical: 16, borderWidth: 3, borderColor: Colors.SECONDARY }} />
            )}
            <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, marginBottom: 2 }}>{matchCard?.name}</Text>
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, marginBottom: 4 }}>
              Besitzer: {matchCard?.owner.name} · {matchCard?.owner.stadt}
            </Text>
            <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              Ihr habt euch gegenseitig geliked — schreibt euch!
            </Text>
            <TouchableOpacity
              onPress={() => setMatchVisible(false)}
              style={{ width: "100%", height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center", marginBottom: 10 }}
            >
              <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>💬 Nachricht schreiben</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMatchVisible(false)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Weiter swipen</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}
