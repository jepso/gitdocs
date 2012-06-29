exports.run = function (data, req, res, next) {
    switch (data.type) {
        case "user":
            return user(data, req, res, next);
        case "dir":
            return directory(data, req, res, next);
        case "file":
            return file(data, req, res, next);
        case "image":
            return image(data, req, res, next);
        case "redirect":
            return res.redirect(data.path);
    }
};

function user(data, req, res, next) {
    res.render('userProfile', data);
};
function directory(data, req, res, next) {
    if(data.readme.exists){
        require('./filehandler/filehelpers');
        require('./filehandler/fileprocessor').process(data.readme);
    }
    res.render('directory', data);
};
function file(data, req, res, next) {
    require('./filehandler').renderFile(data, req, res);
};
function image(data, req, res, next) {
    data.mode = 'render';
    res.render('filetypes/images(.png.gif.jpeg.jpg)/image', data);
};

var marked = require('marked');
// Set default options
marked.setOptions({
    gfm: true,
    pedantic: false,
    sanitize: true,
    // callback for code highlighter
    highlight: require('./highlighter')
});