// Fast frame extraction from a video File. Returns base64 data URLs.
// Optimized for speed: fewer frames, smaller width, lower JPEG quality.
export async function extractFrames(file: File, count = 6, maxWidth = 480): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // iOS Safari needs a load tick before metadata fires reliably
  video.load();

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Could not read video"));
  });

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
    await new Promise<void>((res) => {
      const onSeek = () => { video.removeEventListener("seeked", onSeek); res(); };
      video.addEventListener("seeked", onSeek);
      video.currentTime = Math.min(t, analyzedDuration - 0.05);
    });
    ctx.drawImage(video, 0, 0, w, h);
    frames.push(canvas.toDataURL("image/jpeg", 0.55));
  }

  URL.revokeObjectURL(url);
  return frames;
}

// Compress a photo File into a single base64 data URL (for static-pose form check).
export async function photoToFrame(file: File, maxWidth = 720): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const w = Math.min(maxWidth, bitmap.width);
  const h = Math.round((bitmap.height / bitmap.width) * w);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.7);
}
