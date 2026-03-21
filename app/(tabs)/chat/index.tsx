import { useEffect } from "react";
import { router } from "expo-router";

// Chat is handled inside the Matches tab
export default function ChatRedirect() {
  useEffect(() => {
    router.replace("/(tabs)/matches");
  }, []);
  return null;
}
