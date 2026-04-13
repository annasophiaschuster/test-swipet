import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

export default function GassiInfoScreen() {
  const { t } = useLanguage();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_MD, paddingBottom: 40 }}>
        <Text style={{ fontSize: Sizes.FONT_2XL, fontWeight: "800", color: Colors.TEXT, marginBottom: 8 }}>
          {t.gassi_info_title}
        </Text>
        <Text style={{ fontSize: Sizes.FONT_MD, color: Colors.TEXT_MUTED, lineHeight: 24, marginBottom: 24 }}>
          {t.gassi_info_sub}
        </Text>

        {/* FAQ */}
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: Colors.SURFACE,
              borderRadius: Sizes.RADIUS_LG,
              padding: Sizes.SPACING_MD,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: Colors.BORDER,
            }}
          >
            <Text style={{ fontWeight: "700", color: Colors.TEXT, marginBottom: 4 }}>
              {(t as any)[`gassi_faq_q${i}`]}
            </Text>
            <Text style={{ color: Colors.TEXT_MUTED, lineHeight: 20 }}>
              {(t as any)[`gassi_faq_a${i}`]}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
