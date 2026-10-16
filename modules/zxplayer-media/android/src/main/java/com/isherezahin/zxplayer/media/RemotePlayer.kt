package com.isherezahin.zxplayer.media

import android.net.Uri
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

/** What the app is playing, as reported from JavaScript. */
data class NowPlaying(
    val id: String,
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
 * player; this one mirrors its state for the notification and lock screen, and turns
 * their buttons into commands for the app (play, pause, previous, next, seek).
 *
 * The playlist holds placeholders around the current item so the system offers
 * Previous / Next exactly when the app's queue has a neighbour.
 */
@OptIn(UnstableApi::class)
class RemotePlayer(looper: Looper) : SimpleBasePlayer(looper) {

  /** Receives (command, positionMs); set by the native module. */
  var onCommand: ((String, Long) -> Unit)? = null

  private var nowPlaying: NowPlaying? = null

  /** Must be called on the player's looper (the main thread). */
  fun update(next: NowPlaying?) {
    nowPlaying = next
    invalidateState()
  }

  private val currentIndex: Int
    get() = if (nowPlaying?.hasPrevious == true) 1 else 0

  override fun getState(): State {
    val now = nowPlaying ?: return State.Builder().build()

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
            .setDurationUs(if (now.durationMs > 0) now.durationMs * 1000 else C.TIME_UNSET)
            .setIsSeekable(true)
            .build()
    val playlist = buildList {
      if (now.hasPrevious) add(placeholder("previous:${now.id}"))
      add(current)
      if (now.hasNext) add(placeholder("next:${now.id}"))
    }

    val advancing = now.playing && !now.buffering
    return State.Builder()
        .setAvailableCommands(commands)
        .setPlaylist(playlist)
        .setCurrentMediaItemIndex(currentIndex)
        .setPlayWhenReady(now.playing, PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST)
        .setPlaybackState(if (now.buffering) STATE_BUFFERING else STATE_READY)
        .setContentPositionMs(
            if (advancing) PositionSupplier.getExtrapolating(now.positionMs, now.speed)
            else PositionSupplier.getConstant(now.positionMs))
        .setPlaybackParameters(PlaybackParameters(now.speed))
        // Same rule as the app's Previous button: restart unless near the start.
        .setMaxSeekToPreviousPositionMs(RESTART_THRESHOLD_MS)
        .build()
  }

  override fun handleSetPlayWhenReady(playWhenReady: Boolean): ListenableFuture<*> {
    nowPlaying = nowPlaying?.copy(playing = playWhenReady)
    onCommand?.invoke(if (playWhenReady) "play" else "pause", 0)
    return Futures.immediateVoidFuture()
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
      }
    }
    return Futures.immediateVoidFuture()
  }

  private fun placeholder(uid: String) =
      MediaItemData.Builder(uid).setMediaItem(MediaItem.Builder().setMediaId(uid).build()).build()

  private companion object {
    const val RESTART_THRESHOLD_MS = 5000L
  }
}
