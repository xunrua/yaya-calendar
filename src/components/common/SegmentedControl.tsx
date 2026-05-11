import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/** 分段选项卡数据 */
type TabItem<K extends string = string> = {
  /** 选项唯一标识 */
  key: K;
  /** 选项显示文本 */
  label: string;
};

/** 分段控制器属性 */
type SegmentedControlProps<K extends string = string> = {
  /** 选项列表 */
  tabs: TabItem<K>[];
  /** 当前激活的选项 key */
  activeKey: K;
  /** 选项切换回调 */
  onChange: (key: K) => void;
  /** 单个选项宽度 */
  segmentWidth: number;
  /** 单个选项高度，默认 36 */
  segmentHeight?: number;
  /** 选项间距，默认 8 */
  gap?: number;
  /** 容器额外样式 */
  containerStyle?: ViewStyle | ViewStyle[];
  /** 滑动指示器样式 */
  indicatorStyle?: ViewStyle;
  /** 激活态文字颜色 */
  activeTextColor?: string;
  /** 非激活态文字颜色 */
  inactiveTextColor?: string;
};

export function SegmentedControl<K extends string = string>({
  tabs,
  activeKey,
  onChange,
  segmentWidth,
  segmentHeight = 36,
  gap = 8,
  containerStyle,
  indicatorStyle,
  activeTextColor,
  inactiveTextColor,
}: SegmentedControlProps<K>) {
  const indicatorPosition = useSharedValue(tabs.findIndex((t) => t.key === activeKey));

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === activeKey);
    if (idx >= 0) {
      // 先滑动到目标位置稍过一点，再回弹，模拟弹性效果
      indicatorPosition.value = withTiming(
        idx + 0.03,
        { duration: 280, easing: Easing.bezier(0.4, 0, 0.2, 1) },
        (finished) => {
          if (finished) {
            indicatorPosition.value = withTiming(idx, { duration: 150, easing: Easing.bezier(0.4, 0, 0.2, 1) });
          }
        }
      );
    }
  }, [activeKey, tabs, indicatorPosition]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const totalOffset = indicatorPosition.value * (segmentWidth + gap);
    return {
      transform: [{ translateX: totalOffset }],
    };
  });

  return (
    <View style={[styles.container, { gap }, containerStyle]}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: segmentWidth,
            height: segmentHeight,
            borderRadius: segmentHeight / 2,
            top: 4,
            left: 4,
          },
          indicatorStyle,
          animatedIndicatorStyle,
        ]}
      />
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={{
              width: segmentWidth,
              height: segmentHeight,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 14,
                lineHeight: 14,
                color: isActive ? activeTextColor : inactiveTextColor,
                fontWeight: isActive ? "600" : "400",
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    overflow: "hidden",
    alignItems: "center",
  },
});
