#import <Foundation/Foundation.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(RoomplanView, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(color, NSString)

RCT_EXTERN_METHOD(startScanning:(nonnull NSNumber *)reactTag)
RCT_EXTERN_METHOD(stopScanning:(nonnull NSNumber *)reactTag)
RCT_EXTERN_METHOD(exportScanResults:(nonnull NSNumber *)reactTag)
RCT_EXPORT_VIEW_PROPERTY(onExportComplete, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onScanFinished, RCTDirectEventBlock)

@end
