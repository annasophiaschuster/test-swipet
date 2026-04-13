import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { useLanguage } from "../../contexts/LanguageContext";

export default function GassiEventsScreen() {
  const { t } = useLanguage();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>📅</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.TEXT, textAlign: "center", marginBottom: 12 }}>
          {t.info_events_coming_soon}
        </Text>
        <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 24 }}>
          {t.info_events_coming_soon_sub}
        </Text>
      </View>
    </SafeAreaView>
  );
}
