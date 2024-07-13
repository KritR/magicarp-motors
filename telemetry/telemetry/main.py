import obd

obd.logger.setLevel(obd.logging.DEBUG)

print("connecting to obd2 port")
connection = obd.OBD(protocol=obd.protocols.ISO_9141_2)

print(f"connected using {connection.protocol_name()}")
print(connection.print_commands())

# query loop
while True:
  response = connection.query(obd.commands.RPM)
  print(response.value) # returns unit-bearing values thanks to Pint
