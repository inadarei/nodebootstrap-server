var express = require('express')
  , app     = express()
  , log     = require('metalogger')()
  , cluster = require('cluster')
  , CONF    = require('config')
  , http    = require('http');

exports = module.exports;

exports.setup = function(callback) {

  configure_logging();

  var isClusterMaster = (cluster.isMaster && (process.env.NODE_CLUSTERED == 1));

  var is_http_thread = true;
  if (isClusterMaster ||
      ( 'undefined' !== typeof process.env.NODE_ISNOT_HTTP_SERVER_THREAD &&
          process.env.NODE_ISNOT_HTTP_SERVER_THREAD != 'true')) {
    is_http_thread = false;
  }

  log.debug("is current thread a http thread? " + is_http_thread);

  if (isClusterMaster) {
    require('nodebootstrap-clustering').setup();
  }

  if (is_http_thread) {
    http = http.createServer(app);
    http.listen(CONF.app.port);
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
 * Setting up sensible default configurations
 * @param initapp optional. You can pass-in the app that should be configured.
 */
module.parent.exports.setAppDefaults = function(initapp) {

  var someapp = initapp || express();

  // var root_dir = require('path').dirname(module.parent.filename);
  var root_dir = require('path').dirname(require.main.filename);

  /** http://webapplog.com/migrating-express-js-3-x-to-4-x-middleware-route-and-other-changes/ **/

  someapp.use(require('compression')());

  someapp.set('views', root_dir + '/views');
  //app.set("view options", { layout: appDir + '/views' });

  var bodyParser = require('body-parser');

  // parse application/x-www-form-urlencoded
  someapp.use(bodyParser.urlencoded({extended: true}));
  // parse application/anything+json
  someapp.use(bodyParser.json({ type: 'application/*+json' }))
  // parse anything else
  someapp.use(bodyParser.raw());

  someapp.use(require('connect-multiparty')());
  someapp.use(require('method-override')('X-HTTP-Method-Override'));

  if (('app' in CONF) && ('csrf' in CONF.app) && CONF.app.csrf === true) {
    someapp.use(require('csurf')());
    log.notice("CSRF protection turned on. ATTENTION: this may create problems if you use NodeBootstrap to build APIs!");
  }

  // This is not needed if you handle static files with, say, Nginx (recommended in production!)
  // Additionally you should probably pre-compile your LESS stylesheets in production
  // Last, but not least: Express' default error handler is very useful in dev, but probably not in prod.
  if (('NODE_SERVE_STATIC' in process.env) && process.env['NODE_SERVE_STATIC'] == 1) {
    var pub_dir = CONF.app.pub_dir;
    if (pub_dir[0] != '/') { pub_dir = '/' + pub_dir; } // humans are forgetful
    pub_dir = root_dir + pub_dir;

    someapp.use(require('less-middleware')(pub_dir ));
    someapp.use(require('serve-static')(pub_dir));
  }

  if (typeof initapp === 'undefined') return someapp;
}

/**
 * Default configuration of logging
 *
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
