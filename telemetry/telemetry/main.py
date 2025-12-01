from typing import List
import obd
import os
import time
from dotenv import load_dotenv
import influxdb_client
from influxdb_client import Point
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime

load_dotenv()

token = os.environ.get("INFLUXDB_TOKEN")
if not token or len(token) == 0:
  raise ValueError("INFLUXDB_TOKEN is not set")

org = os.environ.get("INFLUXDB_ORG")
if not org or len(org) == 0:
  raise ValueError("INFLUXDB_ORG is not set")

bucket = os.environ.get("INFLUXDB_BUCKET")
if not bucket or len(bucket) == 0:
  raise ValueError("INFLUXDB_BUCKET is not set")

url = os.environ.get("INFLUXDB_URL")
if not url or len(url) == 0:
  raise ValueError("INFLUXDB_URL is not set")

commands: List[obd.OBDCommand] = [
  obd.commands.RPM,
  obd.commands.THROTTLE_POS,
  obd.commands.SPEED,
  obd.commands.COOLANT_TEMP
]

drive_id = f"drive-{datetime.today().isoformat()}"
client = influxdb_client.InfluxDBClient(url=url, token=token, org=org)
write_api = client.write_api(write_options=SYNCHRONOUS)

def create_influx_callback(command: obd.OBDCommand):
  def callback(response):
    if response.value == None or not isinstance(response.value, obd.Unit.Quantity):
      return
    val = response.value.magnitude

    point = Point(command.name).field("value", val).tag("drive", drive_id)
    write_api.write(bucket=bucket, org="magicarp", record=point)
    print(f"wrote {command.name}={val} to influx")

  return callback

def start():
  print("connecting to obd2 port")
  connection = obd.Async(
    delay_cmds=0,
    fast=True,
  )

  if not connection.is_connected():
    print("connection failed")
    return

  print(f"connected using {connection.protocol_name()}, listing available commands: ")
  print(connection.print_commands())


  for command in commands:
    print(f"watching {command.name}")
    connection.watch(command, callback=create_influx_callback(command))

  connection.start()
  while (True):
    time.sleep(60)

  connection.stop()

start()
