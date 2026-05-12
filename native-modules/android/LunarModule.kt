package com.anonymous.yaya

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.os.Handler
import android.os.HandlerThread
import android.util.LruCache
import com.facebook.react.bridge.*
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream

/**
 * LunarModule - Android 原生农历查表模块
 *
 * 使用预计算的 SQLite 数据库（1900-2100 年），通过 LruCache 缓存查询结果。
 * 所有数据库操作在独立后台线程执行，避免阻塞 JS 主线程。
 */
class LunarModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LunarModule"

    private var db: SQLiteDatabase? = null
    private val cache: LruCache<String, WritableMap> = LruCache(512)

    // 后台线程 Handler
    private val handlerThread = HandlerThread("LunarDbThread").apply { start() }
    private val bgHandler = Handler(handlerThread.looper)

    init {
        copyDatabaseIfNeeded(reactContext)
        db = SQLiteDatabase.openDatabase(
            getDatabasePath(reactContext),
            null,
            SQLiteDatabase.OPEN_READONLY
        )
    }

    private fun getDatabasePath(context: Context): String {
        return File(context.filesDir, "lunar_calendar.db").absolutePath
    }

    private fun copyDatabaseIfNeeded(context: Context) {
        val dbFile = File(context.filesDir, "lunar_calendar.db")
        if (dbFile.exists()) {
            // 检查是否需要更新（可以按文件大小或版本号判断）
            return
        }
        context.assets.open("lunar_calendar.db").use { input ->
            FileOutputStream(dbFile).use { output ->
                input.copyTo(output)
            }
        }
    }

    /**
     * 查询单日的农历信息
     * @param year 公历年
     * @param month 公历月 (1-12)
     * @param day 公历日 (1-31)
     */
    @ReactMethod
    fun getLunarInfo(year: Int, month: Int, day: Int, promise: Promise) {
        val key = "$year-$month-$day"

        // 1. 先查内存缓存
        val cached = cache.get(key)
        if (cached != null) {
            promise.resolve(cached)
            return
        }

        // 2. 后台线程查数据库
        bgHandler.post {
            try {
                val cursor = db?.rawQuery(
                    "SELECT * FROM lunar_days WHERE year = ? AND month = ? AND day = ?",
                    arrayOf(year.toString(), month.toString(), day.toString())
                )

                if (cursor == null || !cursor.moveToFirst()) {
                    cursor?.close()
                    promise.reject("NOT_FOUND", "Date not found in database: $year-$month-$day")
                    return@post
                }

                val result = Arguments.createMap().apply {
                    putInt("year", cursor.getInt(cursor.getColumnIndexOrThrow("year")))
                    putInt("month", cursor.getInt(cursor.getColumnIndexOrThrow("month")))
                    putInt("day", cursor.getInt(cursor.getColumnIndexOrThrow("day")))
                    putInt("lunarYear", cursor.getInt(cursor.getColumnIndexOrThrow("lunar_year")))
                    putInt("lunarMonth", cursor.getInt(cursor.getColumnIndexOrThrow("lunar_month")))
                    putInt("lunarDay", cursor.getInt(cursor.getColumnIndexOrThrow("lunar_day")))
                    putString("monthCn", cursor.getString(cursor.getColumnIndexOrThrow("month_cn")))
                    putString("dayCn", cursor.getString(cursor.getColumnIndexOrThrow("day_cn")))
                    putString("yearGanZhi", cursor.getString(cursor.getColumnIndexOrThrow("year_ganzhi")))
                    putString("monthGanZhi", cursor.getString(cursor.getColumnIndexOrThrow("month_ganzhi")))
                    putString("dayGanZhi", cursor.getString(cursor.getColumnIndexOrThrow("day_ganzhi")))
                    putString("shengXiao", cursor.getString(cursor.getColumnIndexOrThrow("shengxiao")))
                    putString("solarTerm", cursor.getString(cursor.getColumnIndexOrThrow("solar_term")))
                    putString("festivals", cursor.getString(cursor.getColumnIndexOrThrow("festivals")))
                    putBoolean("isHoliday", cursor.getInt(cursor.getColumnIndexOrThrow("is_holiday")) == 1)
                    putBoolean("isSolarTerm", cursor.getInt(cursor.getColumnIndexOrThrow("is_solar_term")) == 1)
                }

                cursor.close()
                cache.put(key, result)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("DB_ERROR", e.message, e)
            }
        }
    }

    /**
     * 批量查询整月的农历信息
     * @param year 公历年
     * @param month 公历月 (1-12)
     * @param weekStartsOn 周起始日 (0=周日, 1=周一)
     */
    @ReactMethod
    fun getLunarInfoBatch(year: Int, month: Int, weekStartsOn: Int, promise: Promise) {
        bgHandler.post {
            try {
                val startDate = java.util.Calendar.getInstance().apply {
                    set(year, month - 1, 1, 0, 0, 0)
                }
                // 找到该月日历范围的起始日（考虑 weekStartsOn）
                val calStart = startDate.clone() as java.util.Calendar
                while (calStart.get(java.util.Calendar.DAY_OF_WEEK) != weekStartsOn + 1) {
                    calStart.add(java.util.Calendar.DAY_OF_MONTH, -1)
                }

                val endDate = java.util.Calendar.getInstance().apply {
                    set(year, month - 1, startDate.getActualMaximum(java.util.Calendar.DAY_OF_MONTH), 0, 0, 0)
                }
                val calEnd = endDate.clone() as java.util.Calendar
                while (calEnd.get(java.util.Calendar.DAY_OF_WEEK) != weekStartsOn + 1) {
                    calEnd.add(java.util.Calendar.DAY_OF_MONTH, 1)
                }

                val startYear = calStart.get(java.util.Calendar.YEAR)
                val startMonth = calStart.get(java.util.Calendar.MONTH) + 1
                val startDay = calStart.get(java.util.Calendar.DAY_OF_MONTH)
                val endYear = calEnd.get(java.util.Calendar.YEAR)
                val endMonth = calEnd.get(java.util.Calendar.MONTH) + 1
                val endDay = calEnd.get(java.util.Calendar.DAY_OF_MONTH)

                val cursor = db?.rawQuery(
                    "SELECT * FROM lunar_days WHERE (year > ? OR (year = ? AND month > ?) OR (year = ? AND month = ? AND day >= ?)) AND (year < ? OR (year = ? AND month < ?) OR (year = ? AND month = ? AND day <= ?)) ORDER BY year, month, day",
                    arrayOf(
                        startYear.toString(), startYear.toString(), startMonth.toString(),
                        startYear.toString(), startMonth.toString(), startDay.toString(),
                        endYear.toString(), endYear.toString(), endMonth.toString(),
                        endYear.toString(), endMonth.toString(), endDay.toString()
                    )
                )

                val result = Arguments.createMap()

                if (cursor != null) {
                    while (cursor.moveToNext()) {
                        val dayKey = String.format("%04d-%02d-%02d",
                            cursor.getInt(cursor.getColumnIndexOrThrow("year")),
                            cursor.getInt(cursor.getColumnIndexOrThrow("month")),
                            cursor.getInt(cursor.getColumnIndexOrThrow("day"))
                        )

                        val dayData = Arguments.createMap().apply {
                            putString("lunarDay", cursor.getString(cursor.getColumnIndexOrThrow("day_cn")))
                            putString("solarTerm", cursor.getString(cursor.getColumnIndexOrThrow("solar_term")))
                            putString("festivals", cursor.getString(cursor.getColumnIndexOrThrow("festivals")))
                            putBoolean("isHoliday", cursor.getInt(cursor.getColumnIndexOrThrow("is_holiday")) == 1)
                            putBoolean("isSolarTerm", cursor.getInt(cursor.getColumnIndexOrThrow("is_solar_term")) == 1)
                        }

                        result.putMap(dayKey, dayData)
                    }
                    cursor.close()
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("DB_ERROR", e.message, e)
            }
        }
    }

    /**
     * 查询整月的法定假日日期集合
     */
    @ReactMethod
    fun getStatutoryHolidaySet(year: Int, month: Int, promise: Promise) {
        bgHandler.post {
            try {
                val cursor = db?.rawQuery(
                    "SELECT day FROM lunar_days WHERE year = ? AND month = ? AND is_holiday = 1",
                    arrayOf(year.toString(), month.toString())
                )

                val result = Arguments.createArray()

                if (cursor != null) {
                    while (cursor.moveToNext()) {
                        val day = cursor.getInt(cursor.getColumnIndexOrThrow("day"))
                        result.pushString(String.format("%04d-%02d-%02d", year, month, day))
                    }
                    cursor.close()
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("DB_ERROR", e.message, e)
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        db?.close()
        handlerThread.quitSafely()
    }
}
