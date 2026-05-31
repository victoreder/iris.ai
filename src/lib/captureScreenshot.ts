import { domToBlob } from "modern-screenshot";

function getCaptureTarget(): HTMLElement {
  return document.getElementById("root") ?? document.body;
}

function shouldIncludeNode(node: Node): boolean {
  if (node instanceof Element && node.getAttribute("data-screenshot-ignore") === "true") {
    return false;
  }
  return true;
}

export async function capturePageScreenshot(): Promise<Blob | null> {
  try {
    const target = getCaptureTarget();
    const blob = await domToBlob(target, {
      scale: Math.min(window.devicePixelRatio, 2),
      backgroundColor: "#f8f9fc",
      filter: shouldIncludeNode,
    });
    return blob;
  } catch (err) {
    console.warn("Falha ao capturar screenshot:", err);
    return null;
  }
}
