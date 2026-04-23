import { Tabs } from "expo-router";
import { Image, View } from "react-native";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

const ICONS = {
  info:    require("../../assets/tab-icons/Info.png"),
  events:  require("../../assets/tab-icons/Events.png"),
  swipe:   require("../../assets/tab-icons/Swipe.png"),
  chat:    require("../../assets/tab-icons/Chat.png"),
  profil:  require("../../assets/tab-icons/Profil.png"),
} as const;

function TabIcon({ icon, focused }: { icon: keyof typeof ICONS; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
      <Image
        source={ICONS[icon]}
        style={{
          width: focused ? 26 : 23,
          height: focused ? 26 : 23,
          tintColor: focused ? Colors.PRIMARY : Colors.TEXT_MUTED,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

function SwipeTabIcon({ focused }: { focused: boolean }) {
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
      <Image
        source={ICONS.swipe}
        style={{ width: 28, height: 28, tintColor: Colors.WHITE }}
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
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: Colors.TEXT_MUTED,
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
        options={{ tabBarIcon: ({ focused }) => <SwipeTabIcon focused={focused} /> }}
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
