// Detection worker (docs/06 §2): receives transferred ImageBitmaps, decodes barcodes and QR codes off the
// main thread, and posts back only the values and boxes. Nothing here touches the network except loading
// our own self-hosted wasm.
import { createDetectionHandler } from "../platform/detectors/detection-handler";
import { workerFactories } from "../platform/detectors/engines";
import type { FromWorker, ToWorker } from "../platform/detectors/protocol";

const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  addEventListener(type: "message", listener: (event: MessageEvent<ToWorker>) => void): void;
};

const handle = createDetectionHandler(workerFactories, (message) => scope.postMessage(message));

scope.addEventListener("message", (event) => {
  void handle(event.data);
});
