import Foundation
import UIKit
import RoomPlan
import React

@objc(RoomplanView)
class RoomplanViewManager: RCTViewManager {

  override func view() -> UIView! {
    if #available(iOS 16.0, *) {
      return RoomplanView(frame: .zero)
    } else {
      let label = UILabel()
      label.text = "RoomPlan requires iOS 16+"
      label.textAlignment = .center
      label.textColor = .red
      return label
    }
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc func startScanning(_ reactTag: NSNumber) {
    DispatchQueue.main.async { [weak self] in
      guard
        let uiManager = self?.bridge.uiManager,
        let view = uiManager.view(forReactTag: reactTag) as? RoomplanView
      else {
        print("❌ startScanning: View not found for tag \(reactTag)")
        return
      }
      view.startScanning()
    }
  }

  @objc func stopScanning(_ reactTag: NSNumber) {
    DispatchQueue.main.async { [weak self] in
      guard
        let uiManager = self?.bridge.uiManager,
        let view = uiManager.view(forReactTag: reactTag) as? RoomplanView
      else {
        print("❌ stopScanning: View not found for tag \(reactTag)")
        return
      }
      view.stopScanning()
    }
  }

  @objc func exportScanResults(_ reactTag: NSNumber) {
    DispatchQueue.main.async { [weak self] in
      guard
        let uiManager = self?.bridge.uiManager,
        let view = uiManager.view(forReactTag: reactTag) as? RoomplanView
      else {
        print("❌ exportScanResults: View not found for tag \(reactTag)")
        return
      }
      view.exportScanResults()
    }
  }
}

@objc
class RoomplanView: UIView {

  private var roomCaptureView: Any?
  private var captureConfig: Any? = {
    if #available(iOS 16.0, *) {
      return RoomCaptureSession.Configuration()
    }
    return nil
  }()
  private var finalResults: Any?

  override init(frame: CGRect) {
    super.init(frame: frame)
    self.backgroundColor = UIColor(hex: color)

    guard #available(iOS 16.0, *) else { return }
    let rcv = RoomCaptureView(frame: bounds)
    rcv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    rcv.delegate = self
    rcv.captureSession.delegate = self
    addSubview(rcv)
    roomCaptureView = rcv
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  @objc var color: String = "#FFFFFF" {
    didSet {
      let uiColor = UIColor(hex: color)
      backgroundColor = uiColor
      (roomCaptureView as? UIView)?.backgroundColor = uiColor
    }
  }

  @objc func startScanning() {
    guard #available(iOS 16.0, *),
          let rcv = roomCaptureView as? RoomCaptureView,
          let cfg = captureConfig as? RoomCaptureSession.Configuration else {
      print("❌ startScanning failed: Missing view or config")
      return
    }
    rcv.captureSession.run(configuration: cfg)
  }

  @objc func stopScanning() {
    guard #available(iOS 16.0, *),
          let rcv = roomCaptureView as? RoomCaptureView else {
      print("❌ stopScanning failed")
      return
    }
    rcv.captureSession.stop()
  }

  @objc var onExportComplete: RCTDirectEventBlock?
  @objc var onScanFinished: RCTDirectEventBlock?

  @objc func exportScanResults() {
    guard #available(iOS 16.0, *),
          let results = finalResults as? CapturedRoom else {
      print("❌ No scan results to export")
      return
    }

    do {
      let jsonData = try JSONEncoder().encode(results)

      let tmpDir = FileManager.default.temporaryDirectory
      let usdzURL = tmpDir.appending(path: "Room.usdz")
      try results.export(to: usdzURL, exportOptions: .parametric)
      let usdzData = try Data(contentsOf: usdzURL)

      let usdzBase64 = usdzData.base64EncodedString()
      let jsonString = String(data: jsonData, encoding: .utf8) ?? ""

      onExportComplete?([
        "json": jsonString,
        "usdzBase64": usdzBase64,
      ])

    } catch {
      print("❌ Failed to encode/export: \(error)")
    }
  }
}

@available(iOS 16.0, *)
extension RoomplanView: RoomCaptureViewDelegate, RoomCaptureSessionDelegate {
  func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool {
    return true
  }

  func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
    finalResults = processedResult

    if let onScanFinished = onScanFinished {
      do {
        let jsonData = try JSONEncoder().encode(processedResult)
        let jsonString = String(data: jsonData, encoding: .utf8) ?? ""
        onScanFinished(["roomJson": jsonString])
      } catch {
        print("❌ Failed to encode processedResult: \(error)")
        onScanFinished(["roomJson": ""])
      }
    }
  }
}

private extension UIColor {
  convenience init?(hex: String) {
    let s = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard let v = Int(s, radix: 16), s.count == 6 else {
      self.init(white: 1.0, alpha: 1.0)
      return
    }
    self.init(
      red: CGFloat((v >> 16) & 0xFF) / 255.0,
      green: CGFloat((v >> 8) & 0xFF) / 255.0,
      blue: CGFloat(v & 0xFF) / 255.0,
      alpha: 1.0
    )
  }
}
