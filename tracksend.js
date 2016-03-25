// we are loading page after we have set everything up...
if (typeof(PlotticoTrack) == "undefined") {
    PlotticoTrack = {};
}

function get_vals(objects) {
  var r = "";
  for(var key in objects) {
      r+=objects[key]+" ";
  }
  return r;
}

chrome.storage.sync.get({"url":"", "hash":"", "nindex": 0, "xpath": ""},function(v){ 
  PlotticoTrack.pt_trackedSite = v["url"];
  PlotticoTrack.pt_Hash = v["hash"];
  PlotticoTrack.pt_NumberIndex  = v["nindex"];
  PlotticoTrack.pt_XPath = v["xpath"];
  console.log("local data "+get_vals(PlotticoTrack));
});

PlotticoTrack.createXPathFromElement = function(elm) { 
    var allNodes = document.getElementsByTagName('*'); 
    for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) 
    { 
        if (elm.hasAttribute('id')) { 
                var uniqueIdCount = 0; 
                for (var n=0;n < allNodes.length;n++) { 
                    if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++; 
                    if (uniqueIdCount > 1) break; 
                }
                if ( uniqueIdCount == 1) { 
                    segs.unshift('id("' + elm.getAttribute('id') + '")'); 
                    return segs.join('/'); 
                } else { 
                    segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]'); 
                } 
        } else if (elm.hasAttribute('class')) { 
            segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]'); 
        } else { 
            for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) { 
                if (sib.localName == elm.localName)  i++; } 
                segs.unshift(elm.localName.toLowerCase() + '[' + i + ']'); 
        }
    }
    return segs.length ? '/' + segs.join('/') : null; 
}; 

PlotticoTrack.lookupElementByXPath = function(path) { 
    var evaluator = new XPathEvaluator(); 
    var result = evaluator.evaluate(path, document.documentElement, null,XPathResult.FIRST_ORDERED_NODE_TYPE, null); 
    return  result.singleNodeValue; 
};

PlotticoTrack.parseTrackableValues = function(str) { 
    var string =lookupElementByXPath('id("uiContentBody")/fieldset[1]/table[@class="str_table"]/tbody[1]/tr[1]/td[2]').innerHTML;
    var reg = /[-+]?[0-9]*\.?[0-9]+?/g;
    var matches = [], found;
    while (found = reg.exec(string)) {
        matches.push(found[0]);
    }
    return matches;
};

PlotticoTrack.parseUnits = function(str) {
    // TODO: wolfram|alpha units simplifier / parser? [and cache alpha results w/convert ratio?]
    // cheaper and simpler: x=UnitConvert[Quantity[0.2,"GBit/s"]];x/Quantity[1,QuantityUnit[x]]
    return parseFloat(str);
};

// TODO: multiple data send support
PlotticoTrack.sendToPlot = function(data, hash) {
    var pushSrc = "https://plotti.co/"+hash+"?d="+data+"&h="+Math.random();
    console.log("Sending to plot: "+pushSrc);
    var img = new Image();
    img.src=
    img.onload = function (e) {
        PlotticoTrack.bdataSent = true;
        // TODO HERE: retry, clear interval here?
        // but need to make sure we send data only once, so in case of good conn - its ok
    };
};

PlotticoTrack.sendRequest = function(uri, data, cb) {
    console.log("Sending request");
    var req = new XMLHttpRequest();
    req.open("GET", uri, true);
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
          if (req.status == 200) {
            console.log("Received: "+req.responseText);
            cb(req.responseText);
          }
        }
      };
    req.send();
};

// here we wait for the data to appear
PlotticoTrack.trySendInt = setInterval(function(){ // retry sending until we 
  var pt = PlotticoTrack; // TBD correct call seq, e.g. this
  if(pt.pt_trackedSite && location.href != pt.pt_trackedSite) {
    clearInterval(trySendInt); // send only once
    return;
  }
  if(pt.pt_XPath && pt.pt_NumberIndex) {
    var el = pt.lookupElementByXPath(window.pt_XPath);
    var inData = el.innerHTML;
    var dataList = pt.parseTrackableValues(inData);
    var trackData = dataList[pt.pt_NumberIndex];
    var normalizedData = pt.parseUnits(trackData);
    if(!nomralizedData) return;
    pt.sendToPlot(normalizedData, pt.pt_Hash);
    clearInterval(PlotticoTrack.trySendInt); // send only once
  }
},100);

setInterval(function(e){
    if(PlotticoTrack.bdataSent) {
        location.reload();
    }
}, 5000); // do not reload faster than 1minute

// this won't be loaded before we actually set everything (hopefully)
// TODO: remove
chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg == "ready") {
    console.log("background ready");
  }
});
