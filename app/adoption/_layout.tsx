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

function SwipeTabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: focused ? Colors.PRIMARY : Colors.PRIMARY + "22",
        alignItems: "center",
        justifyContent: "center",
        marginTop: -10,
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: focused ? 0.4 : 0.1,
        shadowRadius: 6,
        elevation: focused ? 6 : 2,
      }}
    >
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
    </View>
  );
}

export default function AdoptionLayout() {
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
        name="info"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="ℹ️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }}
      />
      <Tabs.Screen
        name="feed"
        options={{ tabBarIcon: ({ focused }) => <SwipeTabIcon emoji="💛" focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }}
      />
      <Tabs.Screen
        name="ich"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="chat/[matchId]" options={{ href: null }} />
      <Tabs.Screen name="tierheim/[id]"  options={{ href: null }} />
      <Tabs.Screen name="nachrichten"    options={{ href: null }} />
      <Tabs.Screen name="profil"         options={{ href: null }} />
      <Tabs.Screen name="news"           options={{ href: null }} />
    </Tabs>
  );
}
