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
          color: focused ? Colors.PRIMARY : Colors.TEXT_MUTED,
          fontWeight: focused ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
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
        name="swipe/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐾" label={t.tab_discover} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="❤️" label={t.tab_matches} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label={t.tab_chat} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label={t.tab_profile} focused={focused} />,
        }}
      />

      {/* Routen die NICHT in der Tab Bar erscheinen sollen */}
      <Tabs.Screen name="matches/[matchId]"       options={{ href: null }} />
      <Tabs.Screen name="matches/owner/[matchId]" options={{ href: null }} />
      <Tabs.Screen name="swipe/filter"            options={{ href: null }} />
    </Tabs>
  );
}
