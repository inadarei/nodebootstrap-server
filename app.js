var express = require('express')
  , app     = express()
  , log     = require('metalogger')()
  , cluster = require('cluster')
  , CONF    = require('config')
  , http    = require('http');

exports = module.exports;

exports.setup = function(initapp, callback) {
  
  if (typeof callback !== 'undefined' && initapp) {
    app = initapp;
  } else if(typeof callback === 'undefined') {
    // This is to support old clients who do not
    //  know about the "initapp" parameter and are
    //  only passing callback, through.
    callback = initapp;
  } else {
    // remaining condition:
    // if initapp is false but is actually passed
    // the right thing to do is to ignore it.
  }
  
  configure_logging();

  var isClusterMaster = (cluster.isMaster && (process.env.NODE_CLUSTERED == 1));

  var is_http_thread = true;
  if (isClusterMaster ||
      ( 'undefined' !== typeof process.env.NODE_ISNOT_HTTP_SERVER_THREAD &&
          process.env.NODE_ISNOT_HTTP_SERVER_THREAD != 'true')) {
    is_http_thread = false;
  }

  log.debug("is current thread a HTTP thread? " + is_http_thread);

  if (isClusterMaster) {
    require('nodebootstrap-clustering').setup();
  }

  if (is_http_thread) {
    http = http.createServer(app);
    http.listen(process.env.PORT || CONF.app.port);
  }

  // If we are not running a cluster at all:
  if (!isClusterMaster && cluster.isMaster) {
    log.notice("Express server instance listening on port " + CONF.app.port);
  }

  module.parent.exports.setAppDefaults(app);
  app.http = http; // Expose the original http object, for socket.io support or other needs.

  callback(app);
};

/**
 * Setup for the testing framework of nodebootstrap
 * Does not include clustering as this is not usually needed for endpoint testing
 * @param initapp
 * @param callback
 */
exports.setupTest = function(initapp, callback) {
  var app = initapp || express();

  configure_logging();

  var server = http.createServer(app);

  module.parent.exports.setAppDefaults(app);
  app.http = server;

  callback(app);
};

/**
 * Setting up sensible default configurations
 * @param initapp optional. You can pass-in the app that should be configured.
 */
module.parent.exports.setAppDefaults = function(initapp) {

  var someapp = initapp || express();

  // var root_dir = require('path').dirname(module.parent.filename);
  var root_dir = require('path').dirname(require.main.filename);

  var bodyParser = require('body-parser');
  // parse application/x-www-form-urlencoded
  someapp.use(bodyParser.urlencoded({extended: true}));
  // parse application/anything+json
  someapp.use(bodyParser.json({ type: 'application/*+json' }))
  // parse text/plain
  someapp.use(bodyParser.text({ type: 'text/plain'}));
  // parse anything else
  someapp.use(bodyParser.raw());

  someapp.use(require('connect-multiparty')());
  someapp.use(require('method-override')('X-HTTP-Method-Override'));

  if (typeof initapp === 'undefined') return someapp;
}

/**
 * Default configuration of logging
 */
function configure_logging() {
  if ('log' in CONF) {

    if ('plugin' in CONF.log) { process.env.NODE_LOGGER_PLUGIN = CONF.log.plugin; }
    if ('level'  in CONF.log) { process.env.NODE_LOGGER_LEVEL  = CONF.log.level; }

    if ('customlevels' in CONF.log) {
      for (var key in CONF.log.customlevels) {
        process.env['NODE_LOGGER_LEVEL_' + key] = CONF.log.customlevels[key];
      }
    }
  }
}
