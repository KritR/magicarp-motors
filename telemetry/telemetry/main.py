from typing import List
import obd
import os
from dotenv import load_dotenv
import influxdb_client, os
from influxdb_client import Point
from influxdb_client.client.write_api import SYNCHRONOUS

load_dotenv()

token = os.environ.get("INFLUXDB_TOKEN")
org = "magicarp"
bucket="vehicle"
url = "https://magicarp-telemetry.fly.dev"

commands: List[obd.OBDCommand] = [
  obd.commands.RPM
]

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

    # query loop
    while True:
      points = []
      for cmd in commands:
        response = connection.query(cmd)
        val = response.value

        point = Point(cmd.name).field("value", val)
        points.append(point)
      write_api.write(bucket=bucket, org="magicarp", record=points)
