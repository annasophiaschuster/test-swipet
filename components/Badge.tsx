import { View, Text } from "react-native";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  verspielt:    { bg: "#FFF0C2", text: "#B8860B" },
  verschmust:   { bg: "#FFE4F0", text: "#C2185B" },
  ruhig:        { bg: "#E8F5E9", text: "#2E7D32" },
  energiegeladen: { bg: "#FFF3E0", text: "#E65100" },
  treu:         { bg: "#E3F2FD", text: "#1565C0" },
  neugierig:    { bg: "#F3E5F5", text: "#6A1B9A" },
  sanft:        { bg: "#E0F7FA", text: "#00695C" },
  mutig:        { bg: "#FCE4EC", text: "#AD1457" },
  kinderlieb:   { bg: "#F9FBE7", text: "#558B2F" },
  anhänglich:   { bg: "#FBE9E7", text: "#BF360C" },
  default:      { bg: Colors.SURFACE, text: Colors.TEXT_MUTED },
};

interface BadgeProps {
  label: string;
  variant?: "tag" | "status" | "info";
  color?: string;
}

export default function Badge({ label, variant = "tag", color }: BadgeProps) {
  const tagStyle = TAG_COLORS[label.toLowerCase()] ?? TAG_COLORS.default;

  if (variant === "status") {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: Sizes.RADIUS_FULL,
          backgroundColor: color ?? Colors.PRIMARY,
        }}
      >
        <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "600" }}>
          {label}
        </Text>
      </View>
    );
  }

  if (variant === "info") {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: Sizes.RADIUS_FULL,
          backgroundColor: Colors.SURFACE,
          borderWidth: 1,
          borderColor: Colors.BORDER,
        }}
      >
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: 11, fontWeight: "500" }}>
          {label}
        </Text>
      </View>
    );
  }

  // tag variant
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Sizes.RADIUS_FULL,
        backgroundColor: tagStyle.bg,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      <Text style={{ color: tagStyle.text, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}
