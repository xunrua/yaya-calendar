import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../../stores/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FloatingNavBarProps {
  onMenuPress: () => void;
  onAddPress: () => void;
  activeTab: "calendar" | "todo";
  onTabChange: (tab: "calendar" | "todo") => void;
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

  // Animation values for segmented control
  const indicatorPosition = useSharedValue(activeTab === "calendar" ? 0 : 1);

  React.useEffect(() => {
    indicatorPosition.value = withSpring(activeTab === "calendar" ? 0 : 1, {
      damping: 20,
      stiffness: 300,
    });
  }, [activeTab, indicatorPosition]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const segmentWidth = 64;
    const gap = 8;
    const totalOffset = indicatorPosition.value * (segmentWidth + gap);
    return {
      transform: [{ translateX: totalOffset }],
    };
  });

  const handleTabPress = (tab: "calendar" | "todo") => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  const handleMenuPress = () => {
    onMenuPress();
  };

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 8), paddingBottom: 8 }]}>
      <View style={styles.content}>
        {/* Menu Button */}
        <TouchableOpacity
          style={[
            styles.circleButton,
            {
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(58, 58, 60, 0.8)"
                  : "rgba(235, 235, 235, 0.8)",
            },
          ]}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={menuOpen ? "close" : "menu"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        {/* Segmented Control */}
        <View
          style={[
            styles.segmentedContainer,
            {
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(58, 58, 60, 0.6)"
                  : "rgba(235, 235, 235, 0.6)",
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Sliding Indicator */}
          <Animated.View
            style={[
              styles.segmentedIndicator,
              {
                backgroundColor: theme.colors.primary,
              },
              animatedIndicatorStyle,
            ]}
          />

          {/* Calendar Tab */}
          <TouchableOpacity
            style={styles.segment}
            onPress={() => handleTabPress("calendar")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "calendar"
                      ? theme.mode === "dark"
                        ? "#1C1C1E"
                        : "#FAFAFA"
                      : theme.colors.textSecondary,
                  fontWeight: activeTab === "calendar" ? "600" : "400",
                },
              ]}
            >
              日历
            </Text>
          </TouchableOpacity>

          {/* Todo Tab */}
          <TouchableOpacity
            style={styles.segment}
            onPress={() => handleTabPress("todo")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "todo"
                      ? theme.mode === "dark"
                        ? "#1C1C1E"
                        : "#FAFAFA"
                      : theme.colors.textSecondary,
                  fontWeight: activeTab === "todo" ? "600" : "400",
                },
              ]}
            >
              待办
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[
            styles.circleButton,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add"
            size={28}
            color={theme.mode === "dark" ? "#1C1C1E" : "#FAFAFA"}
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
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedContainer: {
    flexDirection: "row",
    borderRadius: 22,
    borderWidth: 1,
    padding: 4,
    height: 46,
    gap: 8,
    overflow: "hidden",
    alignItems: "center",
  },
  segmentedIndicator: {
    position: "absolute",
    width: 64,
    height: 36,
    borderRadius: 18,
    top: 4,
    left: 4,
  },
  segment: {
    width: 64,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 14,
  },
});

export default FloatingNavBar;

