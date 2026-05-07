function waitFor<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(`${label} took too long`)), ms);
    promise.then((value) => { window.clearTimeout(id); resolve(value); }, (err) => { window.clearTimeout(id); reject(err); });
  });
}

// Fast frame extraction from a video File. Returns compact base64 data URLs.
// Mobile-safe: small frames, seek timeouts, and fallback captures avoid raw upload errors.
export async function extractFrames(file: File, count = 4, maxWidth = 384): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // iOS Safari needs a load tick before metadata fires reliably
  video.load();

  await waitFor(new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Could not read video"));
  }), 8000, "Video loading");

  const duration = video.duration || 0;
  if (!isFinite(duration) || duration <= 0) {
    URL.revokeObjectURL(url);
    throw new Error("Invalid video duration");
  }

  // Cap at 15 seconds analyzed even if upload is longer
  const analyzedDuration = Math.min(duration, 15);

  const w = Math.min(maxWidth, video.videoWidth || maxWidth);
  const h = Math.round(((video.videoHeight || 1) / (video.videoWidth || 1)) * w);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = (analyzedDuration * (i + 0.5)) / count;
    try {
      await waitFor(new Promise<void>((res) => {
        const onSeek = () => { video.removeEventListener("seeked", onSeek); res(); };
        video.addEventListener("seeked", onSeek, { once: true });
        video.currentTime = Math.max(0, Math.min(t, analyzedDuration - 0.08));
      }), 3500, "Frame capture");
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas.toDataURL("image/jpeg", 0.45));
    } catch {
      if (frames.length === 0) {
        ctx.drawImage(video, 0, 0, w, h);
        frames.push(canvas.toDataURL("image/jpeg", 0.45));
      }
    }
  }

  URL.revokeObjectURL(url);
  return frames;
}

// Compress a photo File into a single base64 data URL (for static-pose form check).
export async function photoToFrame(file: File, maxWidth = 720): Promise<string> {
  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    image = await waitFor(new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read photo")); };
      img.src = url;
    }), 8000, "Photo loading");
  }
  const width = "width" in image ? image.width : maxWidth;
  const height = "height" in image ? image.height : maxWidth;
  const w = Math.min(maxWidth, width);
  const h = Math.round((height / Math.max(1, width)) * w);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, w, h);
  if ("close" in image) image.close();
  return canvas.toDataURL("image/jpeg", 0.62);
}
