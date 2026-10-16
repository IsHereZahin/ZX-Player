package com.isherezahin.zxplayer.media

import android.app.PendingIntent
import android.content.Intent
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * Hosts the media session behind the playback notification and lock-screen controls.
 * While playback runs it is a foreground service, which also keeps background playback
 * alive when the screen is off.
 */
@OptIn(UnstableApi::class)
class PlaybackSessionService : MediaSessionService() {

  private var session: MediaSession? = null

  override fun onCreate() {
    super.onCreate()
    running = true
    setMediaNotificationProvider(
        DefaultMediaNotificationProvider.Builder(this)
            .setChannelName(R.string.zx_playback_channel_name)
            .build()
            .apply { setSmallIcon(R.drawable.zx_notification_icon) })

    val builder = MediaSession.Builder(this, sharedPlayer(mainLooper)).setId(SESSION_ID)
    packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      launch.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
      builder.setSessionActivity(
          PendingIntent.getActivity(
              this,
              0,
              launch,
              PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
    }
    session = builder.build().also { addSession(it) }
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? =
      session

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Playback dies with the app's task, so the notification must go with it.
    stopSelf()
  }

  override fun onDestroy() {
    running = false
    session?.release()
    session = null
    super.onDestroy()
  }

  companion object {
    private const val SESSION_ID = "zxplayer"
    private var player: RemotePlayer? = null

    /** Whether the service exists (the system may also stop it, e.g. on task removal). */
    @Volatile
    var running = false
      private set

    /** One stand-in player per process, shared by the service and the native module. */
    fun sharedPlayer(looper: Looper): RemotePlayer =
        player ?: RemotePlayer(looper).also { player = it }
  }
}
