//const test = require('blue-tape');
const test = require('tape');
const nf = require('node-fetch');
const log  = require('metalogger')();
const fp = require('fakepromise');
const express = require('express');
const http= require('http');

const nb_server = require('../../lib');

process.env.NODE_CLUSTERED = 0;

test('Empty test to check setup', async t => {
  t.plan(1);

  const res = await nf("https://api.publicapis.org/entries"); 
  const data = await res.json();
  t.equal((data.count > 0), true);
});

test('Basic Express Response', async t => {
  t.plan(2);

  const responder = (req, res) => {
    res.send('Hello World!').end();
  };

  const app  = nb_server.setupTest();
  app.get('/hello', responder);
  const baseuri = nb_server.serverUri(app.http_server);

  try {
    const res = await nf(`${baseuri}/hello`);  
    t.equal(res.status, 200, 'proper http status code for /hello');
    t.same(await res.text(), 'Hello World!',
           'proper response payload for /hello');  
    //t.same(1,1);
  } catch (err) {
    t.fail(err);
  } finally {
    app.http_server.close();
  }
  
  
});

test('Ability To Process JSON Input', async t => {
  t.plan(2);

  const jsonResponder = (req, res) => {
    // This is what verified that body gets parsed!
    const input = req.body;
    res.json({rsv: input.rsv});
  };

  const app  = nb_server.setupTest();
  app.post('/jsonParser', jsonResponder);
  const baseuri = nb_server.serverUri(app.http_server);

  try {    
    const payload = {rsv: 100, anotherField: "blahblah", "oh" : "yes"};
    
    const res = await nf(`${baseuri}/jsonParser`, {
      method: 'post',
      body: JSON.stringify(payload),
      headers: {'Content-Type': 'application/json'}
    });

    const data = await res.json();

    t.equal(res.status, 200, 'proper http status code for /jsonParser');
    t.equal(data.rsv, 100, 'proper response payload for /jsonParser');  
  } catch (err) {
    t.fail(err);
  } finally {
    app.http_server.close();
  }
  
});
