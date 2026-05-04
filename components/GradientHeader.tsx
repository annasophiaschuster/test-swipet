import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";
import { useLanguage } from "../contexts/LanguageContext";

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function GradientHeader({
  title,
  subtitle,
  showBack = false,
  backLabel,
  onBack,
  rightElement,
}: GradientHeaderProps) {
  const { t } = useLanguage();
  const resolvedBackLabel = backLabel ?? t.comp_back;
  const handleBack = onBack ?? (() => router.back());
  return (
    <LinearGradient
      colors={[Colors.SECONDARY, Colors.PRIMARY]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: 56,
        paddingBottom: 14,
        paddingHorizontal: Sizes.SPACING_LG,
      }}
    >
      {/* Single navigation row — same height as swipe header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={{ flexDirection: "row", alignItems: "center", gap: 2, marginRight: 4 }}>
            <Text style={{ color: Colors.WHITE, opacity: 0.9, fontSize: 18 }}>‹</Text>
            <Text style={{ color: Colors.WHITE, opacity: 0.85, fontSize: 12, fontWeight: "500" }}>{resolvedBackLabel}</Text>
          </TouchableOpacity>
        )}
        <Text
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: "800",
            color: Colors.WHITE,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {rightElement ?? <View />}
      </View>
      {subtitle && (
        <Text style={{ color: Colors.WHITE, opacity: 0.85, marginTop: 4, fontSize: Sizes.FONT_SM }}>
          {subtitle}
        </Text>
      )}
    </LinearGradient>
  );
}
