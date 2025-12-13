from signal import signal
from typing import List
import obd
import os
import asyncio
import json
import time
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

commands: List[obd.OBDCommand] = [
  obd.commands.RPM,
  obd.commands.THROTTLE_POS,
  obd.commands.SPEED,
]

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
mqtt_client = mqtt.Client(client_id=f"{device_id}-pub", clean_session=True)
mqtt_client.on_connect = on_connect
mqtt_client.on_disconnect = on_disconnect
mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)

def create_mqtt_callback(command: obd.OBDCommand):
  def callback(response):
    if response.value is None or not isinstance(response.value, obd.Unit.Quantity):
      return
    val = response.value.magnitude

    topic = f"{base_topic}/{command.name}"
    payload = make_payload(command.name, val, {"drive": drive_id})
    mqtt_client.publish(topic, payload=payload, qos=0, retain=False)
    print(f"published {command.name}={val} to MQTT")

  return callback

async def start():
  # Connect to MQTT broker
  mqtt_client.connect_async(broker_host, broker_port, keepalive)
  mqtt_client.loop_start()

  print("connecting to obd2 port")
  connection = obd.Async(
    delay_cmds=0,
    fast=True,
  )

  if not connection.is_connected():
    print("connection failed")
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    return

  print(f"connected using {connection.protocol_name()}, listing available commands: ")
  print(connection.print_commands())

  for command in commands:
    print(f"watching {command.name}")
    connection.watch(command, callback=create_mqtt_callback(command))

  connection.start()

  loop = asyncio.get_running_loop()
  stop_event = asyncio.Event()

  def signal_handler():
    print("\nStopping...")
    stop_event.set()

  for sig in ('SIGINT', 'SIGTERM'):
    loop.add_signal_handler(getattr(signal, sig), signal_handler)

  try:
    await stop_event.wait()
  finally:
    connection.stop()
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    print("Disconnected from MQTT")

asyncio.run(start())
