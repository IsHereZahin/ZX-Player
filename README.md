# ZX Player

Offline local video player for Android and iOS, built with React Native (New Architecture), TypeScript, `react-native-video` and `react-native-gesture-handler`.

- **App name:** ZX Player
- **Bundle / application ID:** `com.isherezahin.zxplayer`

## Features

- **Library scanner.** Lists folders from the device media library (Android MediaStore buckets, iOS Photos albums), plus an "All videos" entry. Folders open into a paginated video list with thumbnails, duration, size and resolution.
- **Permissions.** Android 13+ granular video access, Android 14+ partial ("selected videos") access, and the legacy storage permission on Android 12 and below. iOS uses Photos read access. Denied and blocked states link to Settings.
- **Player.** Play/pause, ±10 s skip, a scrub bar (tap to jump, drag to preview, release to seek), aspect modes, landscape lock, auto-hiding controls, buffering and error states with retry. Playback pauses when the app goes to the background.
- **Gestures**

  | Gesture                        | Action                                                              |
  | ------------------------------ | ------------------------------------------------------------------- |
  | Vertical drag, left half       | Screen brightness                                                   |
  | Vertical drag, right half      | Media volume (system HUD suppressed)                                |
  | Horizontal drag                | Seek with a live `+0:45 · 2:25 / 10:00` overlay; applied on release |
  | Double tap, left / right third | Skip −10 s / +10 s                                                  |
  | Double tap, centre             | Play / pause                                                        |
  | Single tap                     | Show / hide controls                                                |

- **Aspect modes** (cycle with the top-bar button)

  | Mode    | Behaviour                                      |
  | ------- | ---------------------------------------------- |
  | Fit     | Whole frame visible, letter/pillar-boxed       |
  | Fill    | Fills the screen, aspect kept, edges trimmed   |
  | Crop    | Native pixel size (100 %), centred and cropped |
  | Stretch | Fills the screen exactly, aspect ignored       |

  "Fill" and "Crop" mean the same thing in most players, so Crop shows the video at its native size to keep the four modes distinct.

- **Subtitles.** Load `.srt`, `.ass` or `.ssa` files through the system file picker. ZX Player parses them itself and renders them identically on both platforms. ASS styling and positioning are dropped and vector drawings are skipped. Files must be UTF-8.

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
  app/                      App root, navigation (native stack) and route types
  features/
    library/                Media scanning, permissions, thumbnails, folder and video lists
      services/             camera-roll adapter, permission flow, thumbnail queue
      hooks/  components/  screens/
    player/
      subtitles/            SRT / ASS parsers and time-indexed cue lookup (pure TS)
      utils/                Aspect-ratio frames and gesture maths (pure TS)
      hooks/                Playback state, gestures, brightness, volume, subtitles
      components/  screens/
  shared/                   Theme, logger, reusable components, hooks, utilities
  test/                     Fixtures (mock media library, sample subtitles), test helpers
modules/zxplayer-brightness/   In-repo TurboModule for screen brightness (Kotlin + Obj-C++)
__mocks__/                  Jest mocks for every native module
```

### Native dependencies

| Package                                       | Used for                                              |
| --------------------------------------------- | ----------------------------------------------------- |
| `react-native-video`                          | Playback (ExoPlayer / AVPlayer)                       |
| `react-native-gesture-handler` (v3 hooks API) | Player and scrub-bar gestures                         |
| `@react-native-camera-roll/camera-roll`       | Media scanning; iOS `ph://` thumbnails                |
| `react-native-create-thumbnail`               | Android video thumbnails (disk-cached)                |
| `react-native-volume-manager`                 | Media volume without the system HUD                   |
| `@react-native-documents/picker`              | Picking subtitle files                                |
| `zxplayer-brightness` (local)                    | Window brightness (Android) / screen brightness (iOS) |

Brightness on Android uses a window override, so it only affects ZX Player and needs no `WRITE_SETTINGS` permission. On iOS brightness is device-wide, so the original level is restored when the player closes or the app is backgrounded.

## Testing

`npm test` runs the pure logic tests (subtitle parsers, cue lookup, aspect frames, gesture maths, formatting, task queue), the service tests (permission flows per Android API level and iOS, media mapping, thumbnail caching, subtitle file loading) and the screen integration tests. Gestures are driven through gesture-handler's `createGestureController`; native modules are replaced by the mocks in `__mocks__/`.

## Known limitations

- Subtitle files are read as UTF-8; other encodings (e.g. Windows-1252) show garbled characters.
- Only videos indexed by the system media library are listed. On iOS that means the Photos library, not files stored in the Files app.
- Android groups folders by bucket name, so two folders that share a name appear as one.
- There is no resume-position memory between sessions.
