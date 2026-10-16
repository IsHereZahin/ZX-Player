package com.isherezahin.zxplayer.media

import android.content.ContentUris
import android.database.Cursor
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import android.util.Size
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi

/**
 * Reads the video and audio library straight from MediaStore columns (no file is opened),
 * and thumbnails / album art from the system thumbnail cache, the way native players do.
 */
@OptIn(UnstableApi::class)
class ZxplayerMediaModule(reactContext: ReactApplicationContext) :
    NativeZxplayerMediaSpec(reactContext) {

  private enum class Kind(val uri: Uri) {
    VIDEO(MediaStore.Video.Media.EXTERNAL_CONTENT_URI),
    AUDIO(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI);

    /** Audio rows only gained bucket columns in Android 10; before that the path decides. */
    val hasBucketColumns: Boolean
      get() = this == VIDEO || Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

    companion object {
      fun of(value: String): Kind =
          when (value) {
            "video" -> VIDEO
            "audio" -> AUDIO
            else -> throw IllegalArgumentException("Unknown media kind: $value")
          }
    }
  }

  private data class Bucket(val id: String, val name: String)

  // Queries and thumbnails get their own threads so a long scan never delays thumbnails.
  private val queryExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private val thumbnailExecutor: ExecutorService =
      Executors.newFixedThreadPool(THUMBNAIL_THREADS)

  private val resolver
    get() = reactApplicationContext.contentResolver

  override fun getFolders(kind: String, promise: Promise) {
    queryExecutor.execute {
      try {
        val source = Kind.of(kind)
        val projection =
            if (source.hasBucketColumns) arrayOf(BUCKET_ID, BUCKET_NAME) else arrayOf(DATA)
        val counts = LinkedHashMap<String, Pair<String, Int>>()
        resolver.query(source.uri, projection, null, null, null)?.use { cursor ->
          val reader = BucketReader(cursor, source)
          while (cursor.moveToNext()) {
            val bucket = reader.read() ?: continue
            val previous = counts[bucket.id]
            counts[bucket.id] = Pair(previous?.first ?: bucket.name, (previous?.second ?: 0) + 1)
          }
        }

        val folders = Arguments.createArray()
        for ((id, entry) in counts) {
          folders.pushMap(
              Arguments.createMap().apply {
                putString("id", id)
                putString("name", entry.first)
                putInt("count", entry.second)
              })
        }
        promise.resolve(folders)
      } catch (error: Exception) {
        promise.reject("E_MEDIA_QUERY", "Could not read media folders", error)
      }
    }
  }

  override fun getMedia(
      kind: String,
      bucketId: String?,
      offset: Double,
      limit: Double,
      promise: Promise
  ) {
    queryExecutor.execute {
      try {
        val source = Kind.of(kind)
        val projection = mutableListOf(ID, NAME, SIZE, DURATION, MODIFIED, ADDED)
        if (source == Kind.VIDEO) {
          projection += listOf(WIDTH, HEIGHT)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) projection += ORIENTATION
        } else {
          projection += listOf(TITLE, ARTIST, ALBUM)
        }
        // Without bucket columns, rows are matched to the folder by their path instead.
        val filterByPath = bucketId != null && !source.hasBucketColumns
        if (filterByPath) projection += DATA
        val selection = if (bucketId != null && !filterByPath) "$BUCKET_ID = ?" else null
        val selectionArgs = if (selection != null) arrayOf(bucketId) else null
        val start = offset.toInt().coerceAtLeast(0)
        val count = limit.toInt().coerceAtLeast(1)

        val items = Arguments.createArray()
        var hasMore = false
        resolver
            .query(
                source.uri, projection.toTypedArray(), selection, selectionArgs, "$MODIFIED DESC")
            ?.use { cursor ->
              if (!filterByPath && start > 0 && !cursor.moveToPosition(start - 1)) {
                return@use
              }
              val columns = Columns(cursor)
              val reader = BucketReader(cursor, source)
              var skipped = if (filterByPath) 0 else start
              var read = 0
              while (cursor.moveToNext()) {
                if (filterByPath && reader.read()?.id != bucketId) continue
                if (skipped < start) {
                  skipped += 1
                  continue
                }
                if (read == count) {
                  hasMore = true
                  break
                }
                items.pushMap(readItem(cursor, columns, source))
                read += 1
              }
            }

        promise.resolve(
            Arguments.createMap().apply {
              putArray("items", items)
              putBoolean("hasMore", hasMore)
            })
      } catch (error: Exception) {
        promise.reject("E_MEDIA_QUERY", "Could not read media", error)
      }
    }
  }

  override fun getThumbnail(uri: String, cacheKey: String, maxSize: Double, promise: Promise) {
    thumbnailExecutor.execute {
      try {
        val contentUri = Uri.parse(uri)
        // Only media-library items: never let JS point this at another app's provider.
        if (contentUri.scheme != "content" || contentUri.authority != MediaStore.AUTHORITY) {
          throw IllegalArgumentException("Not a media library item")
        }
        val directory = File(reactApplicationContext.cacheDir, "thumbnails").apply { mkdirs() }
        val safeKey = cacheKey.replace(UNSAFE_FILE_CHARS, "_")
        val target = File(directory, "$safeKey.jpg")
        if (target.length() > 0) {
          promise.resolve(Uri.fromFile(target).toString())
          return@execute
        }

        val edge = maxSize.toInt().coerceIn(MIN_EDGE, MAX_EDGE)
        val bitmap = loadArtwork(contentUri, edge)
        if (bitmap == null) {
          promise.resolve(null)
          return@execute
        }

        // Write to a unique temporary file first so a half-written JPEG is never served, even
        // when two rows request the same item at once.
        val partial = File.createTempFile(safeKey, ".tmp", directory)
        FileOutputStream(partial).use { stream ->
          bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
        }
        bitmap.recycle()
        if (!partial.renameTo(target)) {
          partial.delete()
          throw IOException("Could not store thumbnail for $uri")
        }
        promise.resolve(Uri.fromFile(target).toString())
      } catch (error: Exception) {
        promise.reject("E_THUMBNAIL", "Could not create a thumbnail", error)
      }
    }
  }

  // Media session (notification and lock-screen controls). The stand-in player lives on
  // the main thread, so every call hops there.

  private val mainHandler = Handler(Looper.getMainLooper())

  private val sessionPlayer
    get() = PlaybackSessionService.sharedPlayer(Looper.getMainLooper())

  override fun setNowPlaying(info: ReadableMap) {
    val next =
        NowPlaying(
            id = info.getString("id") ?: "",
            title = info.getString("title") ?: "",
            artist = info.getString("artist") ?: "",
            artworkUri = if (info.hasKey("artworkUri")) info.getString("artworkUri") else null,
            durationMs = info.getDouble("durationMs").toLong(),
            positionMs = info.getDouble("positionMs").toLong(),
            playing = info.getBoolean("playing"),
            buffering = info.getBoolean("buffering"),
            speed = info.getDouble("speed").toFloat(),
            hasPrevious = info.getBoolean("hasPrevious"),
            hasNext = info.getBoolean("hasNext"),
        )
    mainHandler.post {
      sessionPlayer.onCommand = { command, positionMs ->
        emitOnRemoteCommand(
            Arguments.createMap().apply {
              putString("command", command)
              putDouble("positionMs", positionMs.toDouble())
            })
      }
      sessionPlayer.update(next)
      if (!PlaybackSessionService.running) {
        startSessionService()
      }
    }
  }

  override fun clearNowPlaying() {
    mainHandler.post { stopSession() }
  }

  private fun startSessionService() {
    try {
      reactApplicationContext.startService(
          Intent(reactApplicationContext, PlaybackSessionService::class.java))
    } catch (error: IllegalStateException) {
      // Android refuses to start services from the background; the next update retries.
      Log.w(TAG, "Could not start the playback session", error)
    }
  }

  private fun stopSession() {
    sessionPlayer.update(null)
    if (PlaybackSessionService.running) {
      reactApplicationContext.stopService(
          Intent(reactApplicationContext, PlaybackSessionService::class.java))
    }
  }

  override fun invalidate() {
    queryExecutor.shutdownNow()
    thumbnailExecutor.shutdownNow()
    mainHandler.post {
      sessionPlayer.onCommand = null
      stopSession()
    }
    super.invalidate()
  }

  /** Video frame or embedded album art; null when there is none (common for audio). */
  private fun loadArtwork(uri: Uri, edge: Int): Bitmap? {
    val isAudio = uri.pathSegments.contains("audio")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return try {
        resolver.loadThumbnail(uri, Size(edge, edge), null)
      } catch (missing: IOException) {
        null
      }
    }
    val id = ContentUris.parseId(uri)
    return if (isAudio) {
      legacyAlbumArt(id, edge)
    } else {
      @Suppress("DEPRECATION")
      MediaStore.Video.Thumbnails.getThumbnail(
          resolver, id, MediaStore.Video.Thumbnails.MINI_KIND, null)
    }
  }

  /** Album art before Android 10 lives in a separate album-art table. */
  private fun legacyAlbumArt(audioId: Long, edge: Int): Bitmap? {
    val albumId =
        resolver
            .query(
                ContentUris.withAppendedId(Kind.AUDIO.uri, audioId),
                arrayOf(MediaStore.Audio.Media.ALBUM_ID),
                null,
                null,
                null)
            ?.use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else null } ?: return null
    val artUri = ContentUris.withAppendedId(LEGACY_ALBUM_ART_URI, albumId)
    return try {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      resolver.openInputStream(artUri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
      var sample = 1
      while (bounds.outWidth / (sample * 2) >= edge && bounds.outHeight / (sample * 2) >= edge) {
        sample *= 2
      }
      val options = BitmapFactory.Options().apply { inSampleSize = sample }
      resolver.openInputStream(artUri)?.use { BitmapFactory.decodeStream(it, null, options) }
    } catch (missing: IOException) {
      null
    }
  }

  /** Folder of the current row, from bucket columns or (older audio rows) the file path. */
  private class BucketReader(private val cursor: Cursor, kind: Kind) {
    private val byColumns = kind.hasBucketColumns
    private val idColumn = cursor.getColumnIndex(BUCKET_ID)
    private val nameColumn = cursor.getColumnIndex(BUCKET_NAME)
    private val dataColumn = cursor.getColumnIndex(DATA)

    fun read(): Bucket? {
      if (byColumns) {
        val id = cursor.getString(idColumn) ?: return null
        return Bucket(id, cursor.getString(nameColumn) ?: UNKNOWN_FOLDER)
      }
      val path = cursor.getString(dataColumn) ?: return null
      val parent = File(path).parentFile ?: return null
      // MediaProvider derives bucket ids the same way, so audio and video folders line up.
      return Bucket(parent.path.lowercase().hashCode().toString(), parent.name)
    }
  }

  private class Columns(cursor: Cursor) {
    val id = cursor.getColumnIndex(ID)
    val name = cursor.getColumnIndex(NAME)
    val size = cursor.getColumnIndex(SIZE)
    val duration = cursor.getColumnIndex(DURATION)
    val modified = cursor.getColumnIndex(MODIFIED)
    val added = cursor.getColumnIndex(ADDED)
    val width = cursor.getColumnIndex(WIDTH)
    val height = cursor.getColumnIndex(HEIGHT)
    val orientation = cursor.getColumnIndex(ORIENTATION)
    val title = cursor.getColumnIndex(TITLE)
    val artist = cursor.getColumnIndex(ARTIST)
    val album = cursor.getColumnIndex(ALBUM)
  }

  private fun readItem(cursor: Cursor, columns: Columns, kind: Kind): WritableMap {
    val id = cursor.getLong(columns.id)
    var width = if (columns.width >= 0) cursor.getInt(columns.width) else 0
    var height = if (columns.height >= 0) cursor.getInt(columns.height) else 0
    // Portrait recordings are stored landscape with a rotation flag.
    if (columns.orientation >= 0) {
      val rotation = cursor.getInt(columns.orientation)
      if (rotation == 90 || rotation == 270) {
        width = height.also { height = width }
      }
    }
    val sizeBytes = cursor.getLong(columns.size)

    return Arguments.createMap().apply {
      putString("id", id.toString())
      putString("uri", ContentUris.withAppendedId(kind.uri, id).toString())
      putString("fileName", cursor.getString(columns.name) ?: "Media $id")
      if (sizeBytes > 0) putDouble("sizeBytes", sizeBytes.toDouble()) else putNull("sizeBytes")
      putDouble("durationSec", cursor.getLong(columns.duration) / 1000.0)
      putInt("width", width)
      putInt("height", height)
      putDouble("modifiedAtSec", cursor.getLong(columns.modified).toDouble())
      putDouble("addedAtSec", cursor.getLong(columns.added).toDouble())
      putTag("title", cursor, columns.title)
      putTag("artist", cursor, columns.artist)
      putTag("album", cursor, columns.album)
    }
  }

  private fun WritableMap.putTag(key: String, cursor: Cursor, column: Int) {
    val value = if (column >= 0) cursor.getString(column)?.trim() else null
    // MediaStore reports missing tags as "<unknown>".
    if (value.isNullOrEmpty() || value == MediaStore.UNKNOWN_STRING) putNull(key)
    else putString(key, value)
  }

  private companion object {
    const val TAG = "ZxplayerMedia"
    const val ID = MediaStore.MediaColumns._ID
    const val NAME = MediaStore.MediaColumns.DISPLAY_NAME
    const val SIZE = MediaStore.MediaColumns.SIZE
    const val MODIFIED = MediaStore.MediaColumns.DATE_MODIFIED
    const val ADDED = MediaStore.MediaColumns.DATE_ADDED
    // Present on both tables (VideoColumns / AudioColumns) on every supported API level.
    const val DURATION = MediaStore.Video.VideoColumns.DURATION
    const val WIDTH = MediaStore.MediaColumns.WIDTH
    const val HEIGHT = MediaStore.MediaColumns.HEIGHT
    const val ORIENTATION = "orientation"
    const val TITLE = MediaStore.Audio.AudioColumns.TITLE
    const val ARTIST = MediaStore.Audio.AudioColumns.ARTIST
    const val ALBUM = MediaStore.Audio.AudioColumns.ALBUM
    const val BUCKET_ID = MediaStore.Video.VideoColumns.BUCKET_ID
    const val BUCKET_NAME = MediaStore.Video.VideoColumns.BUCKET_DISPLAY_NAME
    @Suppress("DEPRECATION") const val DATA = MediaStore.MediaColumns.DATA
    const val UNKNOWN_FOLDER = "Unknown folder"
    const val THUMBNAIL_THREADS = 4
    const val MIN_EDGE = 64
    const val MAX_EDGE = 1024
    const val JPEG_QUALITY = 82
    val LEGACY_ALBUM_ART_URI: Uri = Uri.parse("content://media/external/audio/albumart")
    val UNSAFE_FILE_CHARS = Regex("[^A-Za-z0-9_-]")
  }
}
