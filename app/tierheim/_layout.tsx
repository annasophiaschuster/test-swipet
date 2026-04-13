import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { Text, View } from "react-native";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
      <Text style={{ fontSize: focused ? 26 : 23 }}>{emoji}</Text>
    </View>
  );
}

export default function TierheimLayout() {
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
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="hunde"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🐕" focused={focused} /> }}
      />
      <Tabs.Screen
        name="anfragen"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="chat/[matchId]" options={{ href: null }} />
    </Tabs>
  );
}
