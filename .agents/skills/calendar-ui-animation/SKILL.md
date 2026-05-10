---
name: calendar-ui-animation
description: >
  日历 App 视图切换与交互动效的实现方案。当用户要开发日历组件、视图切换动效、
  Tab 胶囊指示器、折叠展开日历、月份翻页等功能时使用本技能。
  涵盖：年/月/周/日视图切换动效、Tab 滑动胶囊、日历折叠展开、月份横向翻页、
  日期选中圆圈动效、当前时刻红线动效。
---

# 日历 App 动效实现 Skill

> 来源：对中文日历 App 屏幕录制的逐帧分析（720×1624，约 24 秒）

---

## 动效清单总览

| # | 动效名称 | 触发方式 | 帧区间 | 复杂度 |
|---|---------|---------|--------|--------|
| 1 | Tab 胶囊平移 | 点击任意 Tab | 全程 | ⭐ |
| 2 | 月视图折叠 ↔ 展开 | 上拉/下拉日历 | F1→F3 | ⭐⭐ |
| 3 | 月→年 缩放收起 | 点击「年」Tab | F3→F5 | ⭐⭐⭐ |
| 4 | 跨视图内容区清场 | Tab 切换（跨度大时） | F8→F9 | ⭐⭐ |
| 5 | 周视图淡入展开 | 切到「周」Tab | F9→F10 | ⭐⭐ |
| 6 | 周→日 列压缩 | 点击「日」Tab | F10→F12 | ⭐⭐⭐ |
| 7 | 月份横向翻页 | 左右滑动 | F13→F20 | ⭐⭐ |
| 8 | 日期选中圆圈 | 点击日期格 | F15 | ⭐ |
| 9 | 当前时刻红线 | 周/日视图自动 | F10、F12 | ⭐ |

---

## 动效 1：Tab 胶囊平移滑动

### 视觉描述
白色圆角胶囊背景在「年 / 月 / 周 / 日」之间平滑横向滑动，文字随之变黑（选中）/ 变灰（未选中）。

### 实现方案

```css
.tab-bar {
  display: flex;
  background: #f0f0f0;
  border-radius: 999px;
  padding: 4px;
  position: relative;
}

.tab-indicator {
  position: absolute;
  height: calc(100% - 8px);
  background: white;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: left 0.28s cubic-bezier(0.34, 1.2, 0.64, 1); /* 轻微回弹 */
  /* left 由 JS 动态计算当前 Tab 偏移量 */
}

.tab-item {
  flex: 1;
  text-align: center;
  color: #999;
  font-size: 14px;
  transition: color 0.2s ease;
  z-index: 1;
}
.tab-item.active { color: #111; font-weight: 500; }
```

**关键参数：**
- 缓动：`cubic-bezier(0.34, 1.2, 0.64, 1)`（带轻微超出回弹感）
- 时长：`260–300ms`
- 胶囊宽度：等分 Tab 总宽的 1/4

---

## 动效 2：月视图折叠 ↔ 展开

### 视觉描述
- **折叠态**：仅展示当前周所在行（1行 ≈ 60px），底部有向下箭头 `˅`
- **展开态**：完整月历（5–6行），箭头翻转消失
- 过渡：日历高度平滑扩展，底部黄历卡片区同步下推

### 实现方案

```css
.calendar-grid {
  overflow: hidden;
  height: 320px;
  transition: height 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.calendar-grid.collapsed {
  height: 64px; /* 只露一行 */
}

/* 折叠箭头翻转 */
.collapse-arrow {
  transition: transform 0.28s ease;
}
.collapsed .collapse-arrow {
  transform: rotate(180deg);
}
```

**关键点：**
- 使用 `height` 动画而非 `max-height`（避免速度感不均匀）
- 底部卡片区用 `translateY` 联动，不用 `margin-top`
- React Native 用 `useSharedValue` + `withSpring({ damping: 18, stiffness: 200 })`

---

## 动效 3：月→年 缩放收起

### 视觉描述
点击「年」Tab 后：
1. 当前月历**缩小 + 移向对应位置**，成为年视图中对应月份格
2. 其余 11 个月份格**从四周 stagger 淡入**
3. 顶部标题从 `"5月"` crossfade 到 `"2026年"`

### 实现方案（分层动画）

```
层级结构：
  Header（标题区）→ 独立 crossfade
  Tab Bar         → 胶囊同步移动
  内容区          → 两层叠加
    ├─ 月视图层（旧）：scale + translate + fadeOut
    └─ 年视图层（新）：scale + fadeIn（staggered）
```

```js
// 月视图退场
currentMonthView.animate({
  scale: [1, 0.3],
  x: [0, targetX],   // 年视图中对应月份格的 x 坐标
  y: [0, targetY],   // 年视图中对应月份格的 y 坐标
  opacity: [1, 0],
  duration: 380,
  easing: 'easeInOut',
});

// 年视图 12 个格子 stagger 淡入
months.forEach((month, i) => {
  month.animate({
    opacity: [0, 1],
    scale: [0.85, 1],
    delay: i * 20,   // 每格错开 20ms
    duration: 260,
  });
});
```

**简化方案（不做位置追踪）：**
```css
.view-year  { animation: zoomIn  0.3s ease forwards; }
.view-month { animation: zoomOut 0.25s ease forwards; }

@keyframes zoomIn  { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes zoomOut { from { transform: scale(1);    opacity: 1; } to { transform: scale(1.1); opacity: 0; } }
```

---

## 动效 4：跨视图内容区清场（白帧过渡）

