const express = require('express')
    , log     = require('metalogger')()
    , cluster = require('cluster')
    , CONF    = require('config')
    , http    = require('http');

let app = express();
exports = module.exports;

/* eslint-disable complexity */
exports.setup = function(initapp, callback, defaultsFunc) {

  // Default to configuration value, but let Heroku/others override via env
  const server_port = get_port();

  if (typeof callback !== 'undefined' && initapp) {
    app = initapp;
  } else if(typeof callback === 'undefined') {
    // This is to support old clients who do not
    //  know about the "initapp" parameter and are
    //  only passing callback through.
    callback = initapp;
  } else {
    // remaining condition:
    // if initapp is false but is actually passed
    // the right thing to do is to ignore it.
  }

  configure_logging();

  const isClusterMaster = (cluster.isMaster && (process.env.NODE_CLUSTERED == 1));

  let is_http_thread = true;
  if (isClusterMaster || get_env("NODE_ISNOT_HTTP_SERVER_THREAD") != 'true') {
    is_http_thread = false;
  }

  log.debug("is current thread a HTTP thread? " + is_http_thread);

  if (isClusterMaster) {
    require('./nodebootstrap-clustering').setup();
  }

  if (is_http_thread) {
    const live_server = http.createServer(app);
    live_server.listen(server_port);
  }

  // If we are not running a cluster at all:
  if (!isClusterMaster && cluster.isMaster) {
    log.notice("Express server instance listening on port " + server_port);
  }

  if(defaultsFunc instanceof Function) {
    defaultsFunc(app); // use client-provided defaults function
  } else {
    setAppDefaults(app); // use the our implementation
  }

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
  const app = initapp || express();  

  configure_logging();
  setAppDefaults(app);

  // Note: listening on port "0" results to listening on random, free port. 
  // Avoids conflicts.
  const server = app.listen(0, function () {
    const port = server.address().port;
    log.debug(`Test server listening at port ${port} \n`);
  });
  
  app.http = server;

  if ('undefined' === typeof callback) {
    return app;
  } else {
    callback(app);
  }
  
};

exports.getTestServer = function(initapp) {
  const app =  exports.setupTest(initapp);
  return app.http; // server
};

/**
 * Setting up sensible default configurations
 * @param initapp optional. You can pass-in the app that should be configured.
 */
const setAppDefaults = function(initapp) {

  const someapp = initapp || express();

  someapp.author = "irakli";
  //const root_dir = require('path').dirname(require.main.filename);

  const defaultLimit = '50mb';
  // parse application/json
  someapp.use(express.json({ type: 'application/json', limit: defaultLimit }));
  // parse application/anything+json
  someapp.use(express.json({ type: 'application/*+json', limit: defaultLimit }));
  // parse application/x-www-form-urlencoded
  someapp.use(express.urlencoded({extended: true, limit: defaultLimit }));

  someapp.use(require('connect-multiparty')());
  someapp.use(require('method-override')('X-HTTP-Method-Override'));

  // parse anything else
  someapp.use(express.raw({ limit: defaultLimit }));

  someapp.use(require('helmet')());

  if (typeof initapp === 'undefined') {
    return someapp;
  } else {
    initapp = someapp;
  }
};

/**
 * Default configuration of logging
 */
function configure_logging() {
  if ('log' in CONF) {

    if ('plugin' in CONF.log) { process.env.NODE_LOGGER_PLUGIN = CONF.log.plugin; }
    if ('level'  in CONF.log) { process.env.NODE_LOGGER_LEVEL  = CONF.log.level; }

    if ('customlevels' in CONF.log) {
      for (const key in CONF.log.customlevels) {
        process.env['NODE_LOGGER_LEVEL_' + key] = CONF.log.customlevels[key];
      }
    }
  }
}

/**
 * Safely return value of an env variable if it is set, or return empty string
 * @param {} name - name of the env variable
 */
function get_env(name) {
  if ( 'undefined' !== typeof process.env[name]) {
    return process.env[name];
  } else {
    return '';
  }
}

function get_port() {
  if ( CONF.has('app.port') ) {
         return CONF.app.port;
       } else {
         return 5505;
       }
}
