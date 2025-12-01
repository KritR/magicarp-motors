import { useEffect, useState, useCallback, useRef } from "react";
import { InfluxDB } from "@influxdata/influxdb-client";

export interface TelemetryData {
  speed: number;
  rpm: number;
  throttle: number;
}

const DEFAULT_TELEMETRY: TelemetryData = {
  speed: 0,
  rpm: 0,
  throttle: 0,
};

const INFLUX_CONFIG = {
  url: "http://136.119.147.212:8086",
  token: "BrlRIQ9TWCyi_ITxudlr5joz4nnjp1v5_eYMC-Wm8twjWbaSPT3ht6qCRM23Tx9ccjCaUdLMeoR5fENtYQPk3Q==",
  org: "magicarpmotors",
  bucket: "obdcarp",
};

export function useTelemetry(pollInterval: number): TelemetryData {
  const [data, setData] = useState<TelemetryData>(DEFAULT_TELEMETRY);
  const queryApiRef = useRef<ReturnType<InfluxDB["getQueryApi"]> | null>(null);

  useEffect(() => {
    const { url, token, org } = INFLUX_CONFIG;
    const client = new InfluxDB({ url, token });
    queryApiRef.current = client.getQueryApi(org);
  }, []);

  const fetchLatestData = useCallback(async () => {
    if (!queryApiRef.current) return;

    const { bucket } = INFLUX_CONFIG;
    const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: -5s)
        |> filter(fn: (r) => r._measurement == "RPM" or r._measurement == "THROTTLE_POS" or r._measurement == "SPEED")
        |> filter(fn: (r) => r._field == "value")
        |> last()
    `;

    try {
      const newData: Partial<TelemetryData> = {};

      for await (const { values, tableMeta } of queryApiRef.current.iterateRows(fluxQuery)) {
        const row = tableMeta.toObject(values);
        const measurement = row._measurement as string;
        const value = row._value as number;

        if (measurement === "SPEED") newData.speed = Math.floor(value);
        else if (measurement === "RPM") newData.rpm = Math.floor(value);
        else if (measurement === "THROTTLE_POS") newData.throttle = Math.floor(value);
      }

      if (Object.keys(newData).length > 0) {
        setData(prev => ({
          speed: newData.speed ?? prev.speed,
          rpm: newData.rpm ?? prev.rpm,
          throttle: newData.throttle ?? prev.throttle,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch telemetry from InfluxDB:", error);
    }
  }, []);

  useEffect(() => {
    fetchLatestData();
    const timer = setInterval(fetchLatestData, pollInterval);
    return () => clearInterval(timer);
  }, [fetchLatestData, pollInterval]);

  return data;
}

