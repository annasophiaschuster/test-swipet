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

export interface FilterState {
  tierart: "alle" | "hund" | "katze";
  groesse: string[];
  maxAlterJahre: number;
}

const DEFAULT_FILTER: FilterState = {
  tierart: "alle",
  groesse: [],
  maxAlterJahre: 15,
};

interface FilterModalProps {
  visible: boolean;
  filter: FilterState;
  onApply: (filter: FilterState) => void;
  onClose: () => void;
}

const GROESSE_OPTIONS = [
  { key: "klein", label: "Klein" },
  { key: "mittel", label: "Mittel" },
  { key: "gross", label: "Groß" },
  { key: "riese", label: "Riese" },
];

const ALTER_OPTIONS = [1, 2, 3, 5, 8, 15];

export { DEFAULT_FILTER };

export default function FilterModal({
  visible,
  filter,
  onApply,
  onClose,
}: FilterModalProps) {
  const [local, setLocal] = useState<FilterState>(filter);

  const toggleGroesse = (key: string) => {
    setLocal((prev) => ({
      ...prev,
      groesse: prev.groesse.includes(key)
        ? prev.groesse.filter((g) => g !== key)
        : [...prev.groesse, key],
    }));
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleReset = () => {
    setLocal(DEFAULT_FILTER);
  };

  const PillToggle = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: Sizes.RADIUS_FULL,
        borderWidth: 1.5,
        borderColor: selected ? Colors.PRIMARY : Colors.BORDER,
        backgroundColor: selected ? Colors.PRIMARY : Colors.SURFACE,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          color: selected ? Colors.WHITE : Colors.TEXT,
          fontWeight: selected ? "600" : "400",
          fontSize: Sizes.FONT_SM,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: Sizes.SPACING_LG,
            paddingTop: 20,
            borderBottomWidth: 1,
            borderBottomColor: Colors.BORDER,
          }}
        >
          <TouchableOpacity onPress={handleReset}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
              Zurücksetzen
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: Sizes.FONT_LG, fontWeight: "700", color: Colors.TEXT }}>
            Filter
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 22, color: Colors.TEXT_MUTED }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>
          {/* Tierart */}
          <Text style={styles.sectionTitle}>Tierart</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 24 }}>
            {[
              { key: "alle", label: "🐾 Alle" },
              { key: "hund", label: "🐶 Hunde" },
              { key: "katze", label: "🐱 Katzen" },
            ].map((o) => (
              <PillToggle
                key={o.key}
                label={o.label}
                selected={local.tierart === o.key}
                onPress={() => setLocal({ ...local, tierart: o.key as FilterState["tierart"] })}
              />
            ))}
          </View>

          {/* Größe */}
          <Text style={styles.sectionTitle}>Größe</Text>
          <Text style={styles.sectionSubtitle}>Mehrere möglich</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 24 }}>
            {GROESSE_OPTIONS.map((o) => (
              <PillToggle
                key={o.key}
                label={o.label}
                selected={local.groesse.includes(o.key)}
                onPress={() => toggleGroesse(o.key)}
              />
            ))}
          </View>

          {/* Alter */}
          <Text style={styles.sectionTitle}>Maximales Alter</Text>
          <Text style={styles.sectionSubtitle}>
            Bis {local.maxAlterJahre === 15 ? "15+" : local.maxAlterJahre} Jahre
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 24 }}>
            {ALTER_OPTIONS.map((alter) => (
              <PillToggle
                key={alter}
                label={alter === 15 ? "15+" : `${alter} J.`}
                selected={local.maxAlterJahre === alter}
                onPress={() => setLocal({ ...local, maxAlterJahre: alter })}
              />
            ))}
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View
          style={{
            padding: Sizes.SPACING_LG,
            borderTopWidth: 1,
            borderTopColor: Colors.BORDER,
          }}
        >
          <TouchableOpacity
            onPress={handleApply}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              backgroundColor: Colors.PRIMARY,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: Colors.PRIMARY,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: Colors.WHITE, fontWeight: "600", fontSize: Sizes.FONT_MD }}>
              Filter anwenden
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  sectionTitle: {
    fontSize: Sizes.FONT_MD,
    fontWeight: "700" as const,
    color: Colors.TEXT,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: Sizes.FONT_SM,
    color: Colors.TEXT_MUTED,
    marginBottom: 12,
  },
};
