const test = require('blue-tape');
const nf = require('node-fetch');
const log  = require('metalogger')();
const fp = require('fakepromise');
const express = require('express');

const nb_server = require('../../lib');

test('Basic Express Response', async t => {

  const responder = (req, res) => {
    res.send('Hello World!');
  };

  const app  = nb_server.setupTest();
  app.get('/', responder);
  app.get('/hello', responder);

  const server  = nb_server.getTestServer(app);
  const baseuri = nb_server.serverUri(server);

  try {
    const res = await nf(`${baseuri}/hello`);  
    t.equal(res.status, 200, 'proper http status code for /hello');
    t.same(await res.text(), 'Hello World!',
           'proper response payload for /hello');  
  } catch (err) {
    t.fail(err);
  } finally {
    server.close();
  }
  
  
});

test('Ability To Process JSON Input', async t => {

  const jsonResponder = (req, res) => {
    const input = req.body;
    log.info("wtf", input.rsv);
    res.json({rsv: input.rsv});
  };

  const app  = nb_server.setupTest();
  app.post('/jsonParser', jsonResponder);

  const server  = nb_server.getTestServer(app);
  const baseuri = nb_server.serverUri(server);

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
  }
  server.close();
  
});
