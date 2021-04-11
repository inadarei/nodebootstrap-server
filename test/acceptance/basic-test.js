const test = require('blue-tape');
const nf = require('node-fetch');
const log  = require('metalogger')();
const fp = require('fakepromise');

test('Basic Express Response', async t => {

  const server = await require('../support/server').getServer();
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

  const server = await require('../support/server').getServer();
  const util = require('../support/util');
  const baseuri = util.serverUri(server);

  log.info("basuri", baseuri);

  try {    
    const reqBody = {rsv: 100};

    const res = await nf(`${baseuri}/jsonParser`, {
      method: 'post',
      body: JSON.stringify(reqBody),
      headers: {'Content-Type': 'application/json'}
    });

    t.equal(res.status, 200, 'proper http status code for /jsonParser');
    const data = await res.json();
    log.info (" response data ", data);
    t.same(data.rsv, 100, 'proper response payload for /jsonParser');  
  } catch (err) {
    t.fail(err);
  }
  server.close();
  
});
