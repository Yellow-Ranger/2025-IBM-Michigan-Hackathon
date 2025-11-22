import ExpoModulesCore
import QuickLook

public class USDZViewerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("USDZViewer")

    AsyncFunction("previewUSDZ") { (fileUrl: String, promise: Promise) in
      DispatchQueue.main.async {
        guard let url = URL(string: fileUrl) else {
          promise.reject("INVALID_URL", "Invalid file URL")
          return
        }

        // Check if file exists
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: url.path) else {
          promise.reject("FILE_NOT_FOUND", "USDZ file not found at path: \(url.path)")
          return
        }

        guard let rootViewController = UIApplication.shared.keyWindow?.rootViewController else {
          promise.reject("NO_ROOT_VC", "Cannot find root view controller")
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
          promise.resolve(true)
        }
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
