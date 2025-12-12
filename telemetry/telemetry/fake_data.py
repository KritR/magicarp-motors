import os
import time
import random
import json
import socket
from dotenv import load_dotenv
from datetime import datetime
import paho.mqtt.client as mqtt

load_dotenv()

broker_host = os.environ.get("MQTT_BROKER_HOST")
if not broker_host or len(broker_host) == 0:
    raise ValueError("MQTT_BROKER_HOST is not set")

broker_port = int(os.environ.get("MQTT_BROKER_PORT", "1883"))
device_id = os.environ.get("DEVICE_ID", socket.gethostname())
keepalive = int(os.environ.get("MQTT_KEEPALIVE", "30"))

drive_id = f"drive-{datetime.today().isoformat()}"
base_topic = f"telemetry/{device_id}"

def now_ms():
    return int(time.time() * 1000)

def make_payload(metric: str, value, tags=None):
    return json.dumps({
        "ts_ms": now_ms(),
        "device": device_id,
        "metric": metric,
        "value": value,
        "tags": tags or {}
    }, separators=(",", ":"))

def on_connect(client, userdata, flags, rc):
    print(f"MQTT connected: {rc}")

def on_disconnect(client, userdata, rc):
    print(f"MQTT disconnected: {rc}")

# Initialize MQTT client
mqtt_client = mqtt.Client(client_id=f"{device_id}-fake", clean_session=True)
mqtt_client.on_connect = on_connect
mqtt_client.on_disconnect = on_disconnect
mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)

class VehicleSimulator:
    """Simulates realistic vehicle telemetry data"""

    def __init__(self):
        # Current vehicle state
        self.speed = 0.0  # km/h
        self.rpm = 750.0  # idle RPM
        self.throttle = 0.0  # 0-100%
        self.coolant_temp = 85.0  # °C (normal operating temp)

        # Driving mode state
        self.mode = "idle"  # idle, accelerating, cruising, decelerating
        self.mode_timer = 0

    def update(self):
        """Update vehicle state based on current mode"""

        # Randomly change driving modes
        self.mode_timer += 1
        if self.mode_timer > random.randint(5, 20):
            self.mode_timer = 0
            self.mode = random.choice([
                "idle", "idle",  # More likely to idle
                "accelerating",
                "cruising", "cruising",  # More likely to cruise
                "decelerating"
            ])

        # Update based on current mode
        if self.mode == "idle":
            self._idle()
        elif self.mode == "accelerating":
            self._accelerate()
        elif self.mode == "cruising":
            self._cruise()
        elif self.mode == "decelerating":
            self._decelerate()

        # Add realistic noise
        self._add_noise()

        # Ensure values stay within realistic bounds
        self._enforce_limits()

    def _idle(self):
        """Vehicle is idling (stopped or nearly stopped)"""
        self.throttle = max(0, self.throttle - 5)
        self.speed = max(0, self.speed - 2)

        # Idle RPM with small variations
        if self.speed < 5:
            self.rpm = 750 + random.uniform(-50, 50)
        else:
            # Coasting down
            self.rpm = max(750, self.rpm - 100)

    def _accelerate(self):
        """Vehicle is accelerating"""
        # Increase throttle
        self.throttle = min(100, self.throttle + random.uniform(5, 15))

        # Speed increases with throttle (but not instantly)
        speed_increase = self.throttle * 0.05
        self.speed = min(self.speed + speed_increase, 140)

        # RPM correlates with speed and throttle
        # Typical gear ratios: speed/RPM ratio varies, but roughly:
        # 1st gear: 0-30 km/h, high RPM
        # 2nd gear: 20-60 km/h
        # 3rd gear: 40-90 km/h
        # 4th/5th gear: 60+ km/h, lower RPM

        if self.speed < 30:
            # Low gear, high RPM
            target_rpm = 2000 + (self.speed / 30) * 3000
        elif self.speed < 60:
            # Medium gear
            target_rpm = 2000 + (self.speed / 60) * 2000
        else:
            # High gear, lower RPM relative to speed
            target_rpm = 2000 + (self.speed / 140) * 2500

        # Add throttle influence
        target_rpm += self.throttle * 10

        # Smooth RPM transition
        self.rpm += (target_rpm - self.rpm) * 0.3

    def _cruise(self):
        """Vehicle is cruising at steady speed"""
        # Maintain throttle around 20-40%
        target_throttle = 30 + random.uniform(-10, 10)
        self.throttle += (target_throttle - self.throttle) * 0.2

        # Small speed variations
        self.speed += random.uniform(-1, 1)

        # Maintain RPM based on cruising speed
        if self.speed < 40:
            target_rpm = 1500
        elif self.speed < 80:
            target_rpm = 2000
        else:
            target_rpm = 2500

        self.rpm += (target_rpm - self.rpm) * 0.2

    def _decelerate(self):
        """Vehicle is decelerating"""
        # Release throttle
        self.throttle = max(0, self.throttle - 10)

        # Slow down
        self.speed = max(0, self.speed - random.uniform(3, 8))

        # RPM decreases but stays above idle when moving
        if self.speed > 10:
            target_rpm = 1200 + (self.speed / 140) * 1500
            self.rpm += (target_rpm - self.rpm) * 0.3
        else:
            # Approaching idle
            self.rpm += (750 - self.rpm) * 0.2

    def _add_noise(self):
        """Add realistic sensor noise"""
        self.rpm += random.uniform(-20, 20)
        self.speed += random.uniform(-0.5, 0.5)
        self.throttle += random.uniform(-1, 1)

        # Coolant temp slowly varies around operating temperature
        self.coolant_temp += random.uniform(-0.2, 0.2)

    def _enforce_limits(self):
        """Keep all values within realistic bounds"""
        self.speed = max(0, min(140, self.speed))  # Max ~140 km/h
        self.rpm = max(600, min(6500, self.rpm))  # Typical RPM range
        self.throttle = max(0, min(100, self.throttle))  # 0-100%
        self.coolant_temp = max(75, min(105, self.coolant_temp))  # Normal operating range

    def get_telemetry(self):
        """Return current telemetry data"""
        return {
            "RPM": round(self.rpm, 1),
            "SPEED": round(self.speed, 1),
            "THROTTLE_POS": round(self.throttle, 1),
            "COOLANT_TEMP": round(self.coolant_temp, 1)
        }


