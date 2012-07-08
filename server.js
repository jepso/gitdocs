/**
 * # Server.js
 *
 * Server.js is the entry point of the application, it loads all the necessary modules.
 */

/**
 * Export a function to create the server
 * @param  {function} getObject adheres to the same spec as git-api and file-api
 * @param  {integer}  port      The port number to run the app on.
 */
module.exports = function(api, port) {
    /*!
      */
    //Reserved prefixes:
    //  api
    //  admin
    //  login
    //  signup
    //  settings
    //  account

    var getObject = api.getObject;

    /**
     * [Express](http://www.expressjs.com) is the http server framework
     *
     * We load it, then use it to create a server.
     */
    var express   = require('express');
    var app       = express.createServer();

    /**
     * The [git-proxy](git-proxy.js) is the module of the application that 
     * decides how to render each page from GitHub.
     */
    var proxy       = require('./git-proxy');

    /**
     * # Configure Views
     *
     * ['configure-views'](configure-views.js) configures the views module ([QEJS](/jepso/QEJS)).
     */
    require('./configure-views')(app);
    /**
     * # Configure Styles
     *
     * ['configure-styles'](configure-styles.js) configures [less](http://lesscss.org) to compile to css.
     * It also sets up static file serving of images.
     */
    require('./configure-style')(app);
    /**
     * # Handle static files
     *
     * Mostly just some JavaScript
     */
    app.use(express.static(__dirname + '/static'));
    /**
     * # Configure Settings
     *
     * ['configure-settings'](configure-settings.js) will (once finished) provide the settings store
     * to keep track of user preferences.
     */
    require('./configure-settings')(app);

    /**
     * # Home Page
     * 
     * Handle requests for the home page by rendering the 'home' view.
     */
    if (!api.handlesHome) {
        app.get('/', function(req, res){
          res.render('home');
        });
    }

    /**
     * # Favicon
     *
     * Unfortunately, I don't have a favicon for GitHubDocs yet, once I do, it will be here.
     *
     * In the mean time, sending 404 early stops us looking for a github user called favicon.ico
     */
    app.get('/favicon.ico', function(req,res,next){
        res.send(404);
    });

    /**
     * # Use Router
     *
     * use the router, before handling requests for GitHub proxies 
     * so that we handle all our local pages before those on GitHub.
     */
    app.use(app.router);

    /**
     * # Request through GitHub Proxy
     *
     * This is the real meat of the application.  We request the object from GitHub with the same path.
     * 
     * Once we have an object we run it through the proxy, which sends it to the user.
     *
     * ## getObject Failure
     * 
     * If it is a 404 error, we simply call next, 
     * leading to the default 404 error page being served by express.
     *
     * If it is not a 404 error, we simply pass it to next.
     */
    app.use(function(req,res, next){
        var path = require('url').parse(req.url).pathname;
        getObject(path).then(function(obj){
            return proxy.run(obj, req, res, next);
        }).fail(function(err){
            if(err === 404) next();
            else next(err);
        }).end();
    });

    /**
     * # Listen
     * 
     * Begin listening on port
     */
    app.listen(port);
/*!
 */
};


/**
 * # Default behaviour.
 * 
 * We load the git-api defined in [git-api.js](git-api.js) if this file was called directly.
 *
 * If the app was run as a command line app to serve a given folder, we will rely on the exported
 * module.
 */
if (!module.parent) {
	module.exports(require('./git-api'), process.env.PORT || 5000);
}