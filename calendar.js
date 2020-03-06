const express = require('express');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const app = express();

const port = process.env.PORT || 8080;
const host = process.env.HOST || 'localhost';

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'var/log/access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

let activePromise = Promise.resolve();

async function fetchCalendar(filterId) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`http://www.wise-tt.com/wtt_um_feri/index.jsp?filterId=${filterId}`);
  await page.setRequestInterception(true);
  const cookies = await page.cookies();

  const download = new Promise(resolve => {
    page.on('request', async request => {
      if (request.url() === 'http://www.wise-tt.com/wtt_um_feri/TextViewer') {
        const response = await fetch(request.url(), {
          headers: {
            ...request.headers(),
            'cookie': cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(';'),
          }
        });
        const data = await response.text();
        resolve(data);
      } else {
        request.continue(); // Redirect 302
      }
    });
  });

  let titles;
  const subjectFilter = filterId.split(';', 4).pop();
  if (subjectFilter !== '0') {
    const ids = subjectFilter.split(',');
    titles = await page.evaluate((ids) => {
      return ids.map(id => document.querySelector(`tr[data-rk="${id}"]`).querySelector('span').innerHTML);
    }, ids);
  }

  await page.evaluate(() => {
    const node = document.querySelector('a[title="Izvoz celotnega urnika v ICS formatu  "]');
    if (node == null) {
      throw 'Export button not found';
    }
    const handler = node.getAttributeNode('onclick').nodeValue;
    node.setAttribute('onclick', handler.replace('_blank', '_self'));
    node.click();
  });

  let data = await download;
  if (titles != null) {
    data = data.replace(/\s*BEGIN:VEVENT[\s\S]*?END:VEVENT\s*/g, event => {
      return titles.some(title => event.includes(`SUMMARY:${title}`)) ? event : '';
    });
  }

  await browser.close();
  return data;
}

app.get('/', (req, res) => { 
  res.redirect('https://github.com/brokenpylons/Calendar');
});

app.get('/up', (req, res) => { 
  res.set('content-type', 'text/plain');
  res.send('yes');
});

app.get('/calendar', async (req, res) => {
  res.set('content-type', 'text/plain');

  if (!('filterId' in req.query)) {
    res.sendStatus(400);
    return;
  }

  try {
    await activePromise;
    activePromise = fetchCalendar(req.query.filterId);
    const data = await activePromise;

    const position = data.indexOf('BEGIN:VEVENT');
    res.send(data.substr(0, position) + 'X-WR-TIMEZONE:Europe/Ljubljana\n' + data.substr(position));
  } catch(e) {
    console.log(e);
    res.sendStatus(404);
  }
});

app.listen(port, host);
console.log(`${host}:${port}`);
