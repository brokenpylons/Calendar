#!/usr/bin/env node

import express from 'express';
import morgan from 'morgan';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const app = express();

const port = process.env.PORT || 8080;
const host = process.env.HOST || 'localhost';
const browser_path = process.env.BROWSER_PATH;
if (!browser_path) {
  throw new Error("Path to the browser must be specified");
}

app.use(morgan('combined'));

async function getTitles(page, filterId) {
  const subjectFilter = filterId.split(';', 4).pop();
  if (subjectFilter !== '0') {
    const ids = subjectFilter.split(',');
    return await page.evaluate((ids) => {
      return ids.map(id => document.querySelector(`tr[data-rk="${id}"]`).querySelector('span').innerHTML);
    }, ids);
  }
  return null;
}

async function clickExport(page) {
  await page.evaluate(() => {
    const node = document.querySelector('a[title="Izvoz celotnega urnika v ICS formatu  "]');
    if (node == null) {
      throw 'Export button not found';
    }
    const handler = node.getAttributeNode('onclick').nodeValue;
    node.setAttribute('onclick', handler.replace('_blank', '_self'));
    node.click();
  });
}

function setupDownloadHook(page, cookies) {
  return new Promise(resolve => {
    page.on('request', async request => {
      console.log(request.url());

      if (request.url() === 'https://www.wise-tt.com/wtt_um_feri/TextViewer') {
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
}

async function fetchCalendar(filterId) {
  const browser = await puppeteer.launch({executablePath: browser_path});
  try {
    const page = await browser.newPage();
    await page.goto(`https://www.wise-tt.com/wtt_um_feri/index.jsp?filterId=${filterId}`);

    await page.setRequestInterception(true);
    const cookies = await page.cookies();
    const download = setupDownloadHook(page, cookies);
    const titles = await getTitles(page, filterId);

    await clickExport(page);
    let data = await download;

    if (titles != null) {
      data = data.replace(/\s*BEGIN:VEVENT[\s\S]*?END:VEVENT\s*/g, event => {
        return titles.some(title => event.includes(`SUMMARY:${title}`)) ? event : '';
      });
    }

    const position = data.indexOf('BEGIN:VEVENT');
    data = data.substr(0, position) + 'X-WR-TIMEZONE:Europe/Ljubljana\n' + data.substr(position);

    return data;
  } finally {
    await browser.close();
  }
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
    const data = await fetchCalendar(req.query.filterId);
    res.send(data);
  } catch(e) {
    console.log(e);
    res.sendStatus(404);
  }
});

app.listen(port, host);
console.log(`${host}:${port}`);
