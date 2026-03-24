import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GassiFilterState {
  groesse: string[];
  aktivitaetslevel: string[];
  geschlecht: "alle" | "männlich" | "weiblich";
  umkreis: number;
  ownerAlter: "alle" | "young" | "mid" | "senior";
  ownerGeschlecht: "alle" | "männlich" | "weiblich" | "divers";
}

export const DEFAULT_GASSI_FILTER: GassiFilterState = {
  groesse: [],
  aktivitaetslevel: [],
  geschlecht: "alle",
  umkreis: 100,
  ownerAlter: "alle",
  ownerGeschlecht: "alle",
};

interface GassiFilterModalProps {
  visible: boolean;
  filter: GassiFilterState;
  onApply: (f: GassiFilterState) => void;
  onClose: () => void;
}

const UMKREIS_OPTIONS = [5, 10, 25, 50, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiFilterModal({
  visible,
  filter,
  onApply,
  onClose,
}: GassiFilterModalProps) {
  const { t } = useLanguage();
  const [local, setLocal] = useState<GassiFilterState>(filter);

  const GROESSE_OPTIONS = [
    { key: "klein",  label: t.filter_size_small },
    { key: "mittel", label: t.filter_size_medium },
    { key: "gross",  label: t.filter_size_large },
    { key: "riese",  label: t.filter_size_giant },
  ];

  const toggle = (key: "groesse" | "aktivitaetslevel", val: string) => {
    const arr = local[key] as string[];
    setLocal((prev) => ({
      ...prev,
      [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
    }));
  };

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => setLocal(DEFAULT_GASSI_FILTER);

  const Pill = ({
    label,
    selected,
    onPress,
    color = Colors.SECONDARY,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: Sizes.RADIUS_FULL,
        borderWidth: 1.5,
        borderColor: selected ? color : Colors.BORDER,
        backgroundColor: selected ? color + "18" : Colors.SURFACE,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          color: selected ? color : Colors.TEXT,
          fontWeight: selected ? "600" : "400",
          fontSize: Sizes.FONT_SM,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const Section = ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: Sizes.FONT_MD,
          fontWeight: "700",
          color: Colors.TEXT,
          marginBottom: subtitle ? 2 : 12,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginBottom: 12 }}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </View>
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
              {t.filter_reset}
            </Text>
          </TouchableOpacity>
          <Text
            style={{ fontSize: Sizes.FONT_LG, fontWeight: "700", color: Colors.TEXT }}
          >
            {t.filter_title}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 22, color: Colors.TEXT_MUTED }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG }}>

          {/* Hundegrösse */}
          <Section title={t.filter_size} subtitle={t.filter_size_multiple}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {GROESSE_OPTIONS.map((o) => (
                <Pill
                  key={o.key}
                  label={o.label}
                  selected={local.groesse.includes(o.key)}
                  onPress={() => toggle("groesse", o.key)}
                />
              ))}
            </View>
          </Section>

          {/* Aktivitätslevel */}
          <Section title={t.filter_activity} subtitle={t.filter_activity_multiple}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { k: "ruhig",      l: t.filter_activity_calm },
                { k: "mittel",     l: t.filter_activity_medium },
                { k: "sportlich",  l: t.filter_activity_athletic },
              ].map(({ k, l }) => (
                <Pill
                  key={k}
                  label={l}
                  selected={local.aktivitaetslevel.includes(k)}
                  onPress={() => toggle("aktivitaetslevel", k)}
                />
              ))}
            </View>
          </Section>

          {/* Hunde-Geschlecht */}
          <Section title={t.filter_gender}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { k: "alle",      l: t.filter_gender_all },
                { k: "männlich",  l: t.filter_gender_male },
                { k: "weiblich",  l: t.filter_gender_female },
              ].map(({ k, l }) => (
                <Pill
                  key={k}
                  label={l}
                  selected={local.geschlecht === k}
                  onPress={() => setLocal({ ...local, geschlecht: k as GassiFilterState["geschlecht"] })}
                />
              ))}
            </View>
          </Section>

          {/* Umkreis */}
          <Section
            title={t.filter_radius}
            subtitle={
              local.umkreis === 100
                ? t.filter_radius_unlimited
                : `${local.umkreis} km`
            }
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {UMKREIS_OPTIONS.map((u) => (
                <Pill
                  key={u}
                  label={u === 100 ? t.filter_radius_all : `${u} km`}
                  selected={local.umkreis === u}
                  onPress={() => setLocal({ ...local, umkreis: u })}
                />
              ))}
            </View>
          </Section>

          {/* Besitzer-Altersgruppe */}
          <Section title={t.filter_owner_age_label}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { k: "alle",   l: t.filter_doesnt_matter },
                { k: "young",  l: t.filter_owner_age_young },
                { k: "mid",    l: t.filter_owner_age_mid },
                { k: "senior", l: t.filter_owner_age_senior },
              ].map(({ k, l }) => (
                <Pill
                  key={k}
                  label={l}
                  selected={local.ownerAlter === k}
                  onPress={() => setLocal({ ...local, ownerAlter: k as GassiFilterState["ownerAlter"] })}
                />
              ))}
            </View>
          </Section>

          {/* Besitzer-Geschlecht */}
          <Section title={t.filter_gender}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {[
                { k: "alle",      l: t.filter_gender_all },
                { k: "männlich",  l: t.filter_gender_male },
                { k: "weiblich",  l: t.filter_gender_female },
                { k: "divers",    l: t.gassi_profil_gender_diverse },
              ].map(({ k, l }) => (
                <Pill
                  key={k}
                  label={l}
                  selected={local.ownerGeschlecht === k}
                  onPress={() =>
                    setLocal({ ...local, ownerGeschlecht: k as GassiFilterState["ownerGeschlecht"] })
                  }
                />
              ))}
            </View>
          </Section>

        </ScrollView>

        {/* Apply */}
        <View
          style={{ padding: Sizes.SPACING_LG, borderTopWidth: 1, borderTopColor: Colors.BORDER }}
        >
          <TouchableOpacity
            onPress={handleApply}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              backgroundColor: Colors.SECONDARY,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: Colors.SECONDARY,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{ color: Colors.WHITE, fontWeight: "600", fontSize: Sizes.FONT_MD }}
            >
              {t.filter_apply}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
