import { Stack } from "expo-router";
import { ThemeProvider } from "../src/stores/themeStore";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { useEventStore } from "../src/stores/eventStore";

export default function RootLayout() {
  const { loadEvents } = useEventStore();

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(main)" />
          <Stack.Screen name="event/[id]" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
