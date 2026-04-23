import { Tabs } from "expo-router";
import { Image, View } from "react-native";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

const ICONS = {
  info:   require("../../assets/tab-icons/Info.png"),
  events: require("../../assets/tab-icons/Events.png"),
  swipe:  require("../../assets/tab-icons/Swipe.png"),
  chat:   require("../../assets/tab-icons/Chat.png"),
  profil: require("../../assets/tab-icons/Profil.png"),
} as const;

function TabIcon({ icon, focused }: { icon: keyof typeof ICONS; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
      <Image
        source={ICONS[icon]}
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
        tabBarActiveTintColor: Colors.SECONDARY,
        tabBarInactiveTintColor: Colors.PRIMARY,
      }}
    >
      <Tabs.Screen
        name="info"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="info" focused={focused} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="events" focused={focused} /> }}
      />
      <Tabs.Screen
        name="feed"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="swipe" focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="chat" focused={focused} /> }}
      />
      <Tabs.Screen
        name="ich"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="profil" focused={focused} /> }}
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
