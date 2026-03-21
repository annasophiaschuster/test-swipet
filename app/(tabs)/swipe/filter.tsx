import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterState {
  tierart: "alle" | "hund" | "katze";
  groesse: string[];
  maxAlterJahre: number;
  geschlecht: "alle" | "männlich" | "weiblich";
  aktivitaetslevel: string[];
  kinderfreundlich: "alle" | "ja";
  braucht_garten: "alle" | "ja" | "nein";
  vertraeglich: "alle" | "ja";
  umkreis: number;
}

export const DEFAULT_FILTER: FilterState = {
  tierart: "alle",
  groesse: [],
  maxAlterJahre: 15,
  geschlecht: "alle",
  aktivitaetslevel: [],
  kinderfreundlich: "alle",
  braucht_garten: "alle",
  vertraeglich: "alle",
  umkreis: 100,
};

interface FilterModalProps {
  visible: boolean;
  filter: FilterState;
  onApply: (filter: FilterState) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Option Lists
// ─────────────────────────────────────────────────────────────────────────────

const GROESSE_OPTIONS = [
  { key: "klein", label: "Klein" },
  { key: "mittel", label: "Mittel" },
  { key: "gross", label: "Groß" },
  { key: "riese", label: "Riese" },
];

const ALTER_OPTIONS = [1, 2, 3, 5, 8, 15];
const UMKREIS_OPTIONS = [5, 10, 25, 50, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Filter Modal
// ─────────────────────────────────────────────────────────────────────────────

export default function FilterModal({ visible, filter, onApply, onClose }: FilterModalProps) {
  const [local, setLocal] = useState<FilterState>(filter);

  const toggle = <K extends keyof FilterState>(key: K, val: string) => {
    const arr = local[key] as string[];
    setLocal((prev) => ({
      ...prev,
      [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
    }));
  };

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => setLocal(DEFAULT_FILTER);

  const Pill = ({
    label, selected, onPress, color = Colors.PRIMARY,
  }: {
    label: string; selected: boolean; onPress: () => void; color?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 16, paddingVertical: 9,
        borderRadius: Sizes.RADIUS_FULL, borderWidth: 1.5,
        borderColor: selected ? color : Colors.BORDER,
        backgroundColor: selected ? color + "18" : Colors.SURFACE,
        marginRight: 8, marginBottom: 8,
      }}
    >
      <Text style={{
        color: selected ? color : Colors.TEXT,
        fontWeight: selected ? "600" : "400",
        fontSize: Sizes.FONT_SM,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT, marginBottom: subtitle ? 2 : 12 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginBottom: 12 }}>{subtitle}</Text>}
      {children}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          padding: Sizes.SPACING_LG, paddingTop: 20,
          borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
        }}>
          <TouchableOpacity onPress={handleReset}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>Zurücksetzen</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: Sizes.FONT_LG, fontWeight: "700", color: Colors.TEXT }}>Filter</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 22, color: Colors.TEXT_MUTED }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>

          {/* Größe */}
          <Section title="Größe" subtitle="Mehrere möglich">
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {GROESSE_OPTIONS.map((o) => (
                <Pill key={o.key} label={o.label}
                  selected={(local.groesse as string[]).includes(o.key)}
                  onPress={() => toggle("groesse", o.key)} />
              ))}
            </View>
          </Section>

          {/* Max Alter */}
          <Section title="Maximales Alter" subtitle={`Bis ${local.maxAlterJahre === 15 ? "15+" : local.maxAlterJahre} Jahre`}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {ALTER_OPTIONS.map((a) => (
                <Pill key={a} label={a === 15 ? "15+" : `${a} J.`}
                  selected={local.maxAlterJahre === a}
                  onPress={() => setLocal({ ...local, maxAlterJahre: a })} />
              ))}
            </View>
          </Section>

          {/* Geschlecht */}
          <Section title="Geschlecht">
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[{ k: "alle", l: "Alle" }, { k: "männlich", l: "♂ Männlich" }, { k: "weiblich", l: "♀ Weiblich" }].map(({ k, l }) => (
                <Pill key={k} label={l}
                  selected={local.geschlecht === k}
                  onPress={() => setLocal({ ...local, geschlecht: k as FilterState["geschlecht"] })} />
              ))}
            </View>
          </Section>

          {/* Aktivitätslevel */}
          <Section title="Aktivitätslevel" subtitle="Mehrere möglich">
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[{ k: "ruhig", l: "🛋 Ruhig" }, { k: "mittel", l: "🚶 Mittel" }, { k: "sportlich", l: "🏃 Sportlich" }].map(({ k, l }) => (
                <Pill key={k} label={l}
                  selected={(local.aktivitaetslevel as string[]).includes(k)}
                  onPress={() => toggle("aktivitaetslevel", k)} />
              ))}
            </View>
          </Section>

          {/* Kinderfreundlich */}
          <Section title="Kinderfreundlich">
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[{ k: "alle", l: "Egal" }, { k: "ja", l: "✅ Ja" }].map(({ k, l }) => (
                <Pill key={k} label={l}
                  selected={local.kinderfreundlich === k}
                  onPress={() => setLocal({ ...local, kinderfreundlich: k as FilterState["kinderfreundlich"] })} />
              ))}
            </View>
          </Section>

          {/* Garten */}
          <Section title="Garten erforderlich">
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[{ k: "alle", l: "Egal" }, { k: "nein", l: "✕ Nicht nötig" }, { k: "ja", l: "🌿 Braucht Garten" }].map(({ k, l }) => (
                <Pill key={k} label={l}
                  selected={local.braucht_garten === k}
                  onPress={() => setLocal({ ...local, braucht_garten: k as FilterState["braucht_garten"] })} />
              ))}
            </View>
          </Section>

          {/* Verträglich */}
          <Section title="Verträglich mit anderen Tieren">
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[{ k: "alle", l: "Egal" }, { k: "ja", l: "✅ Ja" }].map(({ k, l }) => (
                <Pill key={k} label={l}
                  selected={local.vertraeglich === k}
                  onPress={() => setLocal({ ...local, vertraeglich: k as FilterState["vertraeglich"] })} />
              ))}
            </View>
          </Section>

          {/* Umkreis */}
          <Section title="Umkreis" subtitle={local.umkreis === 100 ? "Unbegrenzt" : `${local.umkreis} km`}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {UMKREIS_OPTIONS.map((u) => (
                <Pill key={u} label={u === 100 ? "Alle" : `${u} km`}
                  selected={local.umkreis === u}
                  onPress={() => setLocal({ ...local, umkreis: u })} />
              ))}
            </View>
          </Section>

        </ScrollView>

        {/* Apply */}
        <View style={{ padding: Sizes.SPACING_LG, borderTopWidth: 1, borderTopColor: Colors.BORDER }}>
          <TouchableOpacity
            onPress={handleApply}
            style={{
              height: Sizes.BUTTON_HEIGHT, backgroundColor: Colors.PRIMARY,
              borderRadius: Sizes.RADIUS_FULL, alignItems: "center", justifyContent: "center",
              shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "600", fontSize: Sizes.FONT_MD }}>Filter anwenden</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
