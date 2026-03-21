import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";

const TOTAL_STEPS = 6;

type Wohnsituation = "wohnung" | "haus" | "haus_mit_garten" | "bauernhof";
type Erfahrung = "anfaenger" | "fortgeschritten" | "profi";
type Aktivitaet = "sportlich" | "mittel" | "ruhig";
type Arbeitszeit = "vollzeit" | "teilzeit" | "homeoffice" | "nicht_berufstaetig";

const WOHNSITUATION = [
  { key: "wohnung" as Wohnsituation, label: "🏢 Wohnung" },
  { key: "haus" as Wohnsituation, label: "🏡 Haus" },
  { key: "haus_mit_garten" as Wohnsituation, label: "🌿 Haus mit Garten" },
  { key: "bauernhof" as Wohnsituation, label: "🚜 Bauernhof" },
];
const ERFAHRUNG = [
  { key: "anfaenger" as Erfahrung, label: "🌱 Anfänger", desc: "Erstes Tier" },
  { key: "fortgeschritten" as Erfahrung, label: "⭐ Fortgeschritten", desc: "Schon Erfahrung" },
  { key: "profi" as Erfahrung, label: "🏆 Profi", desc: "Viel Erfahrung" },
];
const AKTIVITAET = [
  { key: "sportlich" as Aktivitaet, label: "🏃 Sportlich", desc: "Viel Bewegung täglich" },
  { key: "mittel" as Aktivitaet, label: "🚶 Mittel", desc: "Regelmäßige Spaziergänge" },
  { key: "ruhig" as Aktivitaet, label: "🛋️ Ruhig", desc: "Gemütliches Tempo" },
];
const ARBEITSZEIT = [
  { key: "vollzeit" as Arbeitszeit, label: "💼 Vollzeit" },
  { key: "teilzeit" as Arbeitszeit, label: "🕐 Teilzeit" },
  { key: "homeoffice" as Arbeitszeit, label: "🏠 Homeoffice" },
  { key: "nicht_berufstaetig" as Arbeitszeit, label: "☀️ Nicht berufstätig" },
];

