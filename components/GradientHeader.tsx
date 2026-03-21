import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export default function GradientHeader({
  title,
  subtitle,
  showBack = false,
  rightElement,
}: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={[Colors.SECONDARY, Colors.PRIMARY]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: Sizes.SPACING_LG,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: Colors.WHITE, opacity: 0.9, fontSize: 15 }}>← Zurück</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {rightElement ?? <View />}
      </View>
      <Text
        style={{
          fontSize: Sizes.FONT_2XL,
          fontWeight: "700",
          color: Colors.WHITE,
          marginTop: showBack ? 8 : 0,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text style={{ color: Colors.WHITE, opacity: 0.8, marginTop: 4, fontSize: Sizes.FONT_SM }}>
          {subtitle}
        </Text>
      )}
    </LinearGradient>
  );
}
