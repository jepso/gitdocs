var process = require('./fileprocessor').process;
require('./filehelpers');
var render = require('./filerenderer').render;

exports.renderFile = function(file, res){
    var locals = {
        mode:'render',
        path:file.path,
        name:file.name,
        extension:/.(\w*)$/g.exec(file.path)[0],
        source:file.source,
        content:file.content
    };

    process(locals);

    render(locals, res);
};
