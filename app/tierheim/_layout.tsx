import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { Text, View } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text
        style={{
          fontSize: 11,
          color: focused ? Colors.PRIMARY : Colors.TEXT_MUTED,
          fontWeight: focused ? "700" : "400",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TierheimLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.WHITE,
          borderTopWidth: 1,
          borderTopColor: Colors.BORDER,
          height: Sizes.TAB_BAR_HEIGHT,
          paddingBottom: 10,
          shadowColor: Colors.PRIMARY,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarItemStyle: { flex: 1 },
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: Colors.TEXT_MUTED,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.tierheim_tab_dashboard} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="hunde"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.tierheim_tab_dogs} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="anfragen"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.tierheim_tab_requests} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={t.tierheim_tab_profile} focused={focused} />,
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="chat/[matchId]" options={{ href: null }} />
    </Tabs>
  );
}
