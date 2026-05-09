import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../src/components/common/Button";
import { GlassCard } from "../../src/components/common/GlassCard";
import { Modal } from "../../src/components/common/Modal";
import { EventForm } from "../../src/components/forms/EventForm";
import { getLunarInfo, toLunarDate } from "../../src/domain/lunar";
import { useEventStore } from "../../src/stores/eventStore";
import { useTheme } from "../../src/stores/themeStore";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { getEventById, deleteEvent } = useEventStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const event = getEventById(id);

  if (!event) {
    return (
      <View
        style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>事件不存在</Text>
        <Button title="返回" onPress={() => router.back()} variant="secondary" />
      </View>
    );
  }

  const startDate = parseISO(event.startTime);
  const endDate = parseISO(event.endTime);
  const lunarInfo = getLunarInfo(startDate);
  const lunarDate = toLunarDate(startDate);

  const handleDelete = () => {
    Alert.alert("删除事件", "确定要删除这个事件吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await deleteEvent(event.id);
            router.back();
          } catch (error) {
            console.error("Failed to delete event:", error);
            Alert.alert("错误", "删除失败，请重试");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleEditComplete = () => {
    setShowEditModal(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>← 返回</Text>
        </TouchableOpacity>
      </View>

      {/* Event Card */}
      <GlassCard style={styles.card}>
        {/* Color indicator */}
        <View
          style={[styles.colorBar, { backgroundColor: event.color || theme.colors.eventDefault }]}
        />

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.text }]}>{event.title}</Text>

        {/* Date & Time */}
        <View style={styles.infoSection}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>时间</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {format(startDate, "yyyy年M月d日 EEEE", { locale: zhCN })}
          </Text>
          <Text style={[styles.subValue, { color: theme.colors.textSecondary }]}>
            {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
          </Text>
          <Text style={[styles.lunarText, { color: theme.colors.textTertiary }]}>
            农历 {lunarDate.monthName}
            {lunarDate.dayName}
            {lunarInfo.solarTerm && ` · ${lunarInfo.solarTerm}`}
            {lunarInfo.holiday && ` · ${lunarInfo.holiday}`}
          </Text>
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.infoSection}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>描述</Text>
            <Text style={[styles.description, { color: theme.colors.text }]}>
              {event.description}
            </Text>
          </View>
        )}

        {/* Recurrence */}
        {event.recurrenceRule && (
          <View style={styles.infoSection}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>重复</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {event.recurrenceRule.frequency === "daily" && "每天"}
              {event.recurrenceRule.frequency === "weekly" && "每周"}
              {event.recurrenceRule.frequency === "monthly" && "每月"}
              {event.recurrenceRule.frequency === "yearly" && "每年"}
            </Text>
          </View>
        )}
      </GlassCard>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="编辑"
          onPress={() => setShowEditModal(true)}
          variant="primary"
          style={styles.actionButton}
        />
        <Button
          title="删除"
          onPress={handleDelete}
          variant="secondary"
          style={styles.actionButton}
          loading={loading}
        />
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑事件"
        animationType="slide"
      >
        <EventForm
          event={event}
          onSave={handleEditComplete}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  card: {
    marginHorizontal: 16,
    padding: 0,
    overflow: "hidden",
  },
  colorBar: {
    height: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    padding: 20,
    paddingBottom: 12,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
  },
  subValue: {
    fontSize: 14,
    marginTop: 2,
  },
  lunarText: {
    fontSize: 12,
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
