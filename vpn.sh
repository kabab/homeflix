#! /bin/sh
sleep 10
/etc/init.d/nordvpn start
sleep 10

nordvpn login --token $NORDVPN_TOKEN
nordvpn connect p2p
tail -f /dev/null