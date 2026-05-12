import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.{ts,tsx}"],
    environment: "node",
    globals: false,
    // lunarCalc/ 是纯函数 + number/string,不需要 RN 运行时;把 RN/Expo deps 显式排除。
    server: {
      deps: {
        external: [
          /react-native/,
          /expo/,
          /@expo/,
          /@react-native/,
          /react-native-reanimated/,
          /react-native-gesture-handler/,
        ],
      },
    },
  },
});
