package com.isherezahin.zxplayer.media

import android.app.Activity
import android.app.PendingIntent
import android.content.ContentResolver
import android.content.ContentUris
import android.content.ContentValues
import android.database.Cursor
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import android.util.Size
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
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

  private class FolderInfo(val name: String, val relativePath: String?) {
    var count = 0
    val newIds = mutableListOf<String>()
  }

  // Queries and thumbnails get their own threads so a long scan never delays thumbnails.
  private val queryExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private val thumbnailExecutor: ExecutorService =
      Executors.newFixedThreadPool(THUMBNAIL_THREADS)
  // Moves and copies can take a while for large files; they never hold up library scans.
  private val fileExecutor: ExecutorService = Executors.newSingleThreadExecutor()

  /** Answer to the system consent prompt currently on screen, if any. */
  private var pendingConsent: ((Boolean) -> Unit)? = null

  private val activityListener =
      object : ActivityEventListener {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?
        ) {
          if (requestCode != CONSENT_REQUEST_CODE) return
          val answer = pendingConsent ?: return
          pendingConsent = null
          answer(resultCode == Activity.RESULT_OK)
        }

        override fun onNewIntent(intent: Intent) = Unit
      }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  private val resolver
    get() = reactApplicationContext.contentResolver

  /** The installed package's version, so About and the update check never drift from the build. */
  override fun getTypedExportedConstants(): Map<String, Any> {
    val context = reactApplicationContext
    val info =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          context.packageManager.getPackageInfo(
              context.packageName, PackageManager.PackageInfoFlags.of(0))
        } else {
          @Suppress("DEPRECATION") context.packageManager.getPackageInfo(context.packageName, 0)
        }
    val build =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          info.longVersionCode
        } else {
          @Suppress("DEPRECATION") info.versionCode.toLong()
        }
    return mapOf("appVersion" to (info.versionName ?: ""), "buildNumber" to build.toDouble())
  }

  override fun getFolders(kind: String, newSinceSec: Double, promise: Promise) {
    queryExecutor.execute {
      try {
        val source = Kind.of(kind)
        val projection = mutableListOf(ID, ADDED)
        projection += if (source.hasBucketColumns) listOf(BUCKET_ID, BUCKET_NAME) else listOf(DATA)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) projection += RELATIVE_PATH
        val newSince = newSinceSec.toLong()
        val found = LinkedHashMap<String, FolderInfo>()
        resolver.query(source.uri, projection.toTypedArray(), null, null, null)?.use { cursor ->
          val reader = BucketReader(cursor, source)
          val idColumn = cursor.getColumnIndex(ID)
          val addedColumn = cursor.getColumnIndex(ADDED)
          val pathColumn = cursor.getColumnIndex(RELATIVE_PATH)
          while (cursor.moveToNext()) {
            val bucket = reader.read() ?: continue
            val folder =
                found.getOrPut(bucket.id) {
                  FolderInfo(bucket.name, if (pathColumn >= 0) cursor.getString(pathColumn) else null)
                }
            folder.count += 1
            if (cursor.getLong(addedColumn) >= newSince && folder.newIds.size < MAX_NEW_IDS) {
              folder.newIds += cursor.getLong(idColumn).toString()
            }
          }
        }

        val folders = Arguments.createArray()
        for ((id, folder) in found) {
          folders.pushMap(
              Arguments.createMap().apply {
                putString("id", id)
                putString("name", folder.name)
                putInt("count", folder.count)
                if (folder.relativePath != null) putString("relativePath", folder.relativePath)
                else putNull("relativePath")
                putArray(
                    "newIds", Arguments.createArray().apply { folder.newIds.forEach(::pushString) })
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
        val contentUri = mediaItemUri(uri)
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

  override fun shareMedia(uri: String, title: String, promise: Promise) {
    try {
      val contentUri = mediaItemUri(uri)
      val send =
          Intent(Intent.ACTION_SEND).apply {
            type = resolver.getType(contentUri) ?: "*/*"
            putExtra(Intent.EXTRA_STREAM, contentUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
      val chooser =
          Intent.createChooser(send, title).apply {
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            if (reactApplicationContext.currentActivity == null) {
              addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
          }
      (reactApplicationContext.currentActivity ?: reactApplicationContext).startActivity(chooser)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_SHARE", "Could not share this file", error)
    }
  }

  // File management (Android 11+). Each change goes through the system's own consent
  // prompt, which also tells the user exactly what will happen.

  override fun trashMedia(uris: ReadableArray, trashed: Boolean, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return rejectUnsupported(promise)
    requestTrash(uris, trashed, promise)
  }

  override fun deleteMedia(uris: ReadableArray, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return rejectUnsupported(promise)
    requestDelete(uris, promise)
  }

  override fun getTrashedMedia(kind: String, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return rejectUnsupported(promise)
    queryTrashed(kind, promise)
  }

  override fun moveMedia(uris: ReadableArray, relativePath: String, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return rejectUnsupported(promise)
    move(uris, relativePath, promise)
  }

  override fun copyMedia(uris: ReadableArray, relativePath: String, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return rejectUnsupported(promise)
    copy(uris, relativePath, promise)
  }

  private fun rejectUnsupported(promise: Promise) {
    promise.reject("E_UNSUPPORTED", "Managing files needs Android 11 or newer")
  }

  @RequiresApi(Build.VERSION_CODES.R)
  private fun requestTrash(uris: ReadableArray, trashed: Boolean, promise: Promise) {
    val items = parseItems(uris, promise) ?: return
    askConsent(promise, { MediaStore.createTrashRequest(resolver, items, trashed) }) { granted ->
      promise.resolve(granted)
    }
  }

  @RequiresApi(Build.VERSION_CODES.R)
  private fun requestDelete(uris: ReadableArray, promise: Promise) {
    val items = parseItems(uris, promise) ?: return
    askConsent(promise, { MediaStore.createDeleteRequest(resolver, items) }) { granted ->
      promise.resolve(granted)
    }
  }

  @RequiresApi(Build.VERSION_CODES.R)
  private fun queryTrashed(kind: String, promise: Promise) {
    queryExecutor.execute {
      try {
        val source = Kind.of(kind)
        val projection = mutableListOf(ID, NAME, SIZE, DURATION, MODIFIED, ADDED, EXPIRES)
        projection +=
            if (source == Kind.VIDEO) listOf(WIDTH, HEIGHT, ORIENTATION)
            else listOf(TITLE, ARTIST, ALBUM)
        val arguments =
            Bundle().apply {
              putInt(MediaStore.QUERY_ARG_MATCH_TRASHED, MediaStore.MATCH_ONLY)
              putString(ContentResolver.QUERY_ARG_SQL_SORT_ORDER, "$EXPIRES ASC")
            }
        val items = Arguments.createArray()
        resolver.query(source.uri, projection.toTypedArray(), arguments, null)?.use { cursor ->
          val columns = Columns(cursor)
          val expires = cursor.getColumnIndex(EXPIRES)
          while (cursor.moveToNext()) {
            items.pushMap(
                readItem(cursor, columns, source).apply {
                  putDouble("expiresAtSec", cursor.getLong(expires).toDouble())
                })
          }
        }
        promise.resolve(items)
      } catch (error: Exception) {
        promise.reject("E_MEDIA_QUERY", "Could not read the recycle bin", error)
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.R)
  private fun move(uris: ReadableArray, relativePath: String, promise: Promise) {
    val items = parseItems(uris, promise) ?: return
    if (!isValidDestination(relativePath)) {
      promise.reject("E_ARGS", "Not a valid destination: $relativePath")
      return
    }
    askConsent(promise, { MediaStore.createWriteRequest(resolver, items) }) { granted ->
      if (!granted) {
        promise.resolve(operationResult(false, 0, 0))
        return@askConsent
      }
      fileExecutor.execute {
        var done = 0
        var failed = 0
        val values = ContentValues().apply { put(RELATIVE_PATH, relativePath) }
        for (item in items) {
          try {
            if (resolver.update(item, values, null, null) > 0) done += 1 else failed += 1
          } catch (error: Exception) {
            Log.w(TAG, "Could not move $item", error)
            failed += 1
          }
        }
        promise.resolve(operationResult(true, done, failed))
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.R)
  private fun copy(uris: ReadableArray, relativePath: String, promise: Promise) {
    val items = parseItems(uris, promise) ?: return
    if (!isValidDestination(relativePath)) {
      promise.reject("E_ARGS", "Not a valid destination: $relativePath")
      return
    }
    fileExecutor.execute {
      var done = 0
      for (item in items) {
        if (copyOne(item, relativePath)) done += 1
      }
      promise.resolve(operationResult(true, done, items.size - done))
    }
  }

  /** Copies into a new library entry, kept pending (hidden) until the bytes are all there. */
  @RequiresApi(Build.VERSION_CODES.R)
  private fun copyOne(source: Uri, relativePath: String): Boolean {
    val (name, mimeType) =
        resolver.query(source, arrayOf(NAME, MIME_TYPE), null, null, null)?.use { cursor ->
          if (cursor.moveToFirst()) Pair(cursor.getString(0), cursor.getString(1)) else null
        } ?: return false
    val collection =
        if (source.pathSegments.contains("audio"))
            MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        else MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    val pending =
        ContentValues().apply {
          put(NAME, name)
          put(MIME_TYPE, mimeType)
          put(RELATIVE_PATH, relativePath)
          put(IS_PENDING, 1)
        }
    val target =
        try {
          resolver.insert(collection, pending)
        } catch (error: Exception) {
          Log.w(TAG, "Could not create a copy of $source in $relativePath", error)
          null
        } ?: return false
    return try {
      val input = resolver.openInputStream(source) ?: throw IOException("Cannot read $source")
      input.use {
        val output = resolver.openOutputStream(target) ?: throw IOException("Cannot write copy")
        output.use { input.copyTo(it, COPY_BUFFER_BYTES) }
      }
      resolver.update(target, ContentValues().apply { put(IS_PENDING, 0) }, null, null)
      true
    } catch (error: Exception) {
      Log.w(TAG, "Could not copy $source", error)
      resolver.delete(target, null, null)
      false
    }
  }

  /** Shows a system consent prompt and reports the user's answer. */
  @RequiresApi(Build.VERSION_CODES.R)
  private fun askConsent(
      promise: Promise,
      buildRequest: () -> PendingIntent,
      onAnswer: (Boolean) -> Unit
  ) {
    mainHandler.post {
      val activity = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "ZX Player is not in the foreground")
        return@post
      }
      if (pendingConsent != null) {
        promise.reject("E_BUSY", "Another request is waiting for an answer")
        return@post
      }
      try {
        val request = buildRequest()
        pendingConsent = onAnswer
        activity.startIntentSenderForResult(
            request.intentSender, CONSENT_REQUEST_CODE, null, 0, 0, 0, null)
      } catch (error: Exception) {
        pendingConsent = null
        promise.reject("E_CONSENT", "Could not ask for permission", error)
      }
    }
  }

  /** Library items only: never let JS point a change at another app's provider. */
  private fun parseItems(uris: ReadableArray, promise: Promise): List<Uri>? =
      try {
        (0 until uris.size()).map { index -> mediaItemUri(uris.getString(index) ?: "") }
      } catch (error: IllegalArgumentException) {
        promise.reject("E_ARGS", "Not a media library item", error)
        null
      }

  private fun operationResult(granted: Boolean, done: Int, failed: Int): WritableMap =
      Arguments.createMap().apply {
        putBoolean("granted", granted)
        putInt("done", done)
        putInt("failed", failed)
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
    reactApplicationContext.removeActivityEventListener(activityListener)
    pendingConsent = null
    queryExecutor.shutdownNow()
    thumbnailExecutor.shutdownNow()
    // Lets a copy in progress finish rather than leave a half-written file behind.
    fileExecutor.shutdown()
    mainHandler.post {
      sessionPlayer.onCommand = null
      stopSession()
    }
    super.invalidate()
  }

  /** Parses a library item's `content://media/…` URI, rejecting anything else. */
  private fun mediaItemUri(value: String): Uri {
    val uri = Uri.parse(value)
    if (uri.scheme != "content" || uri.authority != MediaStore.AUTHORITY) {
      throw IllegalArgumentException("Not a media library item")
    }
    return uri
  }

  /**
   * A folder under one of the shared media directories ("Movies/Trips/"): MediaStore only
   * accepts those for video and audio, and ".." or empty parts could escape them.
   */
  private fun isValidDestination(relativePath: String): Boolean {
    if (!relativePath.endsWith("/")) return false
    val parts = relativePath.removeSuffix("/").split('/')
    return parts.first() in MEDIA_ROOTS &&
        parts.none { it.isBlank() || it == "." || it == ".." || it.contains('\\') }
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
    const val EXPIRES = MediaStore.MediaColumns.DATE_EXPIRES
    const val MIME_TYPE = MediaStore.MediaColumns.MIME_TYPE
    const val RELATIVE_PATH = MediaStore.MediaColumns.RELATIVE_PATH
    const val IS_PENDING = MediaStore.MediaColumns.IS_PENDING
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
    /** Enough to tag a folder as new without sending thousands of ids. */
    const val MAX_NEW_IDS = 500
    const val CONSENT_REQUEST_CODE = 0x5A11
    const val COPY_BUFFER_BYTES = 256 * 1024
    val MEDIA_ROOTS =
        setOf("Movies", "DCIM", "Pictures", "Music", "Podcasts", "Audiobooks", "Recordings")
    val LEGACY_ALBUM_ART_URI: Uri = Uri.parse("content://media/external/audio/albumart")
    val UNSAFE_FILE_CHARS = Regex("[^A-Za-z0-9_-]")
  }
}
