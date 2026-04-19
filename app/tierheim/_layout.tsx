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
          resizeMode: "contain",
          tintColor: focused ? Colors.SECONDARY : Colors.PRIMARY,
        }}
      />
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
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-haus.png")} focused={focused} /> }}
      />
      <Tabs.Screen
        name="hunde"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-pfote-new.png")} focused={focused} /> }}
      />
      <Tabs.Screen
        name="anfragen"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-chat.png")} focused={focused} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ tabBarIcon: ({ focused }) => <TabIcon source={require("../../assets/tab-profil.png")} focused={focused} /> }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="chat/[matchId]" options={{ href: null }} />
      <Tabs.Screen name="hund/[id]" options={{ href: null }} />
    </Tabs>
  );
}
