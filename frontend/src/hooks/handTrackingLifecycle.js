export function canStartHandTracking({ enabled, videoElement }) {
  return Boolean(enabled && videoElement);
}

export function createVideoRefBinder({ videoRef, setVideoElement }) {
  return (node) => {
    videoRef.current = node;
    setVideoElement(node);
  };
}
