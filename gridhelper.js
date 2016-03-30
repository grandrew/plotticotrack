/*global chrome*/

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

function save_list(l) {
    var ob = list2object(l);
    chrome.storage.sync.set(ob, function() {
        //console.log("set values");
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
