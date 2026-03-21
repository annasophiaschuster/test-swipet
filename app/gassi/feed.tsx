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

const GROESSE_OPTIONS = ["klein", "mittel", "gross", "riese"] as const;
const AKTIV_OPTIONS   = ["ruhig", "mittel", "sportlich"] as const;

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
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PartnerDog {
  id: string;
  name: string;
  rasse: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  kinderfreundlich: boolean;
  vertraeglich_mit_tieren: boolean;
  aktivitaetslevel: string | null;
  foto_url: string | null;
  owner_name: string | null;
  owner_city: string | null;
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
// SwipeCard — Tinder-style partner dog card
// ─────────────────────────────────────────────────────────────────────────────

function SwipeCard({
  dog,
  modus,
  saving,
  onAction,
}: {
  dog: PartnerDog;
  modus: "gassidate" | "zucht";
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
        {/* Hauptfoto */}
        <View style={{ height: W * 1.05, position: "relative" }}>
          {dog.foto_url ? (
            <Image source={{ uri: dog.foto_url }} style={{ width: W, height: W * 1.05 }} resizeMode="cover" />
          ) : (
            <View style={{ width: W, height: W * 1.05, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 96 }}>🐶</Text>
            </View>
          )}
          {/* Modus badge */}
          <View style={{
            position: "absolute", top: 14, left: 14,
            backgroundColor: modus === "gassidate" ? Colors.SECONDARY : "#9B59B6",
            paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
          }}>
            <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>
              {modus === "gassidate" ? "🦮 Gassidate" : "🌸 Zucht"}
            </Text>
          </View>
        </View>

        {/* Name + Info */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.TEXT }}>{dog.name}</Text>
            {dog.alter_jahre && (
              <Text style={{ fontSize: 17, color: Colors.TEXT_MUTED }}>
                {dog.alter_jahre} {dog.alter_jahre === 1 ? "Jahr" : "Jahre"}
              </Text>
            )}
          </View>
          {dog.rasse && (
            <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, marginBottom: 6 }}>
              {dog.rasse}{dog.groesse_kategorie ? ` · ${GROESSE_LABEL[dog.groesse_kategorie] ?? dog.groesse_kategorie}` : ""}
            </Text>
          )}
          {dog.owner_city && (
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>📍 {dog.owner_city}</Text>
          )}
        </View>

        {/* Eigenschaften */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Eigenschaften
          </Text>
          {[
            { icon: "🏃", label: "Aktivität", value: AKTIV_LABEL[dog.aktivitaetslevel ?? ""] ?? "–" },
            { icon: "👦", label: "Kinderfreundlich", value: dog.kinderfreundlich ? "Ja" : "Nein" },
            { icon: "🐾", label: "Verträglich mit Tieren", value: dog.vertraeglich_mit_tieren ? "Ja" : "Nein" },
          ].map((row) => (
            <View key={row.label} style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
            }}>
              <Text style={{ fontSize: 14, color: Colors.TEXT }}>{row.icon}  {row.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.TEXT }}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Besitzer-Info */}
        {dog.owner_name && (
          <View style={{ marginHorizontal: 20, marginBottom: 8, padding: 14, backgroundColor: Colors.SURFACE, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 26 }}>👤</Text>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.TEXT }}>{dog.owner_name}</Text>
              {dog.owner_city && <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 }}>📍 {dog.owner_city}</Text>}
            </View>
          </View>
        )}

        {/* Buttons */}
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
// Hund Registrieren Screen
// ─────────────────────────────────────────────────────────────────────────────

