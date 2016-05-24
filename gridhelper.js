/*
    This file is part of PlotticoTrack.

    PlotticoTrack is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    PlotticoTrack is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with PlotticoTrack. If not, see <http://www.gnu.org/licenses/>.
*/

/*global chrome, LZString*/

var events = ["onclick", "onmouseover", "onmouseout", "onmousedown", "onmouseup", "onscroll", "oncontextmenu", "onmousewheel", "ondblclick"];

function getAllElementsWithAttribute(attribute)
{
  var matchingElements = [];
  var allElements = document.getElementsByTagName('*');
  for (var i = 0, n = allElements.length; i < n; i++)
  {
    if (allElements[i].getAttribute(attribute) !== null)
    {
      // Element exists with attribute. Add to array.
      matchingElements.push(allElements[i]);
    }
  }
  return matchingElements;
}

function vulcanise_inlines() {
    for(var i=0;i<events.length;i++) {
        var els = getAllElementsWithAttribute(events[i]);
        for(var j=0;j<els.length;j++) {
            var fun = eval("(function a(){"+els[j].getAttribute(events[i])+"})");
            els[j].removeAttribute(events[i]);
            els[j][events[i]] = fun;
        }
    }
}

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function list2object(l) {
    var ob = {};
    var i;
    for(i=0; i<l.length;i++) {
        ob[i] = LZString.compressToUTF16(JSON.stringify(l[i]));
    }
    ob["total"] = i;
    return ob;
}

function object2list(ob) {
    var l=[];
    for(var o in ob) {
        l[o] = JSON.parse(LZString.decompressFromUTF16(ob[o]));
        if(!l[o]) {
            console.log("Can not decompress");
            console.log(ob[o]);
        }
    }
    return l;
}

function save_list(l, cb) {
    var ob = list2object(l);
    chrome.storage.sync.set(ob, function() {
        //console.log("set values");
        if(cb) cb();
    });
}

function load_list(cb) {
    chrome.storage.sync.get({"total": 0},function(v){
        var getob={};
        for(var i=0;i<v.total;i++) {
            getob[i] = {};
        }
        chrome.storage.sync.get(getob, function(v){
            cb(object2list(v));
        });
    });
}

function start_tab(url, recid, cb) {
    chrome.tabs.create({
        url: url,
        active: false,
        pinned: true
    }, function (tab) {
        // notify bg that we launched a tab with url
        console.log("Will now track tab "+tab.id);
        var m = {"action": "setTrackedTab", "url": url, "tabId": tab.id, "recid": recid };
        chrome.runtime.sendMessage(m, function(response) {});
        if(typeof(tracked_tabs) != "undefined") {
            tracked_tabs[tab.id] = m;
        } else {
            chrome.tabs.sendMessage(tab.id, {
                "action": "init",
                "url": url,
                "tabId": tab.id,
                "recid": recid
            });
        }
        chrome.tabs.insertCSS(tab.id, { "runAt": "document_start", "code":"body { visibility: hidden; }" }, function(){});
        chrome.tabs.update(tab.id, {active: true});
        if(typeof(cb) != "undefined") cb();
    } );
}


function b64_encode_safe(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_decode_safe(b64) {
    return decodeURIComponent(escape(window.atob(b64)));
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function xor(input, key, mode) {
	var output = "";

	if (mode == 1) {
		input = atob(input);
	}

	for (var i = 0; i < input.length; i++) {
		var c = input.charCodeAt(i);
		var k = key.charCodeAt(i % key.length);

		output += String.fromCharCode(c ^ k);
	}

	if (mode == 0) {
		output = btoa(output);
	}

	return output;
}
