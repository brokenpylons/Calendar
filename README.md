# Calendar
A little service that fetches iCalendar files from the "Wise Time Table".

## Why?
The "Wise Time Table" serves the iCalendar files in an disingenuous way. They open a new page, redirect to a different URL and return the content as ```application/octet-stream```, so the calendar cannot be consumed by other applications (only imported).

## Solution
This service downloads the iCalendar file on request and serves it as ```text/plain```.

## Usage
The service is live at <http://calendar.brokenpylons.com> (this link redirects here). You can request the calendar file by calling the ```calendar``` endpoint. It accepts a parameter ```filterId```, which you can get by navigating to the timetable website, selecting the options you want and then clicking the little book icon at the upper left corner. You will get a permanent link, then you just need to copy the ```filterId``` part.

For example:

<http://calendar.brokenpylons.com/calendar?filterId=0;1;0;0;>

This URL can be added to Google Calendar, Tunderbird, etc.

## It doesn't work anymore?

Open an issue or shoot me an email!

## License

ISC
