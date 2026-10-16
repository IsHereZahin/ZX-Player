#import "ZxplayerBrightness.h"

#import <UIKit/UIKit.h>

// iOS brightness is system-wide, so the level seen before ZX Player's first change is
// remembered and restored by resetBrightness (called when playback ends or the app
// leaves the foreground).
static UIScreen *ZxplayerActiveScreen(void)
{
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if ([scene isKindOfClass:UIWindowScene.class] &&
        scene.activationState == UISceneActivationStateForegroundActive) {
      return ((UIWindowScene *)scene).screen;
    }
  }
  return UIScreen.mainScreen;
}

@implementation ZxplayerBrightness {
  CGFloat _originalBrightness;
  BOOL _hasOriginalBrightness;
}

RCT_EXPORT_MODULE()

- (void)getBrightness:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    resolve(@(ZxplayerActiveScreen().brightness));
  });
}

- (void)setBrightness:(double)value
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIScreen *screen = ZxplayerActiveScreen();
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
    ZxplayerActiveScreen().brightness = self->_originalBrightness;
    self->_hasOriginalBrightness = NO;
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeZxplayerBrightnessSpecJSI>(params);
}

@end
