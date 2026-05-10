import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../stores/themeStore";
import { SegmentedControl } from "./SegmentedControl";

const TABS: { key: NavTab; label: string }[] = [
  { key: "year", label: "年" },
  { key: "calendar", label: "日历" },
  { key: "todo", label: "日程" },
];

type NavTab = "year" | "calendar" | "todo";

interface FloatingNavBarProps {
  onMenuPress: () => void;
  onAddPress: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  menuOpen?: boolean;
}

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  onMenuPress,
  onAddPress,
  activeTab,
  onTabChange,
  menuOpen = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.mode === "dark";

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 8) + 8, paddingBottom: 8 }]}>
      <View style={styles.content}>
        <TouchableOpacity
          style={[
            styles.circleButton,
            {
              backgroundColor: isDark
                ? "rgba(58, 58, 60, 0.8)"
                : "rgba(235, 235, 235, 0.8)",
            },
          ]}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={menuOpen ? "close" : "menu"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <SegmentedControl
          tabs={TABS}
          activeKey={activeTab}
          onChange={(key) => onTabChange(key as NavTab)}
          segmentWidth={80}
          segmentHeight={36}
          gap={8}
          containerStyle={[
            styles.segmentedContainer,
            {
              backgroundColor: isDark
                ? "rgba(58, 58, 60, 0.6)"
                : "rgba(235, 235, 235, 0.6)",
              borderColor: theme.colors.border,
            },
          ]}
          indicatorStyle={{ backgroundColor: theme.colors.primary }}
          activeTextColor={isDark ? "#1C1C1E" : "#FAFAFA"}
          inactiveTextColor={theme.colors.textSecondary}
        />

        <TouchableOpacity
          style={[
            styles.circleButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add"
            size={28}
            color={isDark ? "#1C1C1E" : "#FAFAFA"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: "5%",
    paddingRight: "5%",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedContainer: {
    borderRadius: 22,
    borderWidth: 1,
    height: 46,
  },
});

export default FloatingNavBar;
