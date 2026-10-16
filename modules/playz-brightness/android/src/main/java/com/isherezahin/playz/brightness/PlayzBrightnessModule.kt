package com.isherezahin.playz.brightness

import android.provider.Settings
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

/**
 * Adjusts brightness through the activity window override, so the change only affects
 * Play-Z while it is visible and needs no WRITE_SETTINGS permission.
 */
class PlayzBrightnessModule(reactContext: ReactApplicationContext) :
    NativePlayzBrightnessSpec(reactContext) {

  override fun getBrightness(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(readSystemBrightness())
      return
    }
    UiThreadUtil.runOnUiThread {
      val override = activity.window.attributes.screenBrightness
      promise.resolve(if (override >= 0f) override.toDouble() else readSystemBrightness())
    }
  }

  override fun setBrightness(value: Double) {
    // A level of exactly 0 turns the backlight off on some devices.
    applyWindowBrightness(value.coerceIn(MIN_BRIGHTNESS, 1.0).toFloat())
  }

  override fun resetBrightness() {
    applyWindowBrightness(WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE)
  }

  private fun applyWindowBrightness(value: Float) {
    val activity = reactApplicationContext.currentActivity ?: return
    UiThreadUtil.runOnUiThread {
      val window = activity.window
      val params = window.attributes
      params.screenBrightness = value
      window.attributes = params
    }
  }

  private fun readSystemBrightness(): Double =
      try {
        val level =
            Settings.System.getInt(
                reactApplicationContext.contentResolver, Settings.System.SCREEN_BRIGHTNESS)
        (level / SYSTEM_BRIGHTNESS_MAX).coerceIn(0.0, 1.0)
      } catch (_: Settings.SettingNotFoundException) {
        DEFAULT_BRIGHTNESS
      }

  private companion object {
    const val MIN_BRIGHTNESS = 0.01
    const val DEFAULT_BRIGHTNESS = 0.5
    const val SYSTEM_BRIGHTNESS_MAX = 255.0
  }
}
