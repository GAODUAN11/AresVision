import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { canStartHandTracking, createVideoRefBinder } from './handTrackingLifecycle.js';
import { createHandGestureState, interpretHandGestureFrame } from './handGestureInterpreter.js';

export default function useHandTracking(enabled = false) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [videoElement, setVideoElement] = useState(null);
  const handLandmarkerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(null);
  const setVideoRef = useCallback(createVideoRefBinder({ videoRef, setVideoElement }), []);

  // 回调 refs，避免闭包陷阱
  const onGestureCb = useRef(null);
  const onLandmarksCb = useRef(null);

  const gestureStateRef = useRef(createHandGestureState());

  // 暴露设置回调的方法
  const setOnGesture = useCallback((cb) => {
    onGestureCb.current = cb;
  }, []);

  const setOnLandmarks = useCallback((cb) => {
    onLandmarksCb.current = cb;
  }, []);

  const initHandLandmarker = useCallback(async () => {
    if (handLandmarkerRef.current) return handLandmarkerRef.current;
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    handLandmarkerRef.current = handLandmarker;
    return handLandmarker;
  }, []);

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, []);

  // 2. 视频流捕捉与处理
  useEffect(() => {
    if (!canStartHandTracking({ enabled, videoElement })) return;
    
    const video = videoElement;

    let isVideoPlaying = false;
    let cancelled = false;
    let loadedDataHandler = null;

    const startCamera = async () => {
      try {
        setError(null);
        setIsReady(false);
        await initHandLandmarker();
        if (cancelled) return;
        setIsReady(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        streamRef.current = stream;
        
        video.muted = true;
        video.playsInline = true;

        loadedDataHandler = async () => {
          try {
            await video.play();
            if (cancelled) return;
            isVideoPlaying = true;
            predictWebcam();
          } catch (e) {
            console.warn('Video play interrupted by browser policy', e);
            setError('摄像头自动播放被阻止，请允许摄像头访问后重试。');
          }
        };

        video.addEventListener('loadeddata', loadedDataHandler, { once: true });
      } catch (err) {
        console.error('Hand tracking startup error:', err);
        setError(`无法启动手势控制：${err.message}`);
      }
    };

    let lastVideoTime = -1;
    const predictWebcam = async () => {
      if (!handLandmarkerRef.current || !isVideoPlaying) return;

      const currentTimeInMs = performance.now();
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        // 检测手势
        const results = handLandmarkerRef.current.detectForVideo(video, currentTimeInMs);

        // 传递渲染用原始关键点坐标
        if (onLandmarksCb.current) {
          onLandmarksCb.current(results.landmarks);
        }

        processGestures(results, currentTimeInMs);
      }

      requestRef.current = requestAnimationFrame(predictWebcam);
    };

    const processGestures = (results, timestamp) => {
      const { events } = interpretHandGestureFrame({
        hands: results.landmarks,
        timestamp,
      }, gestureStateRef.current);
      if (!onGestureCb.current) return;
      events.forEach((event) => onGestureCb.current(event));
    };

    startCamera();

    return () => {
      cancelled = true;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }

      isVideoPlaying = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (loadedDataHandler) {
        video.removeEventListener('loadeddata', loadedDataHandler);
      }
      video.srcObject = null;

      gestureStateRef.current = createHandGestureState();
    };
  }, [enabled, videoElement, initHandLandmarker]);

  return {
    isReady,
    error,
    videoRef, // 如果想要外部看到摄像头画面，可以使用这个 ref，但通常我们会额外绘制关键点，所以对外导出一个绘制组件更合适
    setVideoRef,
    setOnGesture,
    setOnLandmarks
  };
}
