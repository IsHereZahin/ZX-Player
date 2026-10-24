package com.isherezahin.zxplayer.media

import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.SimpleBasePlayer
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import kotlin.math.abs

/** What the app is playing, as reported from JavaScript. */
data class NowPlaying(
    val id: String,
    /** As handed to react-native-video; tells which of its players is on this item. */
    val uri: String,
    val title: String,
    val artist: String,
    val artworkUri: String?,
    val durationMs: Long,
    val positionMs: Long,
    val playing: Boolean,
    val buffering: Boolean,
    val speed: Float,
    val hasPrevious: Boolean,
    val hasNext: Boolean,
)

/**
 * Stand-in player for the media session. Playback itself happens in react-native-video's
 * player; this one mirrors it for the notification and lock screen, and turns their buttons
 * into commands for the app (play, pause, previous, next, seek, stop).
 *
 * Play / pause, loading and the position come from react-native-video's player itself once
 * it is on the item the app reported; the app's own report is the fallback. JavaScript
 * learns about them from view events, which don't arrive in the background, so an item that
 * started there stayed "loading" for good (the system showed a spinner where Play / Pause
 * belongs), and a pause by the system (a call, unplugged headphones) went unnoticed.
 *
 * The playlist holds placeholders around the current item so the system offers
 * Previous / Next exactly when the app's queue has a neighbour.
 */
@OptIn(UnstableApi::class)
class RemotePlayer(looper: Looper) : SimpleBasePlayer(looper) {

  /** Receives (command, positionMs); set by the native module. */
  var onCommand: ((String, Long) -> Unit)? = null

  private var nowPlaying: NowPlaying? = null
  /** react-native-video's players, as its plugin hook announces them. */
  private val players = mutableListOf<Player>()
  private val pendingCommands = mutableListOf<PendingCommand>()
  private val handler = Handler(looper)

