#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(USDZViewerModule, NSObject)

RCT_EXTERN_METHOD(previewUSDZ:(NSString *)fileUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
