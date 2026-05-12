import { format, parseISO } from "date-fns";
import type React from "react";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { Event, RecurrenceRule } from "../../domain/types";
import { useEventStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";
import { Button } from "../common/Button";
import { GlassCard } from "../common/GlassCard";

interface EventFormProps {
  event?: Event;
  initialDate?: string;
  onSave: () => void;
  onCancel: () => void;
}

const EVENT_COLORS = [
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#22C55E", // Green
  "#14B8A6", // Teal
  "#3B82F6", // Blue
];

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceRule["frequency"] | "none" }[] = [
  { label: "不重复", value: "none" },
  { label: "每天", value: "daily" },
  { label: "每周", value: "weekly" },
  { label: "每月", value: "monthly" },
  { label: "每年", value: "yearly" },
];

export const EventForm: React.FC<EventFormProps> = ({ event, initialDate, onSave, onCancel }) => {
  const { theme } = useTheme();
  const { createEvent, updateEvent } = useEventStore();

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startDate, setStartDate] = useState(
    event?.startTime?.split("T")[0] ?? initialDate ?? format(new Date(), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(
    event?.startTime ? format(parseISO(event.startTime), "HH:mm") : "09:00"
  );
  const [endTime, setEndTime] = useState(
    event?.endTime ? format(parseISO(event.endTime), "HH:mm") : "10:00"
  );
  const [color, setColor] = useState(event?.color ?? EVENT_COLORS[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule["frequency"] | "none">(
    event?.recurrenceRule?.frequency ?? "none"
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setLoading(true);
    try {
      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${startDate}T${endTime}:00`;

      const eventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        color,
        recurrenceRule: recurrence !== "none" ? { frequency: recurrence, interval: 1 } : undefined,
      };

      if (event) {
        await updateEvent(event.id, eventData);
      } else {
        await createEvent(eventData);
      }

      onSave();
    } catch {
      Alert.alert("错误", "保存失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GlassCard style={styles.card}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>标题</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder="输入事件标题"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>日期</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {/* Time */}
        <View style={styles.row}>
          <View style={[styles.field, styles.halfWidth]}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>开始时间</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:mm"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
          <View style={[styles.field, styles.halfWidth]}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>结束时间</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:mm"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>描述</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { color: theme.colors.text, borderColor: theme.colors.border },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="添加描述（可选）"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Color */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>颜色</Text>
          <View style={styles.colorPicker}>
            {EVENT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.colorSelected,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>

        {/* Recurrence */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>重复</Text>
          <View style={styles.recurrenceOptions}>
            {RECURRENCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.recurrenceOption,
                  {
                    backgroundColor:
                      recurrence === option.value
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    borderColor:
                      recurrence === option.value ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setRecurrence(option.value)}
              >
                <Text
                  style={[
                    styles.recurrenceText,
                    {
                      color: recurrence === option.value ? "#FFFFFF" : theme.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </GlassCard>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="取消" onPress={onCancel} variant="secondary" style={styles.button} />
        <Button
          title={event ? "保存" : "创建"}
          onPress={handleSave}
          variant="primary"
          loading={loading}
          disabled={!title.trim()}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  colorPicker: {
    flexDirection: "row",
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  recurrenceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recurrenceOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  recurrenceText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    flex: 1,
  },
});

export default EventForm;