  private val playerListener =
      object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) = refresh()
      }

  // Everything below must be called on the player's looper (the main thread).

  fun update(next: NowPlaying?) {
    nowPlaying = next
    refresh()
  }

  fun attach(player: Player) {
    if (player !in players) {
      players += player
      player.addListener(playerListener)
    }
    refresh()
  }

  fun detach(player: Player) {
    if (players.remove(player)) {
      player.removeListener(playerListener)
    }
    refresh()
  }

  fun detachAll() {
    players.toList().forEach(::detach)
  }

  /** The notification's Stop button: the app ends playback and the session with it. */
  fun requestStop() {
    onCommand?.invoke("stop", 0)
  }

  private val currentIndex: Int
    get() = if (nowPlaying?.hasPrevious == true) 1 else 0

  private fun refresh() {
    settlePendingCommands()
    invalidateState()
  }

  /** react-native-video's player, while it is on the item the app reported. */
  private fun livePlayer(): Player? {
    val uri = nowPlaying?.uri?.takeIf { it.isNotEmpty() } ?: return null
    return players.lastOrNull { it.currentMediaItem?.localConfiguration?.uri?.toString() == uri }
  }

  override fun getState(): State {
    val now = nowPlaying ?: return State.Builder().build()
    val live = livePlayer()
    val liveState = live?.playbackState
    val started = liveState == Player.STATE_READY || liveState == Player.STATE_BUFFERING
    val playing = if (live != null && started) live.playWhenReady else now.playing
    val buffering =
        when {
          live == null -> now.buffering
          // Ended (or not prepared yet): the app moves on to the next item or pauses. Never
          // reported as such, since the system may drop the controls of a stopped session.
          !started -> playing
          else -> liveState == Player.STATE_BUFFERING
        }
    val positionMs = live?.currentPosition ?: now.positionMs
    val durationMs = live?.duration?.takeIf { it > 0 } ?: now.durationMs
    val speed = live?.playbackParameters?.speed ?: now.speed
    val advancing = live?.isPlaying ?: (playing && !buffering)

    val commands =
        Player.Commands.Builder()
            .addAll(
                COMMAND_PLAY_PAUSE,
                COMMAND_GET_CURRENT_MEDIA_ITEM,
                COMMAND_GET_METADATA,
                COMMAND_GET_TIMELINE,
                COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM,
                // Previous restarts the item when there is nothing before it.
                COMMAND_SEEK_TO_PREVIOUS)
            .addIf(COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM, now.hasPrevious)
            .addIf(COMMAND_SEEK_TO_NEXT, now.hasNext)
            .addIf(COMMAND_SEEK_TO_NEXT_MEDIA_ITEM, now.hasNext)
            .build()

    val current =
        MediaItemData.Builder(now.id)
            .setMediaItem(MediaItem.Builder().setMediaId(now.id).build())
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(now.title)
                    .setArtist(now.artist)
                    .setArtworkUri(now.artworkUri?.let(Uri::parse))
                    .build())
            .setDurationUs(if (durationMs > 0) durationMs * 1000 else C.TIME_UNSET)
            .setIsSeekable(true)
            .build()
    val playlist = buildList {
      if (now.hasPrevious) add(placeholder("previous:${now.id}"))
      add(current)
      if (now.hasNext) add(placeholder("next:${now.id}"))
    }

    return State.Builder()
        .setAvailableCommands(commands)
        .setPlaylist(playlist)
        .setCurrentMediaItemIndex(currentIndex)
        .setPlayWhenReady(playing, PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST)
        .setPlaybackState(if (buffering) STATE_BUFFERING else STATE_READY)
        .setContentPositionMs(
            if (advancing) PositionSupplier.getExtrapolating(positionMs, speed)
            else PositionSupplier.getConstant(positionMs))
        .setPlaybackParameters(PlaybackParameters(speed))
        // Same rule as the app's Previous button: restart unless near the start.
        .setMaxSeekToPreviousPositionMs(RESTART_THRESHOLD_MS)
        .build()
  }

  override fun handleSetPlayWhenReady(playWhenReady: Boolean): ListenableFuture<*> {
    nowPlaying = nowPlaying?.copy(playing = playWhenReady)
    onCommand?.invoke(if (playWhenReady) "play" else "pause", 0)
    return awaitLivePlayer { it.playWhenReady == playWhenReady }
  }

  override fun handleSeek(
      mediaItemIndex: Int,
      positionMs: Long,
      seekCommand: @Player.Command Int
  ): ListenableFuture<*> {
    val now = nowPlaying ?: return Futures.immediateVoidFuture()
    when {
      mediaItemIndex > currentIndex -> onCommand?.invoke("next", 0)
      mediaItemIndex < currentIndex -> onCommand?.invoke("previous", 0)
      else -> {
        val target = if (positionMs == C.TIME_UNSET) 0 else positionMs
        nowPlaying = now.copy(positionMs = target)
        onCommand?.invoke("seek", target)
        return awaitLivePlayer { abs(it.currentPosition - target) < SEEK_TOLERANCE_MS }
      }
    }
    return Futures.immediateVoidFuture()
  }

  /**
   * Keeps the notification on what a button asked for until react-native-video's player gets
   * there (the command travels through the app first), so the button doesn't flip back and
   * forth meanwhile. Gives up after a while, and then shows the player as it is.
   */
  private fun awaitLivePlayer(reached: (Player) -> Boolean): ListenableFuture<*> {
    if (livePlayer() == null) {
      return Futures.immediateVoidFuture()
    }
    val command = PendingCommand(reached)
    pendingCommands += command
    handler.postDelayed({ settle(command) }, COMMAND_TIMEOUT_MS)
    return command.done
  }

  private fun settlePendingCommands() {
    val live = livePlayer()
    pendingCommands.filter { live == null || it.reached(live) }.forEach(::settle)
  }

  private fun settle(command: PendingCommand) {
    if (pendingCommands.remove(command)) {
      command.done.set(null)
    }
  }

  private fun placeholder(uid: String) =
      MediaItemData.Builder(uid).setMediaItem(MediaItem.Builder().setMediaId(uid).build()).build()

  private class PendingCommand(val reached: (Player) -> Boolean) {
    val done: SettableFuture<Any?> = SettableFuture.create()
  }

  private companion object {
    const val RESTART_THRESHOLD_MS = 5000L
    const val COMMAND_TIMEOUT_MS = 2000L
    const val SEEK_TOLERANCE_MS = 1000L
  }
}
