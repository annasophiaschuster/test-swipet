import { Stack } from "expo-router";
import { Colors } from "../../constants/colors";

export default function ShelterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.BACKGROUND } }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="matches" />
      <Stack.Screen name="pets/index" />
      <Stack.Screen name="pets/add" />
      <Stack.Screen name="chat/[matchId]" />
    </Stack>
  );
}
