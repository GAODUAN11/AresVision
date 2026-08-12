export function canStartHandTracking({ enabled, videoElement }) {
  return Boolean(enabled && videoElement);
}

export function isLocalhostOrigin(locationLike = globalThis.location) {
  const hostname = locationLike?.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function getHandTrackingStartupError({
  navigatorLike = globalThis.navigator,
  isSecureContext = globalThis.isSecureContext,
  locationLike = globalThis.location,
} = {}) {
  const hasCameraApi = typeof navigatorLike?.mediaDevices?.getUserMedia === 'function';
  if (hasCameraApi) return null;

  const isHttp = locationLike?.protocol === 'http:';
  if (isHttp && !isSecureContext && !isLocalhostOrigin(locationLike)) {
    return '当前页面不是 HTTPS 安全连接，浏览器不会开放摄像头。请使用 HTTPS 地址访问，或在 localhost 调试。';
  }

  return '当前浏览器或运行环境没有可用的 camera getUserMedia API。请确认摄像头权限、浏览器版本和系统隐私设置。';
}

export function createVideoRefBinder({ videoRef, setVideoElement }) {
  return (node) => {
    videoRef.current = node;
    setVideoElement(node);
  };
}
