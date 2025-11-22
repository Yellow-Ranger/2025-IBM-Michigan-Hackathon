import Foundation
import React
import QuickLook

@objc(USDZViewerModule)
class USDZViewerModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc func previewUSDZ(_ fileUrl: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let url = URL(string: fileUrl) else {
        reject("INVALID_URL", "Invalid file URL", nil)
        return
      }

      // Check if file exists
      let fileManager = FileManager.default
      guard fileManager.fileExists(atPath: url.path) else {
        reject("FILE_NOT_FOUND", "USDZ file not found at path: \(url.path)", nil)
        return
      }

      guard let rootViewController = UIApplication.shared.windows.first?.rootViewController else {
        reject("NO_ROOT_VC", "Cannot find root view controller", nil)
        return
      }

      let previewController = QLPreviewController()
      let dataSource = USDZPreviewDataSource(fileURL: url)
      previewController.dataSource = dataSource

      // Store data source to prevent deallocation
      objc_setAssociatedObject(
        previewController,
        &AssociatedKeys.dataSource,
        dataSource,
        .OBJC_ASSOCIATION_RETAIN_NONATOMIC
      )

      rootViewController.present(previewController, animated: true) {
        resolve(true)
      }
    }
  }
}

private struct AssociatedKeys {
  static var dataSource = "dataSource"
}

class USDZPreviewDataSource: NSObject, QLPreviewControllerDataSource {
  let fileURL: URL

  init(fileURL: URL) {
    self.fileURL = fileURL
  }

  func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    return 1
  }

  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
    return fileURL as QLPreviewItem
  }
}
