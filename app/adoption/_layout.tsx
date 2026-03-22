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

export default function AdoptionLayout() {
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
          height: 80,
          paddingBottom: 10,
          shadowColor: Colors.PRIMARY,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: Colors.PRIMARY,
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
        name="nachrichten"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label={t.tab_chat} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label={t.tab_profile} focused={focused} />,
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="chat/[matchId]" options={{ href: null }} />
      <Tabs.Screen name="tierheim/[id]" options={{ href: null }} />
    </Tabs>
  );
}
