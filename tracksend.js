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

PlotticoTrack.parseTrackableValues = function(string) { 
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
    img.src = pushSrc;
    img.onload = function (e) {
        PlotticoTrack.bdataSent = true;
        console.log("data successfully sent!");
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

PlotticoTrack.getTrackedValue = function () {
    var el = PlotticoTrack.lookupElementByXPath(PlotticoTrack.pt_XPath);
    var inData = el.innerHTML;
    var dataList = PlotticoTrack.parseTrackableValues(inData);
    var trackData = dataList[PlotticoTrack.pt_NumberIndex];
    var normalizedData = PlotticoTrack.parseUnits(trackData);
    return normalizedData;
};

PlotticoTrack.checkSend = function () {
  var pt = PlotticoTrack;
  if(pt.pt_XPath && pt.pt_NumberIndex) {
    normalizedData = PlotticoTrack.getTrackedValue();
    if(!normalizedData) {
      console.log("can not get normalizedData; will retry");
      // TODO: try to do login here/replay script in case we have several failures
      setTimeout(PlotticoTrack.checkSend, pt.pt_waitInterval);
      return;
    }
    if(pt.pt_oldData == normalizedData && PlotticoTrack.bdataSent) {
      // need refresh
      location.reload();
    } else {
      pt.pt_oldData = normalizedData;
      pt.sendToPlot(normalizedData, pt.pt_Hash);
      setTimeout(PlotticoTrack.checkSend, pt.pt_checkInterval);
    }
  } 
};


// this won't be loaded before we actually set everything (hopefully)
// TODO: remove
chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg == "ready") {
    console.log("background ready");
  }
});

chrome.storage.sync.get({"url":"", "hash":"", "nindex": 0, "xpath": ""},function(v){ 
  PlotticoTrack.pt_trackedSite = v["url"];
  PlotticoTrack.pt_Hash = v["hash"];
  PlotticoTrack.pt_NumberIndex  = v["nindex"];
  PlotticoTrack.pt_XPath = v["xpath"];
  PlotticoTrack.pt_oldData = false;
  PlotticoTrack.pt_checkInterval = 5000; // tracking interval
  PlotticoTrack.pt_waitInterval = 500; // intervals to check for value while waiting
  //console.log("local data "+get_vals(PlotticoTrack));
  if(PlotticoTrack.pt_trackedSite && location.href == PlotticoTrack.pt_trackedSite) {
    console.log("Site found! Launching");
    setTimeout(PlotticoTrack.checkSend, PlotticoTrack.pt_waitInterval);
  } else {
    console.log("Site not found! href="+location.href+" but we are tracking "+PlotticoTrack.pt_trackedSite);
  }
});

