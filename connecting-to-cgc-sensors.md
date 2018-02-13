#Connecting to, Checking, and Restarting CGC Sensors

Configuration
There are currently total of 7 functioning relays ("routers") in the GLS tech closet that connect to  various sensors on the site. They are as follows:
 - 192.168.150.10: Permeable Asphalt (Zone 1); Netis
 - 192.168.150.11: Permeable Concrete (Zone 2); Netis
 - 192.168.150.12: Concrete (Zone 3); Netis
 - 192.168.150.13: Paver 1 (Zone 4); Netis
 - 192.168.150.14: Paver 2 (Zone 5); Netis
 - 192.168.150.15: Paver 3 (Zone 6); Netis
 - 192.168.150.16: Bioswale; Raspberry Pi
 - 192.168.150.17: Rain Gauge; Raspberry Pi

Zones 1-5 are connected to 1 sensor each. Zone 6 is not functional and is considered and invalid installation because of the paver placement itself. It is a different size and in a different location from zones 1-5, so meaningful comparisons to it cannot be made.

The rain gauge actually has two sensors, one for each bucket. The measurments from one should be a clone of the other. It is essentially a redundant measurement.

The Bioswale is not functional. It can never fill up enough to trigger the sensor. Instead it is used as the remote access gateway to connect to the other relays remotely.

Connecting
To connect remotely:
ssh pi@liquid-cgc.asuscomm.com
The password is: Tiogspw1

From there, ssh into the other relays. Note that the password is always Tiogspw1. However, the Netis routers require you to log in as 'root'. The Raspberry Pis have the user 'pi' instead.

Checking and Restarting
To check on the status of the agrasurvey software (the Python program which queries the sensors), look at the end of the log file. The location of this file depends on whether the relay is a Netis router or a Raspberry Pi.

Netis: /mnt/usb/agrasurvey/log/agrasurvey-service.log
Rapsberry Pi: /var/log/agrasurvey/agrasurvey.log

In most cases the last entry should read, "Loading existing keys from /etc/agrasurvey. PEM: key.pem"

You can also run
ps aux |grep agra

When you do, you should see agrasurvey.py running.

(More to come...)
