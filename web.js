var express = require('express');
var http = require('http');
var jsdom = require('jsdom');
var fs = require('fs');
var jquery = fs.readFileSync("./jquery-1.7.1.js").toString();

var app = express.createServer(express.logger());
app.use(express.bodyParser());
app.use("/", express.static(__dirname + '/'));

function parsePage(cb) {
	var data=new Object();
	try {
		var div = $("#ires").find("ol");
		if(div.size()>0){
		var div_new=div.children("li").get(0);
		data.title_link=$(div_new).children("h3").children("a").attr("href").replace(/^\/url\?q=/,'').replace(/\&sa=U.*$/,'');
		data.title=$(div_new).children("h3").children("a").text()
		data.description=$(div_new).children("div").children(".st").text();

	    var size=$(div_new).children("div").find("table").size();
	    if(size>0){
	    	var tr = $(div_new).children("div").find("table").find(".mslg");
	    	var tableContent=new Object();
	    	var sublinksArray=new Array();
			$(tr).each(function() {
				$(this).children().each(function(){
					var childs=new Object();
				childs.link=$(this).find("a").attr("href").replace(/^\/url\?q=/,'').replace(/\&sa=U.*$/,'');
				childs.link_title=$(this).find("a").text();
				childs.subject=$(this).find(".st").text();
				sublinksArray.push(childs);
				});
			})
			tableContent.content=sublinksArray;
			data.links=sublinksArray;
	    }
		}else{
			data.error="Error parsing content for the given URL. The link may to be broken.";
		}
		cb(data);
	} catch (err) {
		console.log("Error in " + err);
	}
}
function parseHtml(htmlcontent,cb){
	try {
		jsdom.env({
		html : htmlcontent,
		src : jquery,
		done : function(err, window) {
				$ = window.jQuery;
				var json = new Object();
				parsePage(function(resText){
					json.data=resText
					window.close();
					cb(json);
				});	
			}
		});
	} catch (e) {
		console.trace(e)
	}
}

app.get('/api/query/:link', function(request, response) {
	var param = request.params.link;
	var queryUrl = "www.google.com";
	var options = {
		host: queryUrl,
		port: 80,
		path: '/search?q=' + param,
		method: 'GET'
	};
	var req = http.get(options, function(res) {
		var pageData = "";
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			pageData += chunk;
		});
		res.on('end', function(){
			var data = new Object();
			data.html = pageData;
			response.header("Access-Control-Allow-Origin", "*");
			response.header("Access-Control-Allow-Headers", "X-Requested-With"); 
			parseHtml(data.html, function(resText){
				response.send(JSON.stringify(resText));
			})
			
		});
	});
});

app.post('/api/extract', function(request, response) {
	var param = request.body.link;
	var queryUrl = "www.google.com";
	var options = {
		host: queryUrl,
		port: 80,
		path: '/search?q=' + param,
		method: 'GET'
	};
	var req = http.get(options, function(res) {
		var pageData = "";
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			pageData += chunk;
		});
		res.on('end', function(){
			parseHtml(pageData, function(resText){
				response.send(JSON.stringify(resText));
			})
		});
	});
})
var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});