import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { Image, View } from "react-native";

function TabIcon({ source, focused }: { source: any; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
      <Image
        source={source}
        style={{
          width: 32,
          height: 32,
          tintColor: focused ? Colors.SECONDARY : Colors.PRIMARY,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

export default function GassiLayout() {
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
        name="info"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-haus.png")} focused={focused} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-icons/Events.png")} focused={focused} /> }}
      />
      <Tabs.Screen
        name="feed"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-icons/Swipe.png")} focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-icons/Chat.png")} focused={focused} /> }}
      />
      <Tabs.Screen
        name="ich"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-icons/Profil.png")} focused={focused} /> }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="chat/[matchId]"       options={{ href: null }} />
      <Tabs.Screen name="meine-hunde"          options={{ href: null }} />
      <Tabs.Screen name="hund-anlegen"         options={{ href: null }} />
      <Tabs.Screen name="hund-bearbeiten/[id]" options={{ href: null }} />
      <Tabs.Screen name="filter"               options={{ href: null }} />
      <Tabs.Screen name="nachrichten"          options={{ href: null }} />
      <Tabs.Screen name="profil"               options={{ href: null }} />
      <Tabs.Screen name="news"                 options={{ href: null }} />
    </Tabs>
  );
}
