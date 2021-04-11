const test = require('blue-tape');
const nf = require('node-fetch');
const axios = require('axios');
const supertest = require('supertest');
const log  = require('metalogger')();
const fp = require('fakepromise');
const express = require('express');

test('Basic Express Response', async t => {

  const server = require('../support/server').getServer();
  const util = require('../support/util');
  const baseuri = util.serverUri(server);

  try {
    const res = await nf(`${baseuri}/hello`);  
    t.equal(res.status, 200, 'proper http status code for /hello');
    t.same(await res.text(), 'Hello World!',
           'proper response payload for /hello');  
  } catch (err) {
    t.fail(err);
  }
  server.close();
  
});

test('Ability To Process JSON Input', async t => {

  const server = require('../support/server').getServer();
  const util = require('../support/util');
  const baseuri = util.serverUri(server);

  try {    
    const payload = {rsv: 100, anotherField: "blahblah", "oh" : "yes"};
    
    const res = await axios.post(`${baseuri}/jsonParser`, payload);
    const data = res.data;

    //const res = await nf(`${baseuri}/jsonParser`, {
    //  method: 'post',
    //  body: JSON.stringify(reqBody),
    //  headers: {Accept: 'application/json'}
    //});

    t.equal(res.status, 200, 'proper http status code for /jsonParser');

    log.info (" response data ", data);
    t.same(data.rsv, 100, 'proper response payload for /jsonParser');  
  } catch (err) {
    t.fail(err);
  }
  server.close();
  
});


test('Ability To Process JSON Input2', async t => {

  const jsonResponder = (req, res) => {
    const input = req.body;
    log.info("wtf2", input);
    res.json({rsv: 100});
  };
  const initapp = express();
  initapp.post('/jsonParser', jsonResponder);

  const app = require('../../lib').setupTest(initapp);

  try {    
    const payload = {rsv: 100, anotherField: "blahblah", "oh" : "yes"};

    const res = await supertest(app)
      .post('/jsonParser')
      .send(payload)
      .set('Accept', 'application/json');     
    
    const data = res.body;

    log.info ("supertest body", data);
    t.equal(res.status, 200, 'proper http status code for /jsonParser');

    log.info (" response data ", data);
    t.same(data.rsv, 100, 'proper response payload for /jsonParser');  
  } catch (err) {
    t.fail(err);
  }
  app.http.close();
  
});
