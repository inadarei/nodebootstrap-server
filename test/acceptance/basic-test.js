const test = require('blue-tape');
const nf = require('node-fetch');
const log  = require('metalogger')();
const fp = require('fakepromise');

test('Basic Healthy Express Health Check', async t => {

  // avoid problems if this env var is already set from wherever test was run
  process.env.NODE_HEALTH_ENDPOINT_PATH = "";

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
