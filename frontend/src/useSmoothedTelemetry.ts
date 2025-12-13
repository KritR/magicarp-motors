import { useEffect, useState, useRef } from "react";
import { useTelemetry } from "./use-telemetry";

interface SmoothedTelemetryData {
  speed: number;
  rpm: number;
  throttle: number;
  connected: boolean;
}

export function useSmoothedTelemetry(): SmoothedTelemetryData {
  const rawData = useTelemetry();
  const [smoothedData, setSmoothedData] = useState<SmoothedTelemetryData>({
    speed: rawData.speed,
    rpm: rawData.rpm,
    throttle: rawData.throttle,
    connected: rawData.connected,
  });

  const targetRef = useRef({ ...rawData });
  const currentRef = useRef({ ...rawData });
  const lastUpdateRef = useRef(Date.now());
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Update target when raw data changes
    targetRef.current = {
      ...rawData,
    };
    lastUpdateRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;

      // Interpolate over ~200ms for smooth updates
      const smoothingDuration = 500;
      const progress = Math.min(elapsed / smoothingDuration, 1);

      // Ease-out function for smoother deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      const current = currentRef.current;
      const target = targetRef.current;

      // Interpolate each value
      current.speed = current.speed + (target.speed - current.speed) * easeProgress;
      current.rpm = current.rpm + (target.rpm - current.rpm) * easeProgress;
      current.throttle = current.throttle + (target.throttle - current.throttle) * easeProgress;

      setSmoothedData({
        speed: Math.round(current.speed * 100) / 100, // 2 decimals
        rpm: Math.round(current.rpm), // Nearest integer
        throttle: Math.round(current.throttle), // Nearest integer
        connected: rawData.connected,
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rawData.speed, rawData.rpm, rawData.throttle]);

  return smoothedData;
}
