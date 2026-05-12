import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEventStore } from "../src/stores/eventStore";
import { ThemeProvider } from "../src/stores/themeStore";

// 模块作用域调用,必须在组件外执行 — 让 native 一启动就 prevent auto hide
SplashScreen.preventAutoHideAsync().catch(() => {
  // 已经 hide 或 unsupported 都 swallow
});

export default function RootLayout() {
  const { loadEvents } = useEventStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadEvents();
      } finally {
        if (!cancelled) {
          SplashScreen.hideAsync().catch(() => {});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadEvents]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(main)" />
            <Stack.Screen name="event/[id]" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