function RegisterDogScreen({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [name, setName]           = useState("");
  const [rasse, setRasse]         = useState("");
  const [alterJahre, setAlterJahre] = useState("");
  const [groesse, setGroesse]     = useState<typeof GROESSE_OPTIONS[number] | null>(null);
  const [aktiv, setAktiv]         = useState<typeof AKTIV_OPTIONS[number] | null>(null);
  const [modus, setModus]         = useState<"gassidate" | "zucht">("gassidate");
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name fehlt", "Bitte gib deinem Hund einen Namen.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

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
      {/* Header */}
      <View style={{
        paddingTop: 56, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
      }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Text style={{ fontSize: 24, color: Colors.SECONDARY }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.TEXT }}>🐕 Hund registrieren</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>
        {/* Name */}
        <Text style={fieldLabel}>Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="z.B. Buddy"
          placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Rasse */}
        <Text style={fieldLabel}>Rasse</Text>
        <TextInput
          value={rasse}
          onChangeText={setRasse}
          placeholder="z.B. Labrador"
          placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Alter */}
        <Text style={fieldLabel}>Alter (Jahre)</Text>
        <TextInput
          value={alterJahre}
          onChangeText={setAlterJahre}
          placeholder="z.B. 3"
          keyboardType="numeric"
          placeholderTextColor={Colors.TEXT_MUTED}
          style={inputStyle}
        />

        {/* Größe */}
        <Text style={fieldLabel}>Größe</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {GROESSE_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGroesse(g)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 99, borderWidth: 1.5,
                borderColor: groesse === g ? Colors.SECONDARY : Colors.BORDER,
                backgroundColor: groesse === g ? Colors.SECONDARY + "15" : Colors.BACKGROUND,
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: "600",
                color: groesse === g ? Colors.SECONDARY : Colors.TEXT_MUTED,
              }}>
                {GROESSE_LABEL[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Aktivitätslevel */}
        <Text style={fieldLabel}>Aktivitätslevel</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {AKTIV_OPTIONS.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAktiv(a)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 99, borderWidth: 1.5,
                borderColor: aktiv === a ? Colors.SECONDARY : Colors.BORDER,
                backgroundColor: aktiv === a ? Colors.SECONDARY + "15" : Colors.BACKGROUND,
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: "600",
                color: aktiv === a ? Colors.SECONDARY : Colors.TEXT_MUTED,
              }}>
                {AKTIV_LABEL[a]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Modus */}
        <Text style={fieldLabel}>Modus</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 32 }}>
          <TouchableOpacity
            onPress={() => setModus("gassidate")}
            style={{
              flex: 1, padding: 14, borderRadius: 14, borderWidth: 2,
              borderColor: modus === "gassidate" ? Colors.SECONDARY : Colors.BORDER,
              backgroundColor: modus === "gassidate" ? Colors.SECONDARY + "10" : Colors.BACKGROUND,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🦮</Text>
            <Text style={{ fontWeight: "700", color: modus === "gassidate" ? Colors.SECONDARY : Colors.TEXT }}>Gassidate</Text>
            <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED, textAlign: "center", marginTop: 2 }}>
              Gemeinsam Gassi gehen
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModus("zucht")}
            style={{
              flex: 1, padding: 14, borderRadius: 14, borderWidth: 2,
              borderColor: modus === "zucht" ? "#9B59B6" : Colors.BORDER,
              backgroundColor: modus === "zucht" ? "#9B59B620" : Colors.BACKGROUND,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🌸</Text>
            <Text style={{ fontWeight: "700", color: modus === "zucht" ? "#9B59B6" : Colors.TEXT }}>Zucht</Text>
            <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED, textAlign: "center", marginTop: 2 }}>
              Nachwuchs finden
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            height: Sizes.BUTTON_HEIGHT, borderRadius: Sizes.RADIUS_FULL,
            backgroundColor: Colors.SECONDARY,
            alignItems: "center", justifyContent: "center",
          }}
        >
          {saving
            ? <ActivityIndicator color={Colors.WHITE} />
            : <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 17 }}>Hund anlegen →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const fieldLabel = {
  fontSize: 13,
  fontWeight: "700" as const,
  color: Colors.TEXT_MUTED,
  textTransform: "uppercase" as const,
  letterSpacing: 0.8,
  marginBottom: 8,
};
const inputStyle = {
  borderWidth: 1.5,
  borderColor: Colors.BORDER,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 15,
  color: Colors.TEXT,
  backgroundColor: Colors.BACKGROUND,
  marginBottom: 18,
};

// ─────────────────────────────────────────────────────────────────────────────
// Meine Hunde Modal
// ─────────────────────────────────────────────────────────────────────────────

