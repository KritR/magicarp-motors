import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";

export interface TelemetryData {
  speed: number;
  rpm: number;
  throttle: number;
  latency?: number; // End-to-end latency in ms
}

const DEFAULT_TELEMETRY: TelemetryData = {
  speed: 0,
  rpm: 0,
  throttle: 0,
};

const MQTT_CONFIG = {
  host: "magicarp.krithikrao.com",
  port: 9001, // WebSocket port
  protocol: "ws" as const,
  topic: "telemetry/#",
  maxMessageAge: 1000, // Drop messages older than 1 second
};

interface TelemetryMessage {
  ts_ms: number;
  device: string;
  metric: string;
  value: number;
  tags?: Record<string, string>;
}

export function useTelemetry(): TelemetryData {
  const [data, setData] = useState<TelemetryData>(DEFAULT_TELEMETRY);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  useEffect(() => {
    const { host, port, protocol, topic, maxMessageAge } = MQTT_CONFIG;

    // Generate unique client ID
    const clientId = `web_${Math.random().toString(16).slice(2, 10)}`;

    console.log(`Connecting to MQTT broker at ${protocol}://${host}:${port}`);

    // Connect to MQTT broker via WebSocket
    const client = mqtt.connect(`${protocol}://${host}:${port}`, {
      clientId,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    clientRef.current = client;

    // Connection event handlers
    client.on("connect", () => {
      console.log("Connected to MQTT broker");
      setConnectionStatus("connected");

      // Subscribe to telemetry topics with QoS 0
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          console.error("Subscription error:", err);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    });

    client.on("error", (error) => {
      console.error("MQTT connection error:", error);
      setConnectionStatus("disconnected");
    });

    client.on("close", () => {
      console.log("MQTT connection closed");
      setConnectionStatus("disconnected");
    });

    // Message handler
    client.on("message", (topic: string, payload: Buffer) => {
      try {
        const message: TelemetryMessage = JSON.parse(payload.toString());
        const now = Date.now();

        // Calculate end-to-end latency
        const latency = now - message.ts_ms;

        // Drop messages older than maxMessageAge
        if (latency > maxMessageAge) {
          console.warn(`Dropped stale message: ${topic} (${latency}ms old)`);
          return;
        }

        // Update state based on metric type
        setData((prev) => {
          const updates: Partial<TelemetryData> = { latency };

          switch (message.metric) {
            case "SPEED":
              updates.speed = Math.floor(message.value);
              break;
            case "RPM":
              updates.rpm = Math.floor(message.value);
              break;
            case "THROTTLE_POS":
              updates.throttle = Math.floor(message.value);
              break;
            default:
              return prev; // Unknown metric, don't update
          }

          return { ...prev, ...updates };
        });
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    });

    // Cleanup on unmount
    return () => {
      console.log("Disconnecting from MQTT broker");
      if (clientRef.current) {
        clientRef.current.end(true); // Force close
        clientRef.current = null;
      }
    };
  }, []); // Empty dependency array - connect once on mount

  return data;
}
