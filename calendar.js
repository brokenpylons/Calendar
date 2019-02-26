const express = require('express');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const app = express();

const port = process.env.PORT || 8080;
const host = process.env.HOST || 'localhost';

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

  await page.evaluate(() => {
    const node = document.querySelector('a[title="Izvoz celotnega urnika v ICS formatu  "]');
    if (node == null) {
      throw 'Export button not found';
    }
    const handler = node.getAttributeNode('onclick').nodeValue;
    node.setAttribute('onclick', handler.replace('_blank', '_self'));
    node.click();
  });

  const data = await download;
  await browser.close();
  return data;
}

app.get('/', (req, res) => { 
  res.send('Hello');
});

app.get('/calendar', async (req, res) => {
  res.set('content-type', 'text/html');

  if (!('filterId' in req.query)) {
    res.sendStatus(400);
    return;
  }

  try {
    const data = await fetchCalendar(req.query.filterId);
    res.send(data);
  } catch(e) {
    console.log(e);
    res.sendStatus(404);
  }
});

app.listen(port, host);
