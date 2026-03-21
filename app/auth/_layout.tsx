import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding/adoptant" />
      <Stack.Screen name="onboarding/tierhalter" />
      <Stack.Screen name="onboarding/tierheim" />
    </Stack>
  );
}