export default function AdoptantOnboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [wohnsituation, setWohnsituation] = useState<Wohnsituation | null>(null);
  const [erfahrung, setErfahrung] = useState<Erfahrung | null>(null);
  const [kinderImHaushalt, setKinderImHaushalt] = useState<boolean | null>(null);
  const [andereTiere, setAndereTiere] = useState<boolean | null>(null);
  const [aktivitaetslevel, setAktivitaetslevel] = useState<Aktivitaet | null>(null);
  const [arbeitszeit, setArbeitszeit] = useState<Arbeitszeit | null>(null);

  const canContinue = () => {
    switch (step) {
      case 1: return wohnsituation !== null;
      case 2: return erfahrung !== null;
      case 3: return kinderImHaushalt !== null;
      case 4: return andereTiere !== null;
      case 5: return aktivitaetslevel !== null;
      case 6: return arbeitszeit !== null;
      default: return false;
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase.from("adoptant_profiles").insert({
        id: user.id,
        wohnsituation,
        erfahrung,
        kinder_im_haushalt: kinderImHaushalt ?? false,
        andere_tiere: andereTiere ?? false,
        aktivitaetslevel,
        arbeitszeit,
      });
      if (error) throw error;
      router.replace("/adoption/feed");
    } catch (error: any) {
      Alert.alert("Fehler", error.message);
    } finally {
      setLoading(false);
    }
  };

  const PillOption = ({
    label,
    desc,
    selected,
    onPress,
  }: {
    label: string;
    desc?: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: desc ? 16 : 12,
        paddingHorizontal: 20,
        borderRadius: Sizes.RADIUS_XL,
        borderWidth: 2,
        borderColor: selected ? Colors.PRIMARY : Colors.BORDER,
        backgroundColor: selected ? "#FFF0F3" : Colors.SURFACE,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text
          style={{
            color: selected ? Colors.PRIMARY : Colors.TEXT,
            fontWeight: selected ? "700" : "500",
            fontSize: Sizes.FONT_MD,
          }}
        >
          {label}
        </Text>
        {desc && (
          <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginTop: 2 }}>
            {desc}
          </Text>
        )}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? Colors.PRIMARY : Colors.BORDER,
          backgroundColor: selected ? Colors.PRIMARY : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "700" }}>✓</Text>}
      </View>
    </TouchableOpacity>
  );

  const YesNoToggle = ({
    value,
    onChange,
  }: {
    value: boolean | null;
    onChange: (v: boolean) => void;
  }) => (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {[
        { v: true, label: "Ja" },
        { v: false, label: "Nein" },
      ].map(({ v, label }) => (
        <TouchableOpacity
          key={label}
          onPress={() => onChange(v)}
          style={{
            flex: 1,
            height: 52,
            borderRadius: Sizes.RADIUS_FULL,
            borderWidth: 2,
            borderColor: value === v ? Colors.PRIMARY : Colors.BORDER,
            backgroundColor: value === v ? Colors.PRIMARY : Colors.SURFACE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: value === v ? Colors.WHITE : Colors.TEXT,
              fontWeight: "600",
              fontSize: Sizes.FONT_MD,
            }}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const STEPS = [
    {
      title: "Wie wohnst du?",
      subtitle: "Das hilft uns, passende Tiere zu finden.",
      content: (
        <View>
          {WOHNSITUATION.map((o) => (
            <PillOption
              key={o.key}
              label={o.label}
              selected={wohnsituation === o.key}
              onPress={() => setWohnsituation(o.key)}
            />
          ))}
        </View>
      ),
    },
    {
      title: "Deine Erfahrung mit Tieren?",
      subtitle: "Ehrlich bleiben — für dein und das Wohl des Tieres.",
      content: (
        <View>
          {ERFAHRUNG.map((o) => (
            <PillOption
              key={o.key}
              label={o.label}
              desc={o.desc}
              selected={erfahrung === o.key}
              onPress={() => setErfahrung(o.key)}
            />
          ))}
        </View>
      ),
    },
    {
      title: "Kinder im Haushalt?",
      subtitle: "Wichtig für die Tiervermittlung.",
      content: <YesNoToggle value={kinderImHaushalt} onChange={setKinderImHaushalt} />,
    },
    {
      title: "Andere Tiere zuhause?",
      subtitle: "Wir suchen verträgliche Kombinationen.",
      content: <YesNoToggle value={andereTiere} onChange={setAndereTiere} />,
    },
    {
      title: "Wie aktiv bist du?",
      subtitle: "Dein Tier soll zu deinem Lifestyle passen.",
      content: (
        <View>
          {AKTIVITAET.map((o) => (
            <PillOption
              key={o.key}
              label={o.label}
              desc={o.desc}
              selected={aktivitaetslevel === o.key}
              onPress={() => setAktivitaetslevel(o.key)}
            />
          ))}
        </View>
      ),
    },
    {
      title: "Deine Arbeitssituation?",
      subtitle: "Tiere brauchen Zeit und Aufmerksamkeit.",
      content: (
        <View>
          {ARBEITSZEIT.map((o) => (
            <PillOption
              key={o.key}
              label={o.label}
              selected={arbeitszeit === o.key}
              onPress={() => setArbeitszeit(o.key)}
            />
          ))}
        </View>
      ),
    },
  ];

  const current = STEPS[step - 1];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: Sizes.SPACING_LG,
          paddingBottom: Sizes.SPACING_MD,
          backgroundColor: Colors.BACKGROUND,
          borderBottomWidth: 1,
          borderBottomColor: Colors.BORDER,
        }}
      >
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginBottom: 8 }}>
          Schritt {step} von {TOTAL_STEPS}
        </Text>
        {/* Progress Bar */}
        <View style={{ height: 6, backgroundColor: Colors.BORDER, borderRadius: 3, marginBottom: 16 }}>
          <View
            style={{
              height: 6,
              width: `${(step / TOTAL_STEPS) * 100}%`,
              backgroundColor: Colors.PRIMARY,
              borderRadius: 3,
            }}
          />
        </View>
        <Text style={{ fontSize: Sizes.FONT_XL, fontWeight: "700", color: Colors.TEXT }}>
          {current.title}
        </Text>
        <Text style={{ color: Colors.TEXT_MUTED, marginTop: 4, fontSize: Sizes.FONT_SM }}>
          {current.subtitle}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingTop: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {current.content}
      </ScrollView>

      {/* Footer Buttons */}
      <View
        style={{
          padding: Sizes.SPACING_LG,
          flexDirection: "row",
          gap: 12,
          borderTopWidth: 1,
          borderTopColor: Colors.BORDER,
          backgroundColor: Colors.WHITE,
        }}
      >
        {step > 1 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={{
              flex: 1,
              height: Sizes.BUTTON_HEIGHT,
              borderWidth: 1.5,
              borderColor: Colors.BORDER,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
              ← Zurück
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={step === TOTAL_STEPS ? handleFinish : () => setStep(step + 1)}
          disabled={!canContinue() || loading}
          style={{
            flex: 2,
            height: Sizes.BUTTON_HEIGHT,
            backgroundColor: canContinue() ? Colors.PRIMARY : Colors.BORDER,
            borderRadius: Sizes.RADIUS_FULL,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color={Colors.WHITE} />
          ) : (
            <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
              {step === TOTAL_STEPS ? "Los geht's! 🎉" : "Weiter →"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
