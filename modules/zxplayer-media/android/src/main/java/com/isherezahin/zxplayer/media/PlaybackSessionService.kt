package com.isherezahin.zxplayer.media

import android.app.PendingIntent
import android.content.Intent
import android.os.Bundle
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.CommandButton
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

private val STOP_COMMAND = SessionCommand("com.isherezahin.zxplayer.STOP", Bundle.EMPTY)

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

    val player = sharedPlayer(mainLooper)
    // A custom command rather than the player's stop: system media controls (Android 13+)
    // only show extra buttons that are custom actions.
    val stopButton =
        CommandButton.Builder(CommandButton.ICON_STOP)
            .setDisplayName(getString(R.string.zx_stop_playback))
            .setSessionCommand(STOP_COMMAND)
            .build()
    val builder =
        MediaSession.Builder(this, player)
            .setId(SESSION_ID)
            .setCallback(SessionCallback(player))
            .setMediaButtonPreferences(listOf(stopButton))
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

  /** Offers Stop to every controller (the notification, the lock screen, Bluetooth, …). */
  private class SessionCallback(private val player: RemotePlayer) : MediaSession.Callback {
    override fun onConnect(
        session: MediaSession,
        controller: MediaSession.ControllerInfo
    ): MediaSession.ConnectionResult =
        MediaSession.ConnectionResult.AcceptedResultBuilder(session)
            .setAvailableSessionCommands(
                MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                    .add(STOP_COMMAND)
                    .build())
            .build()

    override fun onCustomCommand(
        session: MediaSession,
        controller: MediaSession.ControllerInfo,
        customCommand: SessionCommand,
        args: Bundle
    ): ListenableFuture<SessionResult> {
      if (customCommand.customAction != STOP_COMMAND.customAction) {
        return super.onCustomCommand(session, controller, customCommand, args)
      }
      player.requestStop()
      return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
    }
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