def start(interval = 0.1):
    """
    Start generating and pushing fake telemetry data

    Args:
        interval: Time in seconds between data points (default: 1.0)
    """
    print(f"Starting fake data generator for drive: {drive_id}")
    print(f"Publishing to MQTT broker at {broker_host}:{broker_port}")
    print(f"Interval: {interval} seconds")
    print("Press Ctrl+C to stop\n")

    # Connect to MQTT broker
    mqtt_client.connect_async(broker_host, broker_port, keepalive)
    mqtt_client.loop_start()

    simulator = VehicleSimulator()

    try:
        while True:
            # Update simulator state
            simulator.update()

            # Get current telemetry
            telemetry = simulator.get_telemetry()

            # Publish to MQTT
            for metric_name, value in telemetry.items():
                topic = f"{base_topic}/{metric_name}"
                payload = make_payload(metric_name, value, {"drive": drive_id})
                mqtt_client.publish(topic, payload=payload, qos=0, retain=False)

            # Print current state
            print(f"[{simulator.mode:12}] RPM: {telemetry['RPM']:6.1f} | "
                  f"Speed: {telemetry['SPEED']:5.1f} km/h | "
                  f"Throttle: {telemetry['THROTTLE_POS']:5.1f}% | "
                  f"Coolant: {telemetry['COOLANT_TEMP']:5.1f}°C")

            time.sleep(interval)

    except KeyboardInterrupt:
        print("\n\nStopping fake data generator...")
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("Disconnected from MQTT")


if __name__ == "__main__":
    # Run with 1 second interval by default
    # You can change this to make data more/less frequent
    start(interval=0.2)
