from typing import List
import obd
import os
from dotenv import load_dotenv
import influxdb_client, os
from influxdb_client import Point
from influxdb_client.client.write_api import SYNCHRONOUS

load_dotenv()

token = os.environ.get("INFLUXDB_TOKEN")
if not token or len(token) == 0:
  raise ValueError("INFLUXDB_TOKEN is not set")

org = "magicarp"
bucket="vehicle"
url = "https://magicarp-telemetry.fly.dev"

# commands: List[obd.OBDCommand] = [
#   obd.commands.RPM
# ]

def start():
    client = influxdb_client.InfluxDBClient(url=url, token=token, org=org)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    print("connecting to obd2 port")
    connection = obd.OBD()

    if not connection.is_connected():
      print("connection failed")
      return

    print(f"connected using {connection.protocol_name()}")
    print(connection.print_commands())

    commands = connection.supported_commands

    # query loop
    while True:
      points = []
      for cmd in commands:
        response = connection.query(cmd)
        if not (response.value):
          continue

        print(type(response.value).__name__)

        val = response.value.magnitude

        point = Point(cmd.name).field("value", val)
        points.append(point)
      
      print(f"wrote {len(points)} points to influx")
      write_api.write(bucket=bucket, org="magicarp", record=points)
