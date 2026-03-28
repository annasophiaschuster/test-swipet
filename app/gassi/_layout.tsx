import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { Text, View } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 6 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          marginTop: 2,
          color: focused ? Colors.SECONDARY : Colors.TEXT_MUTED,
          fontWeight: focused ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function GassiLayout() {
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
          shadowColor: Colors.SECONDARY,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarItemStyle: { flex: 1 },
        tabBarActiveTintColor: Colors.SECONDARY,
        tabBarInactiveTintColor: Colors.TEXT_MUTED,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐾" label={t.tab_discover} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="❤️" label={t.tab_matches} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📰" label={t.tab_news} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ich"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label={t.tab_ich} focused={focused} />,
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="chat/[matchId]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="meine-hunde" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="hund-anlegen" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="filter" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="nachrichten" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="profil" options={{ tabBarButton: () => null }} />
    </Tabs>
  );
}
