#!/bin/sh
# https://github.com/kubernetes/community/blob/master/contributors/design-proposals/storage/flexvolume-deployment.md

set -o errexit
set -o pipefail

VENDOR=ucloud
DRIVER=cow

driver_dir=$VENDOR${VENDOR:+"~"}${DRIVER}
if [ ! -d "/flexmnt/$driver_dir" ]; then
  mkdir "/flexmnt/$driver_dir"
fi

if [ ! -d "/flexmnt/$driver_dir/.bin" ]; then
  mkdir "/flexmnt/$driver_dir/.bin"
fi

cp -r "/opt/$DRIVER/.bin" "/flexmnt/$driver_dir/.bin-new"
mv  "/flexmnt/$driver_dir/.bin" "/flexmnt/$driver_dir/.bin-old"
mv  "/flexmnt/$driver_dir/.bin-new" "/flexmnt/$driver_dir/.bin"
rm -rf "/flexmnt/$driver_dir/.bin-old"
cp "/opt/$DRIVER/$DRIVER" "/flexmnt/$driver_dir/.$DRIVER"
mv -f "/flexmnt/$driver_dir/.$DRIVER" "/flexmnt/$driver_dir/$DRIVER"

tail -f /dev/null