### 视觉描述
「年→周」切换时，内容区出现约 150ms 的**纯空白**（F9 帧），Header 和 Tab Bar 始终固定，不参与动画。

### 实现方案

「**外壳固定，内容淡出 → 淡入**」双阶段过渡：

```css
.content-area.exiting {
  animation: fadeOut 0.15s ease forwards;
}
.content-area.entering {
  animation: fadeIn 0.2s ease 0.15s forwards; /* delay = exiting 时长 */
  opacity: 0;
}
@keyframes fadeOut { to { opacity: 0; } }
@keyframes fadeIn  { to { opacity: 1; } }
```

> React 可用 `<AnimatePresence>`，Flutter 用 `AnimatedSwitcher`，iOS 用 `UIView.transition`。

---

## 动效 5：周视图淡入展开

### 视觉描述
周视图出现时整体从上方轻微下移淡入，7列时间格略带 stagger 效果。

```css
.week-view {
  animation: slideInDown 0.28s ease;
}
@keyframes slideInDown {
  from { transform: translateY(-10px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

/* 各列依次出现 */
.week-column { animation: slideInDown 0.28s ease both; }
.week-column:nth-child(1) { animation-delay: 0ms;  }
.week-column:nth-child(2) { animation-delay: 18ms; }
.week-column:nth-child(3) { animation-delay: 36ms; }
/* ...最多 7 × 18ms = 126ms */
```

---

## 动效 6：周→日 列压缩展开

### 视觉描述
7列 → 1列：其余 6 列向两侧收缩消失，选中列扩展至全宽。

```js
columns.forEach((col, i) => {
  if (i === selectedDayIndex) {
    // 选中列展开
    col.animate({ flex: [1, 7], duration: 300, easing: 'easeOut' });
  } else {
    // 其余列收缩
    col.animate({ flex: [1, 0], opacity: [1, 0], duration: 250, easing: 'easeIn' });
  }
});
```

> CSS Grid 版本：用 `grid-template-columns` 从 `repeat(7, 1fr)` 过渡到 `0 0 ... 1fr ... 0`，需配合 `transition: grid-template-columns`（部分浏览器支持）。

---

## 动效 7：月份横向翻页

### 视觉描述
滑动翻月：内容**跟手移动**，松手后弹性完成翻页或回弹。

```js
const gestureHandler = useAnimatedGestureHandler({
  onActive: (e) => { offset.value = e.translationX; },
  onEnd: (e) => {
    const threshold = SCREEN_WIDTH * 0.35; // 35% 触发翻页
    if (e.translationX < -threshold) {
      offset.value = withSpring(-SCREEN_WIDTH, { damping: 20 });
      runOnJS(goNextMonth)();
    } else if (e.translationX > threshold) {
      offset.value = withSpring(SCREEN_WIDTH, { damping: 20 });
      runOnJS(goPrevMonth)();
    } else {
      offset.value = withSpring(0, { damping: 18, stiffness: 200 }); // 回弹
    }
  },
});
```

**关键参数：**
- 触发阈值：屏幕宽度的 `30%–40%`
- 预渲染：前后各 1 个月（虚拟列表或 Pager）
- 原生推荐：iOS `UIPageViewController`，Android `ViewPager2`

---

## 动效 8：日期选中圆圈

### 视觉描述
- **今日**：橙红色实心圆，白色数字
- **选中（非今日）**：橙红色描边圆圈，数字变橙红
- 出现时有轻微弹出 scale 动效

```css
/* 今日 */
.day-cell.today .day-number {
  background: #E8563A;
  color: white;
  border-radius: 50%;
  width: 36px; height: 36px;
}

/* 选中（非今日） */
.day-cell.selected .day-number {
  border: 1.5px solid #E8563A;
  border-radius: 50%;
  color: #E8563A;
  animation: popIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
```

---

## 动效 9：当前时刻红线

### 视觉描述
周视图和日视图中，橙红色横线 + 左端圆点标记当前时刻，实时更新。

```js
function getCurrentTimeTop(startHour = 0, hourHeight = 60) {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  return (hours - startHour) * hourHeight;
}
setInterval(() => {
  document.querySelector('.current-time-line').style.top =
    getCurrentTimeTop() + 'px';
}, 60_000);
```

```css
.current-time-line {
  position: absolute;
  left: 48px; right: 0;
  height: 1.5px;
  background: #E8563A;
  pointer-events: none;
}
.current-time-line::before { /* 左端圆点 */
  content: '';
  position: absolute;
  left: -4px; top: -3px;
  width: 8px; height: 8px;
  background: #E8563A;
  border-radius: 50%;
}
```

---

## 通用设计规范

| 参数 | 值 |
|------|---|
| 主色（今日/选中/红线） | `#E8563A` |
| 假日文字色 | `#E8563A`（红）/ `#1A6CF6`（蓝，调班） |
| Tab 切换时长 | `260–300ms` |
| 视图切换时长 | `300–380ms` |
| 标准缓动 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 弹性缓动 | `cubic-bezier(0.34, 1.2, 0.64, 1)` |
| Stagger 间隔 | `15–20ms / 格` |

---

## 实现优先级

资源有限时按顺序实现：

1. **Tab 胶囊平移**（收益最高，成本最低）
2. **月份横向翻页**（核心交互）
3. **日期选中圆圈 + 今日标识**（功能必须）
4. **当前时刻红线**（实用）
5. **月视图折叠展开**（进阶体验）
6. **视图切换 Crossfade**（平滑感）
7. **月→年 缩放动效**（高成本高冲击）