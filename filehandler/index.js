var marked = require('marked');
// Set default options
marked.setOptions({
  gfm: true,
  pedantic: false,
  sanitize: true,
  // callback for code highlighter
  highlight: require('../highlighter')
});

exports.formatContent = function(file){
	(function(){
		var extension = /.(\w*)$/g.exec(file.path)[0];

		if(extension === ".md" || extension === ".markdown")return file.content = marked(file.content);

		/*file.content = String(file.content)
			.replace(/&(?!\w+;)/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');*/
		file.content = '<h1>'+String(file.name)
			.replace(/&(?!\w+;)/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')+'</h1><pre><code>'+require('../highlighter')(file.content, extension.substr(1))+'</code></pre>';
	}());
	return file;
};
