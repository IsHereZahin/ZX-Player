# ZX Player

Offline local video and audio player for Android and iOS, built with React Native (New Architecture), TypeScript, `react-native-video` and `react-native-gesture-handler`.

- **App name:** ZX Player
- **Bundle / application ID:** `com.isherezahin.zxplayer`

## Features

The UI follows Apple's design language: system colours with blue as the tint, grouped backgrounds and hairline separators, in light and dark themes. Text uses Apple's type scale, set in the system font (SF Pro) on iOS and in [Inter](https://rsms.me/inter/) on Android (`android/app/src/main/assets/fonts`, SIL Open Font License, see `assets/fonts/Inter-LICENSE.txt`). The theme follows the device by default and can be fixed to Light or Dark in Settings. The player always stays dark. Colour tokens for both themes live in `src/shared/theme.ts`. Components read the active palette through `useColors` / `makeStyles` (`src/shared/theming.tsx`), which build each style sheet once per theme. Icons come from Lucide, and screens share the components in `src/shared/components`.

### Library

Bottom tabs: Videos · Audio · Recent · Settings. With **Settings → Audio and video → Together**, the tabs become Library · Recent · Settings, and each folder lists its videos and audio side by side.

- Folders from the device media library (Android MediaStore buckets, iOS Photos albums) plus "All videos" / "All audio", with a **Continue watching** (or **Continue listening**) rail for unfinished items.
- **Audio** (Android): music, recordings and other audio files with album art and title / artist / album tags. iOS apps cannot list the device's audio files, so iOS shows videos only.
- Folder view in **list or grid**, **sorting** by date, name (natural order, so "Episode 2" comes before "Episode 10"), duration or size, and **Play all**.
- Per-video menu: resume or play from the beginning, mark as watched or unwatched, add to Favorites, video details, remove from history.
- **Favorites**: heart anything from its menu or the player's More sheet; a Favorites list sits at the top of each library tab and favorited rows show a small heart.
- **Recently Added**: a shelf and a list of what arrived in the last 30 days. Files added in the last week that haven't been played show a blue dot, as in Podcasts.
- **Playlists**: create, rename and delete playlists of videos and music; add from any item's menu ("Add to Playlist…") and remove from inside the playlist.
- **Play and Shuffle** buttons on folders, playlists and collections; **Share** (Android) from an item's menu; a long press opens the menu; Search remembers **recent searches**.
- **Search** across the whole library by file name (and title, artist or album for audio), including non-Latin titles.
- **Recent** tab: unfinished and recently played videos, with progress bars and "12 min left".
- Thumbnails show a watch-progress bar. The most recently played video is highlighted.
- Permission flow: Android 13+ granular video and audio access, Android 14+ "selected videos", legacy storage on Android 12 and below, and Photos access on iOS. Denied and blocked states link to Settings.

### Player

- **Resume where you left off**, with a "Start over" option. Progress is saved every few seconds, on pause and when closing.
- **Queue**: previous/next, auto-play next, repeat (off / all / one). "Previous" restarts the current video after 5 s.
- **Playback speed** 0.5×–3×, **press and hold for 2×**.
- **Audio track** and **embedded subtitle track** selection. **External subtitles** (`.srt`, `.ass`, `.ssa`) with delay adjustment.
- **Lock screen** controls, **sleep timer** (timed or end of video), **picture-in-picture**, **background play** with notification controls (optional).
- **Mini player**: with background play on (always for audio), leaving the player keeps it playing behind a mini player above the tab bar, with play/pause, next and stop. Tap it to return to the full player.
- Each video opens in its own orientation (landscape for wide, portrait for tall), decided from the library before the file loads, so the screen doesn't turn after playback starts. The rotate button overrides it for the rest of the session. The video's thumbnail shows until the first frame is drawn.
- **Audio mode**: album art on a blurred backdrop with title and artist. Controls stay on screen, and playback always continues in the background with notification controls.
- Aspect modes, auto-hiding controls, buffering and error states (retry, or skip to the next video).

### Gestures

Each gesture can be turned off in Settings.

| Gesture                        | Action                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| Vertical drag, left half       | Screen brightness                                                    |
| Vertical drag, right half      | Media volume (system HUD suppressed)                                 |
| Horizontal drag                | Seek with a live `+0:45 · 2:25 / 10:00` overlay; applied on release  |
| Double tap, left / right third | Skip back / forward (interval set in Settings); repeated taps add up |
| Double tap, centre             | Play / pause                                                         |
| Press and hold                 | 2× speed while held                                                  |
| Pinch                          | Zoom up to 4×; while zoomed, a drag moves the picture                |
| Single tap                     | Show / hide controls                                                 |

### Settings

Saved on the device: theme (system, light, dark), audio and video in separate tabs or together, resume playback, auto-play next, background play, skip interval, default aspect ratio, each gesture, subtitle size and background, clear watch history.

### Aspect modes

Change with the aspect button or More → Aspect ratio.

| Mode    | Behaviour                                      |
| ------- | ---------------------------------------------- |
| Fit     | Whole frame visible, letter/pillar-boxed       |
| Fill    | Fills the screen, aspect kept, edges trimmed   |
| Crop    | Native pixel size (100 %), centred and cropped |
| Stretch | Fills the screen exactly, aspect ignored       |

"Fill" and "Crop" mean the same thing in most players, so Crop shows the video at its native size to keep the four modes distinct.

### External subtitles

Picked through the system file picker and parsed by ZX Player itself, so they render identically on both platforms. ASS styling and positioning are dropped and vector drawings are skipped. Files must be UTF-8.

## Logo

The ZX Player mark is a rounded play button split by a Z-shaped seam, in white and pale blue on the brand-blue gradient. The master artwork is `assets/brand/zx-player-icon.svg` (with a 512 px PNG for stores).

- **Android:** adaptive icon (`res/drawable/ic_launcher_{background,foreground,monochrome}.xml`), including a monochrome layer for Android 13+ themed icons. PNG launcher icons cover Android 7.
- **iOS:** a single 1024 px `AppIcon` (Xcode generates the other sizes).
- **In the app:** `src/shared/components/AppLogo.tsx` draws the same geometry with react-native-svg. It appears in the Library header, the first-run permission screen and Settings.

## Requirements

- Node ≥ 22.11
- Android: JDK 17+, Android SDK (compileSdk 37, minSdk 24)
- iOS: macOS with Xcode, CocoaPods (via Bundler), iOS 15.1+

## Getting started

```sh
npm install

# iOS only
bundle install
cd ios && bundle exec pod install && cd ..

npm start          # Metro
npm run android    # or: npm run ios
```

## Building an installable Android APK

```sh
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
# → android/app/build/outputs/apk/release/app-release.apk
```

Release builds are signed with the key named by these properties in `~/.gradle/gradle.properties`. They are kept outside the repository on purpose:

```properties
PLAYZ_UPLOAD_STORE_FILE=playz-release.keystore   # relative to android/app
PLAYZ_UPLOAD_KEY_ALIAS=playz-upload
PLAYZ_UPLOAD_STORE_PASSWORD=…
PLAYZ_UPLOAD_KEY_PASSWORD=…
```

The `PLAYZ_` property names, keystore file name and key alias predate the rename to ZX Player and are kept so they keep matching the existing release key.

Back up the keystore and its password together. An APK signed with a different key cannot update an installed copy of the app. Without these properties the release build falls back to the debug key.

On Windows without long-path support, native code paths can exceed 260 characters. `android/app/build.gradle` sets `CMAKE_OBJECT_PATH_MAX=255` so CMake shortens them. That setting is tuned for a project folder about as long as `D:\learning purposes\Play-Z`. In a much deeper folder, enable Windows long paths or move the project to a shorter path.

## Scripts

| Script              | Purpose                         |
| ------------------- | ------------------------------- |
| `npm start`         | Metro bundler                   |
| `npm run android`   | Build and run on Android        |
| `npm run ios`       | Build and run on iOS            |
| `npm test`          | Jest unit and integration tests |
| `npm run typecheck` | TypeScript (`tsc --noEmit`)     |
| `npm run lint`      | ESLint                          |

## Project structure

```text
src/
  app/                        App root, tabs + native stack navigation, store hydration
  features/
    library/                  Media scanning, permissions, thumbnails, folders, videos, search
      services/               Media library adapter (native MediaStore / camera-roll), permissions, thumbnail queue, search index
      utils/                  Sorting and filtering (pure TS)
      hooks/  components/  screens/
    history/                  Watch history store (resume, progress) and the Recent tab
    settings/                 Persisted settings and the Settings tab
    player/
      subtitles/              SRT / ASS parsers and time-indexed cue lookup (pure TS)
      utils/                  Aspect-ratio layout, gesture maths, track labels (pure TS)
      hooks/                  Playback, progress saving, gestures, brightness, volume, sleep timer
      components/             Controls, seek bar, gesture indicators, sheets, overlays
      screens/                PlayerScreen (queue, cross-video state) + PlayerSession (one video)
  shared/
    storage/                  Observable stores persisted to AsyncStorage (validated on load)
    components/  hooks/  utils/
    theme.ts  theming.tsx     Light / dark design tokens; theme context and makeStyles
    icons.ts                  Per-icon Lucide imports
  test/                       Fixtures, navigation doubles, store reset
modules/zxplayer-brightness/  In-repo TurboModule for screen brightness (Kotlin + Obj-C++)
modules/zxplayer-media/       In-repo TurboModule for the Android video / audio library and thumbnails (Kotlin)
__mocks__/                    Jest mocks for every native module
```

### Native dependencies

| Package                                       | Used for                                                |
| --------------------------------------------- | ------------------------------------------------------- |
| `react-native-video`                          | Playback (ExoPlayer / AVPlayer)                         |
| `react-native-gesture-handler` (v3 hooks API) | Player and scrub-bar gestures                           |
| `@react-native-camera-roll/camera-roll`       | Media scanning on iOS; `ph://` thumbnails               |
| `react-native-volume-manager`                 | Media volume without the system HUD                     |
| `@react-native-documents/picker`              | Picking subtitle files                                  |
| `@react-native-async-storage/async-storage`   | Saved settings, watch history, library preferences      |
| `react-native-svg` + `lucide-react-native`    | Icons and gradient scrims                               |
| `@react-navigation/bottom-tabs`               | Library / Recent / Settings tabs                        |
| `zxplayer-brightness` (local)                 | Window brightness (Android) / screen brightness (iOS)   |
| `zxplayer-media` (local)                      | Android video / audio library and thumbnails, album art |

Icons are imported one module at a time from `src/shared/icons.ts`, because Metro would otherwise bundle every Lucide icon. Some Lucide names (e.g. `history`) exist only as type aliases, so `src/shared/__tests__/icons.test.ts` checks that each import has a runtime module.

Background play on Android runs through ZX Player's own media session (`zxplayer-media`: a Media3 `MediaSessionService` with a stand-in player that mirrors the real one). It gives the notification and lock screen **Previous / Play-Pause / Next** (react-native-video's own notification only seeks ±10 s), and as a foreground service it keeps playback alive with the screen off. iOS uses react-native-video's Now Playing integration and the `audio` background mode.

