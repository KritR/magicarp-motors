from typing import List
import obd
import os
from dotenv import load_dotenv
import influxdb_client, os
from influxdb_client import Point
from influxdb_client.client.write_api import SYNCHRONOUS
import datetime

load_dotenv()

token = os.environ.get("INFLUXDB_TOKEN")
if not token or len(token) == 0:
  raise ValueError("INFLUXDB_TOKEN is not set")

org = "magicarp"
bucket="vehicle"
url = "https://magicarp-telemetry.fly.dev"

commands: List[obd.OBDCommand] = [
  obd.commands.RPM
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
