/** Objective photo measurements from OpenCV and the YOLOv8 leaf detector (ml-service /vision/analyze). */
export interface VisionReport {
  quality: { sharpness: number; brightness: number; issues: ("blurry" | "too_dark" | "too_bright" | "harsh_light")[]; ok: boolean };
  /** Boxes are normalised [x, y, width, height] in 0..1 of the photo. */
  detections: { label: string; confidence: number; box: [number, number, number, number] }[];
  colour: { green: number; yellow: number; brown: number; pale: number; spots: number; scope: "leaves" | "frame" } | null;
  model: string;
}

/** Detections the leaf model is reasonably sure of; lower scores are too noisy to show or pass on. */
export const CONFIDENT_DETECTION = 0.6;
