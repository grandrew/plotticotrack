if (typeof(PlotticoTrack) == "undefined") {
    PlotticoTrack = {};
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

PlotticoTrack.sendToPlot = function(data, hash) {
    (new Image()).src="https://plotti.co/"+hash+"?d="+data+"&h="+Math.random();
};

// TODO HERE: set pt_XPath pt_NumberIndex pt_Hash

PlotticoTrack.trySendInt = setInterval(function(){ // retry sending until we 
  var pt = PlotticoTrack; // TBD correct call seq, e.g. this
  if(pt.pt_XPath && pt.pt_NumberIndex) {
    
    var el = pt.lookupElementByXPath(window.pt_XPath);
    var inData = el.innerHTML;
    var dataList = pt.parseTrackableValues(inData);
    var trackData = dataList[pt.pt_NumberIndex];
    var normalizedData = pt.parseUnits(trackData);
    if(!nomralizedData) return;
    pt.sendToPlot(normalizedData, pt.pt_Hash);
    clearInterval(trySendInt);
  }
},1000);