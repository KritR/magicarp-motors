import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";

export interface TelemetryData {
  speed: number;
  rpm: number;
  throttle: number;
  connected: boolean;
  hasData: boolean;
}

const DEFAULT_TELEMETRY: TelemetryData = {
  speed: 0,
  rpm: 0,
  throttle: 0,
  connected: false,
  hasData: false,
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
  const lastMessageTimeRef = useRef<number>(0);
  const dataCheckIntervalRef = useRef<NodeJS.Timeout>();

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

    // Check for stale data every second
    dataCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTimeRef.current;
      // Only consider has data if we received a message within last 2 seconds
      const hasRecentData = lastMessageTimeRef.current > 0 && timeSinceLastMessage < 2000;
      console.log("hasRecentData", hasRecentData);

      setData((prev) => ({
        ...prev,
        hasData: hasRecentData,
      }));
    }, 1000);

    // Connection event handlers
    client.on("connect", () => {
      console.log("Connected to MQTT broker");
      setData((prev) => ({ ...prev, connected: true }));

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
      setData((prev) => ({ ...prev, connected: false }));
    });

    client.on("close", () => {
      console.log("MQTT connection closed");
      setData((prev) => ({ ...prev, connected: false }));
    });

    // Message handler
    client.on("message", (topic: string, payload: Buffer) => {
      try {
        const message: TelemetryMessage = JSON.parse(payload.toString());
        const now = Date.now();
        lastMessageTimeRef.current = now;


        // Update state based on metric type
        setData((prev) => {
          const updates: Partial<TelemetryData> = { hasData: true };

          switch (message.metric) {
            case "SPEED":
              // Apply gear ratio correction: 550/647
              updates.speed = message.value * (550 / 647);
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
      if (dataCheckIntervalRef.current) {
        clearInterval(dataCheckIntervalRef.current);
      }
      if (clientRef.current) {
        clientRef.current.end(true); // Force close
        clientRef.current = null;
      }
    };
  }, []); // Empty dependency array - connect once on mount

  return data;
}