On Android the library comes from `zxplayer-media`, which reads names, sizes, durations, resolutions and audio tags straight from MediaStore columns. It loads thumbnails from the system thumbnail cache and keeps a JPEG copy in the app cache. No video file is opened while scanning, so large libraries list quickly. iOS, and Android builds without the module, use camera-roll.

Brightness on Android uses a window override, so it only affects ZX Player and needs no `WRITE_SETTINGS` permission. On iOS brightness is device-wide, so the original level is restored when the player closes or the app is backgrounded.

## Performance

What keeps large libraries and playback smooth, and what to preserve when changing them:

- **Library scan:** on Android, `zxplayer-media` reads MediaStore columns in pages of 250 and never opens a file. camera-roll, kept for iOS, opens every video to read its duration.
- **Thumbnails:** system thumbnails (`loadThumbnail`) on four threads, cached as JPEGs in the app cache. The queue starts the newest request first, so on-screen rows win, and rows scrolled away cancel their pending requests.
- **Lists:** rows are memoised with stable callbacks: `useVideoActions` reads the queue through a ref, so a folder loading page by page doesn't re-render visible rows. Windowing is tuned in `src/shared/utils/listTuning.ts`, and images skip Android's fade-in.
- **Player:** one native player serves the whole queue; moving to the next item only changes its source. It lives at the app root (`src/app/PlayerHost.tsx`), above the navigator, so it outlives the Player screen; the `Player` route only holds the screen orientation and back navigation. The playback position lives in a small store (`playbackClock.ts`), not React state. Only the seek bar and file subtitles re-render four times a second. Local files start on a short ExoPlayer buffer (0.5 s, 1 s after a seek).

## Testing

`npm test` covers four layers:

- **Pure logic:** subtitle parsers, cue lookup, aspect layout, gesture maths, sorting/search, track labels, formatting, the task queue.
- **Stores:** persistence, validation of stored data, watch-history rules.
- **Services:** permission flows per Android API level and iOS, media mapping, thumbnails, subtitle import.
- **Screen integration:** every screen, including the player's queue, resume, gestures, tracks, lock, sleep timer and picture-in-picture.

Gestures are driven through gesture-handler's `createGestureController`. Native modules, including an in-memory AsyncStorage, are replaced by the mocks in `__mocks__/`. Stores are reset before every test (`jest.afterEnv.ts`).

## Known limitations

- Subtitle files are read as UTF-8; other encodings (e.g. Windows-1252) show garbled characters.
- Only media indexed by the system media library is listed. On iOS that means videos in the Photos library, not files stored in the Files app, and no audio.
- Image-based embedded subtitles (PGS, VobSub) depend on the platform player's support.
- Background play, picture-in-picture and track switching depend on native player behaviour. They have not been exercised on a physical device as part of this test suite.