function MeineHundeModal({
  visible,
  dogs,
  activeDogId,
  onClose,
  onSelectDog,
  onAddDog,
  onChangeModus,
}: {
  visible: boolean;
  dogs: MyDog[];
  activeDogId: string | null;
  onClose: () => void;
  onSelectDog: (id: string) => void;
  onAddDog: () => void;
  onChangeModus: (dog: MyDog) => void;
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
            <View
              key={dog.id}
              style={{
                borderRadius: 16, borderWidth: 2,
                borderColor: activeDogId === dog.id ? Colors.SECONDARY : Colors.BORDER,
                backgroundColor: activeDogId === dog.id ? Colors.SECONDARY + "08" : Colors.BACKGROUND,
                overflow: "hidden",
              }}
            >
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
                  <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                    {dog.rasse ?? "Mischling"}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: dog.modus === "gassidate" ? Colors.SECONDARY + "22" : "#F3EDFF",
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                }}>
                  <Text style={{
                    fontSize: 11, fontWeight: "700",
                    color: dog.modus === "gassidate" ? Colors.SECONDARY : "#9B59B6",
                  }}>
                    {dog.modus === "gassidate" ? "Gassidate" : "Zucht"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Actions */}
              <View style={{
                flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, gap: 8,
              }}>
                <TouchableOpacity
                  onPress={() => onChangeModus(dog)}
                  style={{
                    flex: 1, height: 32, borderRadius: 99,
                    borderWidth: 1, borderColor: Colors.BORDER,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, color: Colors.TEXT }}>
                    ⇄ Modus ändern
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add new dog */}
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
// Main Feed Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiFeed() {
  const [isGuest, setIsGuest]             = useState(false);
  const [myDogs, setMyDogs]               = useState<MyDog[]>([]);
  const [activeDogId, setActiveDogId]     = useState<string | null>(null);
  const [ownerSubMode, setOwnerSubMode]   = useState<"gassidate" | "zucht">("gassidate");

  const [partnerDogs, setPartnerDogs]     = useState<PartnerDog[]>([]);
  const [dogIndex, setDogIndex]           = useState(0);

  const [hundeModalVisible, setHundeModalVisible] = useState(false);
  const [showRegister, setShowRegister]   = useState(false);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  const [matchVisible, setMatchVisible]   = useState(false);
  const [matchDog, setMatchDog]           = useState<PartnerDog | null>(null);
  const matchScale   = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (myDogs.length > 0 && !showRegister) {
      loadPartnerDogs();
    }
  }, [activeDogId, ownerSubMode, myDogs.length, showRegister]);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        // Load demo partner dogs for guests
        await loadPartnerDogs(true);
        setLoading(false);
        return;
      }

      setIsGuest(false);

      const { data: dogs } = await supabase
        .from("owner_pets")
        .select("id, name, rasse, groesse_kategorie, alter_jahre, foto_url")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (!dogs || dogs.length === 0) {
        // No dogs registered → show registration
        setShowRegister(true);
        setLoading(false);
        return;
      }

      const myDogList: MyDog[] = dogs.map((d: any) => ({
        ...d,
        modus: "gassidate", // default modus
      }));

      setMyDogs(myDogList);
      setActiveDogId(myDogList[0].id);
    } catch (e) {
      console.error("GassiFeed.loadUserInfo", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerDogs = async (guestMode = false) => {
    try {
      // For all modes: load from pets table as demo partner dogs
      const { data, error } = await supabase
        .from("pets")
        .select(`
          id, name, rasse, groesse_kategorie, alter_jahre,
          aktivitaetslevel, kinderfreundlich, vertraeglich_mit_tieren,
          shelter:profiles!shelter_id(name, city),
          pet_photos(url, position)
        `)
        .eq("status", "verfuegbar")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const dogs: PartnerDog[] = (data ?? []).map((p: any) => {
        const photos = (p.pet_photos ?? []).sort((a: any, b: any) => a.position - b.position);
        return {
          id: p.id,
          name: p.name,
          rasse: p.rasse,
          groesse_kategorie: p.groesse_kategorie,
          alter_jahre: p.alter_jahre,
          kinderfreundlich: !!p.kinderfreundlich,
          vertraeglich_mit_tieren: !!p.vertraeglich_mit_tieren,
          aktivitaetslevel: p.aktivitaetslevel,
          foto_url: photos[0]?.url ?? null,
          owner_name: p.shelter?.name ?? null,
          owner_city: p.shelter?.city ?? null,
        };
      });

      setPartnerDogs(dogs);
      setDogIndex(0);
    } catch (e) {
      console.error("GassiFeed.loadPartnerDogs", e);
    }
  };

  const handleAction = async (richtung: "ja" | "nein") => {
    const dog = partnerDogs[dogIndex];
    if (!dog) return;

    if (isGuest) {
      goToNext();
      return;
    }

    if (richtung === "ja") {
      setSaving(true);
      try {
        // Show match celebration (in demo mode, always show match)
        setMatchDog(dog);
        setMatchVisible(true);
        matchScale.setValue(0);
        matchOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(matchScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(matchOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      } catch (e) {
        console.error("GassiFeed.handleAction", e);
      } finally {
        setSaving(false);
      }
    }
    goToNext();
  };

  const goToNext = () => {
    if (dogIndex + 1 < partnerDogs.length) setDogIndex(dogIndex + 1);
    else loadPartnerDogs();
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
              d.id === dog.id
                ? { ...d, modus: d.modus === "gassidate" ? "zucht" : "gassidate" }
                : d
            ));
          },
        },
        { text: "Abbrechen", style: "cancel" },
      ]
    );
  };

  // ── Registration flow ─────────────────────────────────────────────────────

  if (showRegister) {
    return (
      <RegisterDogScreen
        onDone={handleRegisterDone}
        onBack={() => router.back()}
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.SECONDARY} size="large" />
      </View>
    );
  }

  const currentDog = partnerDogs[dogIndex];
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
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.TEXT }}>🦮 Gassidate</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 }}>
            {activeModus === "gassidate" ? "Gassipartner finden" : "Zuchtpartner finden"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {/* Sub-mode toggle */}
          <View style={{
            flexDirection: "row", borderRadius: 99, overflow: "hidden",
            borderWidth: 1, borderColor: Colors.BORDER,
          }}>
            {(["gassidate", "zucht"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setOwnerSubMode(m)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  backgroundColor: activeModus === m ? Colors.SECONDARY : Colors.BACKGROUND,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: "600",
                  color: activeModus === m ? Colors.WHITE : Colors.TEXT_MUTED,
                }}>
                  {m === "gassidate" ? "Gassi" : "Zucht"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Meine Hunde button (only for logged-in users with dogs) */}
          {!isGuest && myDogs.length > 0 && (
            <TouchableOpacity
              onPress={() => setHundeModalVisible(true)}
              style={{
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: Sizes.RADIUS_FULL, borderWidth: 1.5, borderColor: Colors.BORDER,
                flexDirection: "row", alignItems: "center", gap: 5,
              }}
            >
              <Text style={{ fontSize: 13 }}>🐕</Text>
              <Text style={{ color: Colors.TEXT, fontWeight: "500", fontSize: 12 }}>
                {myDogs.find((d) => d.id === activeDogId)?.name ?? "Hunde"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Guest Banner */}
      {isGuest && (
        <View style={{
          marginHorizontal: 16, marginTop: 10,
          backgroundColor: "rgba(240,149,106,0.12)", borderRadius: 10,
          paddingHorizontal: 14, paddingVertical: 8,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderWidth: 1, borderColor: "rgba(240,149,106,0.3)",
        }}>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, flex: 1 }}>
            🦮 Demo-Modus — <Text style={{ fontWeight: "600" }}>Anmelden</Text> um echte Matches zu speichern
          </Text>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.SECONDARY }}>Login →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No partner dogs */}
      {partnerDogs.length === 0 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🐾</Text>
          <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
            Keine Partner in der Nähe
          </Text>
          <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
            Schau später nochmal vorbei!
          </Text>
          <TouchableOpacity
            onPress={() => loadPartnerDogs()}
            style={{
              height: Sizes.BUTTON_HEIGHT, paddingHorizontal: 28,
              backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "700" }}>Nochmal laden</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feed */}
      {partnerDogs.length > 0 && currentDog && (
        <SwipeCard
          key={`dog-${dogIndex}`}
          dog={currentDog}
          modus={activeModus}
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
        onSelectDog={(id) => {
          setActiveDogId(id);
          setHundeModalVisible(false);
        }}
        onAddDog={() => {
          setHundeModalVisible(false);
          setShowRegister(true);
        }}
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
            <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.SECONDARY, marginBottom: 4 }}>
              Es ist ein Match!
            </Text>
            {matchDog?.foto_url && (
              <Image
                source={{ uri: matchDog.foto_url }}
                style={{ width: 100, height: 100, borderRadius: 50, marginVertical: 16, borderWidth: 3, borderColor: Colors.SECONDARY }}
              />
            )}
            <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, marginBottom: 4 }}>
              {matchDog?.name}
            </Text>
            <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              Ihr habt euch beide geliked — schreibt euch!
            </Text>
            <TouchableOpacity
              onPress={() => setMatchVisible(false)}
              style={{
                width: "100%", height: Sizes.BUTTON_HEIGHT,
                backgroundColor: Colors.SECONDARY, borderRadius: Sizes.RADIUS_FULL,
                alignItems: "center", justifyContent: "center", marginBottom: 10,
              }}
            >
              <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: Sizes.FONT_MD }}>
                💬 Nachricht schreiben
              </Text>
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
