import puppeteer from "puppeteer";
import mqtt from "mqtt";

const RACE_ID = "162005";
const API_URL = `http://api.race-monitor.com/Timing/?raceid=${RACE_ID}&source=www.race-monitor.com`;
const REFRESH_INTERVAL = 60000; // 1 minute

// MQTT Configuration
const MQTT_BROKER_HOST = "magicarp.krithikrao.com";
const MQTT_BROKER_PORT = 1883;
const DEVICE_ID = "race-monitor";
const BASE_TOPIC = `telemetry/${DEVICE_ID}`;

interface MagicarpData {
  lastTime: string;
  bestTime: string;
  laps: string;
  position: string;
  totalCars: number;
}

interface TelemetryMessage {
  ts_ms: number;
  device: string;
  metric: string;
  value: number | string;
  tags: Record<string, string>;
}

function nowMs(): number {
  return Date.now();
}

function makePayload(metric: string, value: number | string, tags: Record<string, string> = {}): string {
  const payload: TelemetryMessage = {
    ts_ms: nowMs(),
    device: DEVICE_ID,
    metric,
    value,
    tags: { race_id: RACE_ID, ...tags },
  };
  return JSON.stringify(payload);
}

async function fetchRaceTiming(page: any): Promise<MagicarpData | null> {
  try {
    await page.goto(API_URL, { waitUntil: "networkidle2" });

    // Wait for the React app to render
    await page.waitForSelector("#root", { timeout: 10000 });

    // Give it a bit more time for data to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the rendered content and parse for Magicarp Motors
    const magicarpData = await page.evaluate(() => {
      const root = document.getElementById("root");
      if (!root) return null;

      const text = root.innerText;
      const lines = text.split("\n");

      // Find Magicarp Motors line
      let magicarpIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Magicarp Motors")) {
          magicarpIndex = i;
          break;
        }
      }

      if (magicarpIndex === -1) return null;

      // Extract data - position is typically a few lines before
      let position = "N/A";
      for (let i = Math.max(0, magicarpIndex - 5); i < magicarpIndex; i++) {
        if (lines[i].match(/^\d+$/)) {
          position = lines[i];
        }
      }

      // Count total number of cars by finding all position numbers
      let totalCars = 0;
      for (let i = 0; i < lines.length; i++) {
        // Look for lines that are just numbers (positions) followed by car info
        if (lines[i].match(/^\d+$/) && lines[i + 1]?.includes("#")) {
          const pos = parseInt(lines[i]);
          if (pos > totalCars) {
            totalCars = pos;
          }
        }
      }

      // Extract laps, last time, and best time from surrounding lines
      let lastTime = "N/A";
      let bestTime = "N/A";
      let laps = "N/A";

      for (let i = magicarpIndex; i < Math.min(lines.length, magicarpIndex + 20); i++) {
        const line = lines[i].trim();

        if (lines[i - 1]?.includes("Last Time:")) {
          lastTime = line;
        } else if (lines[i - 1]?.includes("Best Time:")) {
          bestTime = line;
        } else if (lines[i - 1]?.includes("Laps:")) {
          laps = line;
        }
      }

      return { lastTime, bestTime, laps, position, totalCars };
    });

    return magicarpData;
  } catch (error) {
    console.error(`Error fetching data: ${error}`);
    return null;
  }
}

function clearConsole() {
  console.clear();
}

function publishToMqtt(mqttClient: mqtt.MqttClient, data: MagicarpData | null) {
  if (!data || !mqttClient.connected) return;

  // Publish position (numeric)
  const position = parseInt(data.position);
  if (!isNaN(position)) {
    const topic = `${BASE_TOPIC}/POSITION`;
    const payload = makePayload("POSITION", position, { total_cars: data.totalCars.toString() });
    mqttClient.publish(topic, payload, { qos: 0 });
    console.log(`📡 Published POSITION=${position} to MQTT`);
  }

  // Publish laps (numeric)
  const laps = parseInt(data.laps);
  if (!isNaN(laps)) {
    const topic = `${BASE_TOPIC}/LAPS`;
    const payload = makePayload("LAPS", laps);
    mqttClient.publish(topic, payload, { qos: 0 });
    console.log(`📡 Published LAPS=${laps} to MQTT`);
  }

  // Publish last lap time (string)
  if (data.lastTime && data.lastTime !== "N/A") {
    const topic = `${BASE_TOPIC}/LAST_LAP_TIME`;
    const payload = makePayload("LAST_LAP_TIME", data.lastTime);
    mqttClient.publish(topic, payload, { qos: 0 });
    console.log(`📡 Published LAST_LAP_TIME=${data.lastTime} to MQTT`);
  }

  // Publish best lap time (string)
  if (data.bestTime && data.bestTime !== "N/A") {
    const topic = `${BASE_TOPIC}/BEST_LAP_TIME`;
    const payload = makePayload("BEST_LAP_TIME", data.bestTime);
    mqttClient.publish(topic, payload, { qos: 0 });
    console.log(`📡 Published BEST_LAP_TIME=${data.bestTime} to MQTT`);
  }
}

function displayRaceTiming(data: MagicarpData | null, updateCount: number) {
  clearConsole();

  console.log("=".repeat(60));
  console.log("           MAGICARP MOTORS - LIVE TIMING");
  console.log("=".repeat(60));
  console.log();
  console.log(`Race ID: ${RACE_ID}`);
  console.log(`Last Update: ${new Date().toLocaleString()}`);
  console.log(`Update #${updateCount}`);
  console.log();

  if (!data) {
    console.log("⚠️  Could not find Magicarp Motors data");
  } else {
    console.log("─".repeat(60));
    console.log(`Position:        ${data.position} / ${data.totalCars}`);
    console.log(`Laps:            ${data.laps}`);
    console.log();
    console.log(`Last Lap Time:   ${data.lastTime}`);
    console.log(`Best Lap Time:   ${data.bestTime}`);
    console.log("─".repeat(60));
  }

  console.log();
  console.log(`Next update in ${REFRESH_INTERVAL / 1000} seconds...`);
  console.log("=".repeat(60));
}

async function startMonitoring() {
  let updateCount = 0;

  console.log("Starting Race Monitor...");

  // Connect to MQTT broker
  console.log(`Connecting to MQTT broker at ${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}...`);
  const mqttClient = mqtt.connect(`mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`, {
    clientId: `${DEVICE_ID}-${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  mqttClient.on("connect", () => {
    console.log("✅ Connected to MQTT broker");
  });

  mqttClient.on("error", (error) => {
    console.error("❌ MQTT connection error:", error.message);
  });

  mqttClient.on("close", () => {
    console.log("MQTT connection closed");
  });

  console.log("Launching headless browser...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  console.log(`Fetching from: ${API_URL}`);
  console.log(`Refresh interval: ${REFRESH_INTERVAL / 1000} seconds`);
  console.log();

  // Initial fetch
  const initialData = await fetchRaceTiming(page);
  updateCount++;
  displayRaceTiming(initialData, updateCount);
  publishToMqtt(mqttClient, initialData);

  // Set up periodic refresh
  setInterval(async () => {
    const data = await fetchRaceTiming(page);
    updateCount++;
    displayRaceTiming(data, updateCount);
    publishToMqtt(mqttClient, data);
  }, REFRESH_INTERVAL);

  // Handle cleanup on exit
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    mqttClient.end();
    await browser.close();
    process.exit(0);
  });
}

// Start the monitoring
startMonitoring();