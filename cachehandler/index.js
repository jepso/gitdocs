var Q = require('q');

function delay(){
	var def = Q.defer();
	setTimeout(function(){
		if(true||Math.random()>0.1) def.resolve();
		else{
			console.log("dummy network error");
			def.reject(new Error("Network error"));
		}
	}, 300);
	return def.promise;
}

var data = {};
exports.get = function(table, key){
	return delay().then(function(){
		if(typeof data[table] === 'undefined') data[table] = {};
		return data[table][key];
	});
}
exports.set = function(table, key, value){
	return delay().then(function(){
		if(typeof data[table] === 'undefined') data[table] = {};
		data[table][key]=value;
	});
}
exports.debug = data;

function clean(){
	var current = (Math.round((new Date()).getTime() / 1000));
	var table = data['web-cache'];
	if(table){
		Object.keys(table).forEach(function(key){
			if((current-table[key].checkedLast) > (60*60*48)) delete table[key];
		});
	}
}
setInterval(clean, 1000*60);
clean();
exports.clean = clean;