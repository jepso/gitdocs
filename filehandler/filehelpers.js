var use = require('./fileprocessor').use;


var marked = require('marked');
// Set default options
marked.setOptions({
  gfm: true,
  pedantic: false,
  sanitize: true,
  // callback for code highlighter
  highlight: require('../highlighter')
});

use(['.md', '.markdown'], 'markded', function(){
    return Q.when(marked(file.content));
});

use('highlight', function(source, lang, preventGuessing){
    if (arguments.length === 0) {
        return require('../highlighter')(this.content, this.extension.substr(1));
    }
    if (arguments.length === 1 && (arguments[0] === true || arguments[0] === false)) {
        return require('../highlighter')(this.content, this.extension.substr(1), arguments[0]);
    }
    return require('../highlighter')(source, lang, preventGuessing);
});
