# Loading GLS onto a raspberry pi

copy owpy.tar.gz, agrasurvey, agrasurvey.py, agra.tar, gm.conf, key.pem, agrasurvey-init.d, and libow-2.8-15.conf to the pi
sudo apt-get update
sudo apt-get install python-dev
sudo apt-get install python-pip
sudo apt-get install libusb-dev
sudo pip install rsa
tar xzf owpy.tar.gz
cd owpy/src
sudo python setup.py install
sudo cp libow-2.8-15.conf /etc/modprobe.d/
sudo cp agrasurvey-init.d /etc/init.d/agrasurvey
sudo mkdir -p /usr/lib/agrasurvey/
sudo mkdir -p /var/log/agrasurvey/counts
sudo mkdir -p /etc/agrasurvey
sudo cp gm.conf key.pem /etc/agrasurvey
sudo cp agrasurvey /usr/sbin
sudo cp agrasurvey.py agra.tar /usr/lib/agrasurvey
sudo cd /usr/lib/agrasurvey
sudo tar xf agra.tar
sudo update-rc.d agrasurvey defaults

edit /etc/agrasurvey/gm.conf and set the name  and other stuff as appropriate

set /etc/network/interfaces to have:
iface eth0 inet static
address 192.168.150.17
netmask 255.255.255.0
gateway 192.168.150.1

set /etc/resolve.conf to be:
nameserver 192.168.150.1

change pi password with
sudo raspi-config
to be 'Tiogspw1' so it matches the Netis units

change hostname with raspi-confi/advanced settings to be the same as the location name set the gm.conf file


