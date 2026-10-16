#import "PlayzBrightness.h"

#import <UIKit/UIKit.h>

// iOS brightness is system-wide, so the level seen before Play-Z's first change is
// remembered and restored by resetBrightness (called when playback ends or the app
// leaves the foreground).
static UIScreen *PlayzActiveScreen(void)
{
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if ([scene isKindOfClass:UIWindowScene.class] &&
        scene.activationState == UISceneActivationStateForegroundActive) {
      return ((UIWindowScene *)scene).screen;
    }
  }
  return UIScreen.mainScreen;
}

@implementation PlayzBrightness {
  CGFloat _originalBrightness;
  BOOL _hasOriginalBrightness;
}

RCT_EXPORT_MODULE()

- (void)getBrightness:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve(@(PlayzActiveScreen().brightness));
  });
}

- (void)setBrightness:(double)value
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIScreen *screen = PlayzActiveScreen();
    if (!self->_hasOriginalBrightness) {
      self->_originalBrightness = screen.brightness;
      self->_hasOriginalBrightness = YES;
    }
    screen.brightness = MIN(MAX(value, 0.0), 1.0);
  });
}

- (void)resetBrightness
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self->_hasOriginalBrightness) {
      return;
    }
    PlayzActiveScreen().brightness = self->_originalBrightness;
    self->_hasOriginalBrightness = NO;
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativePlayzBrightnessSpecJSI>(params);
}

@end
