package com.isherezahin.zxplayer.media

import android.content.ContentUris
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Size
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Reads the video library straight from MediaStore columns (no file is opened), and
 * thumbnails from the system thumbnail cache, the way native players do.
 */
class ZxplayerMediaModule(reactContext: ReactApplicationContext) :
    NativeZxplayerMediaSpec(reactContext) {

  // Queries and thumbnails get their own threads so a long scan never delays thumbnails.
  private val queryExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private val thumbnailExecutor: ExecutorService =
      Executors.newFixedThreadPool(THUMBNAIL_THREADS)

  private val resolver
    get() = reactApplicationContext.contentResolver

  override fun getVideoFolders(promise: Promise) {
    queryExecutor.execute {
      try {
        val counts = LinkedHashMap<String, Pair<String, Int>>()
        resolver
            .query(
                VIDEO_URI,
                arrayOf(BUCKET_ID, BUCKET_NAME),
                null,
                null,
                null,
            )
            ?.use { cursor ->
              val idColumn = cursor.getColumnIndexOrThrow(BUCKET_ID)
              val nameColumn = cursor.getColumnIndexOrThrow(BUCKET_NAME)
              while (cursor.moveToNext()) {
                val id = cursor.getString(idColumn) ?: continue
                val name = cursor.getString(nameColumn) ?: UNKNOWN_FOLDER
                val previous = counts[id]
                counts[id] = Pair(previous?.first ?: name, (previous?.second ?: 0) + 1)
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
        promise.reject("E_MEDIA_QUERY", "Could not read video folders", error)
      }
    }
  }

  override fun getVideos(bucketId: String?, offset: Double, limit: Double, promise: Promise) {
    queryExecutor.execute {
      try {
        val projection = mutableListOf(ID, NAME, SIZE, DURATION, WIDTH, HEIGHT, MODIFIED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          projection.add(ORIENTATION)
        }
        val selection = if (bucketId != null) "$BUCKET_ID = ?" else null
        val selectionArgs = if (bucketId != null) arrayOf(bucketId) else null
        val start = offset.toInt().coerceAtLeast(0)
        val count = limit.toInt().coerceAtLeast(1)

        val videos = Arguments.createArray()
        var hasMore = false
        resolver
            .query(VIDEO_URI, projection.toTypedArray(), selection, selectionArgs, "$MODIFIED DESC")
            ?.use { cursor ->
              if (start > 0 && !cursor.moveToPosition(start - 1)) {
                return@use
              }
              val columns = Columns(cursor.columnNames.toList())
              var read = 0
              while (read < count && cursor.moveToNext()) {
                videos.pushMap(readVideo(cursor, columns))
                read += 1
              }
              hasMore = cursor.position < cursor.count - 1
            }

        promise.resolve(
            Arguments.createMap().apply {
              putArray("videos", videos)
              putBoolean("hasMore", hasMore)
            })
      } catch (error: Exception) {
        promise.reject("E_MEDIA_QUERY", "Could not read videos", error)
      }
    }
  }

  override fun getThumbnail(videoId: String, cacheKey: String, maxSize: Double, promise: Promise) {
    thumbnailExecutor.execute {
      try {
        val directory = File(reactApplicationContext.cacheDir, "thumbnails").apply { mkdirs() }
        val safeKey = cacheKey.replace(UNSAFE_FILE_CHARS, "_")
        val target = File(directory, "$safeKey.jpg")
        if (target.length() > 0) {
          promise.resolve(Uri.fromFile(target).toString())
          return@execute
        }

        val id = videoId.toLong()
        val edge = maxSize.toInt().coerceIn(MIN_EDGE, MAX_EDGE)
        val bitmap =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              resolver.loadThumbnail(ContentUris.withAppendedId(VIDEO_URI, id), Size(edge, edge), null)
            } else {
              @Suppress("DEPRECATION")
              MediaStore.Video.Thumbnails.getThumbnail(
                  resolver, id, MediaStore.Video.Thumbnails.MINI_KIND, null)
                  ?: throw IOException("No thumbnail for video $id")
            }

        // Write to a unique temporary file first so a half-written JPEG is never served, even
        // when two rows request the same video at once.
        val partial = File.createTempFile(safeKey, ".tmp", directory)
        FileOutputStream(partial).use { stream ->
          bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
        }
        bitmap.recycle()
        if (!partial.renameTo(target)) {
          partial.delete()
          throw IOException("Could not store thumbnail for video $id")
        }
        promise.resolve(Uri.fromFile(target).toString())
      } catch (error: Exception) {
        promise.reject("E_THUMBNAIL", "Could not create a thumbnail", error)
      }
    }
  }

  override fun invalidate() {
    queryExecutor.shutdownNow()
    thumbnailExecutor.shutdownNow()
    super.invalidate()
  }

  private class Columns(names: List<String>) {
    val id = names.indexOf(ID)
    val name = names.indexOf(NAME)
    val size = names.indexOf(SIZE)
    val duration = names.indexOf(DURATION)
    val width = names.indexOf(WIDTH)
    val height = names.indexOf(HEIGHT)
    val modified = names.indexOf(MODIFIED)
    val orientation = names.indexOf(ORIENTATION)
  }

  private fun readVideo(cursor: android.database.Cursor, columns: Columns): WritableMap {
    val id = cursor.getLong(columns.id)
    var width = cursor.getInt(columns.width)
    var height = cursor.getInt(columns.height)
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
      putString("uri", ContentUris.withAppendedId(VIDEO_URI, id).toString())
      putString("fileName", cursor.getString(columns.name) ?: "Video $id")
      if (sizeBytes > 0) putDouble("sizeBytes", sizeBytes.toDouble()) else putNull("sizeBytes")
      putDouble("durationSec", cursor.getLong(columns.duration) / 1000.0)
      putInt("width", width)
      putInt("height", height)
      putDouble("modifiedAtSec", cursor.getLong(columns.modified).toDouble())
    }
  }

  private companion object {
    val VIDEO_URI: Uri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
    const val ID = MediaStore.Video.Media._ID
    const val NAME = MediaStore.Video.Media.DISPLAY_NAME
    const val SIZE = MediaStore.Video.Media.SIZE
    const val DURATION = MediaStore.Video.Media.DURATION
    const val WIDTH = MediaStore.Video.Media.WIDTH
    const val HEIGHT = MediaStore.Video.Media.HEIGHT
    const val MODIFIED = MediaStore.Video.Media.DATE_MODIFIED
    const val ORIENTATION = "orientation"
    const val BUCKET_ID = MediaStore.Video.Media.BUCKET_ID
    const val BUCKET_NAME = MediaStore.Video.Media.BUCKET_DISPLAY_NAME
    const val UNKNOWN_FOLDER = "Unknown folder"
    const val THUMBNAIL_THREADS = 4
    const val MIN_EDGE = 64
    const val MAX_EDGE = 1024
    const val JPEG_QUALITY = 82
    val UNSAFE_FILE_CHARS = Regex("[^A-Za-z0-9_-]")
  }
}
