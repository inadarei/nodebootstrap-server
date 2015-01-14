var express = require('express')
  , app     = express()
  , log     = require('metalogger')()
  , cluster = require('cluster')
  , CONF    = require('config');

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

  log.debug("is http thread? " + is_http_thread);

  if (isClusterMaster) {
    require('nodebootstrap-clustering').setup();
  }

  if (is_http_thread) {
    app.listen(CONF.app.port);
  }

// If we are not running a cluster at all:
  if (!isClusterMaster && cluster.isMaster) {
    log.notice("Express server instance listening on port " + CONF.app.port);
  }

  //-------

  /** http://webapplog.com/migrating-express-js-3-x-to-4-x-middleware-route-and-other-changes/ **/
  
  app.use(require('compression')());

  app.set('views', __dirname + '/views');

  var bodyParser = require('body-parser');
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({extended: true}))  
  // parse application/json
  app.use(bodyParser.json())
  
  app.use(require('connect-multiparty')());
  app.use(require('method-override')('X-HTTP-Method-Override'));
  app.use(require('express-session')({secret: CONF.app.cookie_secret, resave: false, saveUninitialized: false}));
  
  if (('app' in CONF) && ('csrf' in CONF.app) && CONF.app.csrf === true) {
    app.use(require('csurf')());
    log.notice("CSRF protection turned on. ATTENTION: this may create problems if you use NodeBootstrap to build APIs!");
  }

  // This is not needed if you handle static files with, say, Nginx (recommended in production!)
  // Additionally you should probably pre-compile your LESS stylesheets in production
  // Last, but not least: Express' default error handler is very useful in dev, but probably not in prod.
  if (('NODE_SERVE_STATIC' in process.env) && process.env['NODE_SERVE_STATIC'] == 1) {
    var pub_dir = CONF.app.pub_dir;
    if (pub_dir[0] != '/') { pub_dir = '/' + pub_dir; } // humans are forgetful
    var root_dir = require('path').dirname(module.parent.filename);
    pub_dir = root_dir + pub_dir;

    app.use(require('less-middleware')(pub_dir ));
    app.use(require('serve-static')(pub_dir));
    app.use(require('errorhandler')({ dumpExceptions: true, showStack: true }));
  }

  callback(app);

  // Catch-all error handler. Modify as you see fit, but don't overuse.
  // Throwing exceptions is not how we normally handle errors in Node.
  app.use(function catchAllErrorHandler(err, req, res, next){
    // Emergency: means system is unusable
    log.emergency(err.stack);
    res.send(500);

    // We aren't in the business of hiding exceptions under the rug. It should
    // still crush the process. All we want is: to properly log the error before
    // that happens.
    //
    // Clustering code in the lib/clustering module will restart the crashed process.
    // Make sure to always run clustering in production!
    setTimeout(function() { // Give a chance for response to be sent, before killing the process
      process.exit(1);
    }, 10);
  });
};

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
