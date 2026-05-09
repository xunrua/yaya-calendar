import { BlurView } from "expo-blur";
import type React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "../../stores/themeStore";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, intensity = 20 }) => {
  const { theme } = useTheme();

  if (Platform.OS === "web") {
    // Web fallback with CSS backdrop-filter
    return (
      <View
        style={[
          styles.webGlass,
          {
            backgroundColor:
              theme.mode === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)",
            borderColor: theme.colors.border,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={theme.mode === "dark" ? "dark" : "light"}
      style={[
        styles.glass,
        {
          backgroundColor:
            theme.mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.6)",
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  glass: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  webGlass: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  } as any,
});

export default GlassCard;
