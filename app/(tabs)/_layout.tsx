import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { Text, View } from "react-native";

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
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: Colors.TEXT_MUTED,
      }}
    >
      <Tabs.Screen
        name="swipe/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐾" label="Entdecken" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="❤️" label="Matches" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
