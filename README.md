# Calendar
![GitHub](https://img.shields.io/github/license/brokenpylons/Calendar.svg)

A little service that fetches iCalendar files from the "Wise Time Table".

## Why?
The "Wise Time Table" serves the iCalendar files in an disingenuous way. They open a new page, redirect to a different URL and return the content as ```application/octet-stream```, so the calendar cannot be consumed by other applications (only imported).

## Solution
This service downloads the iCalendar file on request and serves it as ```text/plain```.

## Usage
The service is live at <http://calendar.rwx.si> (this link redirects here). You can request the calendar file by calling the ```calendar``` endpoint. It accepts a parameter ```filterId```, which you can get by navigating to the timetable website, selecting the options you want and then clicking the little book icon at the upper left corner. You will get a permanent link, then you just need to copy the ```filterId``` part.

For example:

<http://calendar.rwx.si/calendar?filterId=0;1;0;0;>

This URL can be added to Google Calendar, Tunderbird, etc.

## Deployment
If you are deploying on NixOS you can refer to the configuration that is used on our server, [link](https://github.com/UM-LPM/server/blob/master/machines/calendar/configure.nix). Otherwise you can use the following configuration files:

### Service

```
/etc/systemd/system/calendar.service
```

```ini
[Unit]
Description=calendar
Requires=network-online.target
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /opt/calendar/calendar.js
User=calendar
Restart=always
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=HOST=localhost
Environment=BROWSER_PATH=/usr/bin/chromium

[Install]
WantedBy=multi-user.target
```

### Namespace cloning

```
/etc/sysctl.d/50-namespace-cloning.conf
```

```
kernel.unprivileged_userns_clone=1
```
### Notes
The following changes needed to be made to be able to deploy on NixOS, you might want to revert them:
* ```puppeteer-core``` was used instead of ```puppeteer```. The difference is that the first is used in combination with the system version of ```chromium```, thus you need to make sure the versions are compatible.
* The access log is written to stdout

## It doesn't work anymore?

Open an issue or shoot me an email!

## License

ISC
