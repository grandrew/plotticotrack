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

PlotticoTrack.fullPath = function(el){
  var names = [];
  while (el.parentNode){
    if (el.id){
      names.unshift('#'+el.id);
      break;
    }else{
      if (el==el.ownerDocument.documentElement) names.unshift(el.tagName);
      else{
        for (var c=1,e=el;e.previousElementSibling;e=e.previousElementSibling,c++);
        names.unshift(el.tagName+":nth-child("+c+")");
      }
      el=el.parentNode;
    }
  }
  return names.join(" > ");
}

PlotticoTrack.documentQuerySelector = function (sel) {
  return document.querySelector(sel);
};

PlotticoTrack.createSelector = PlotticoTrack.fullPath;
PlotticoTrack.querySelector = PlotticoTrack.documentQuerySelector;

PlotticoTrack.parseTrackableValues = function(string) { 
    var reg = /[-+]?[0-9]*\.?[0-9]+?/g;
    var matches = [], found;
    while (found = reg.exec(string)) {
        matches.push(found[0]);
    }
    return matches;
};

PlotticoTrack.parseTrackableIndex = function(string) { 
    var reg = /[-+]?[0-9]*\.?[0-9]+?/g;
    var indexes = [], found;
    while (found = reg.exec(string)) {
        indexes.push(found.index);
    }
    return indexes;
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
    var el = PlotticoTrack.querySelector(PlotticoTrack.pt_XPath);
    var inData = el.innerHTML;
    var dataList = PlotticoTrack.parseTrackableValues(inData);
    var trackData = dataList[PlotticoTrack.pt_NumberIndex];
    var normalizedData = PlotticoTrack.parseUnits(trackData);
    return normalizedData;
};

function eventFire(el, etype){
  if (el.fireEvent) {
    el.fireEvent('on' + etype);
  } else {
    var evObj = document.createEvent('Events');
    evObj.initEvent(etype, true, false);
    return el.dispatchEvent(evObj);
  }
}

function sendEnter(el) {
    var keyboardEvent = document.createEvent("KeyboardEvent");
    var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
    keyboardEvent[initMethod](
                       "keypress", // event type : keydown, keyup, keypress
                        true, // bubbles
                        true, // cancelable
                        window, // viewArg: should be window
                        false, // ctrlKeyArg
                        false, // altKeyArg
                        false, // shiftKeyArg
                        false, // metaKeyArg
                        13, // keyCodeArg : unsigned long the virtual key code, else 0
                        0 // charCodeArgs : unsigned long the Unicode character associated with the depressed key, else 0
    );
    return document.dispatchEvent(keyboardEvent);
}
function downEnter(el) {
    var keyboardEvent = document.createEvent("KeyboardEvent");
    var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
    keyboardEvent[initMethod](
                       "keydown", // event type : keydown, keyup, keypress
                        true, // bubbles
                        true, // cancelable
                        window, // viewArg: should be window
                        false, // ctrlKeyArg
                        false, // altKeyArg
                        false, // shiftKeyArg
                        false, // metaKeyArg
                        13, // keyCodeArg : unsigned long the virtual key code, else 0
                        0 // charCodeArgs : unsigned long the Unicode character associated with the depressed key, else 0
    );
    return document.dispatchEvent(keyboardEvent);
}
function upEnter(el) {
    var keyboardEvent = document.createEvent("KeyboardEvent");
    var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
    keyboardEvent[initMethod](
                       "keyup", // event type : keydown, keyup, keypress
                        true, // bubbles
                        true, // cancelable
                        window, // viewArg: should be window
                        false, // ctrlKeyArg
                        false, // altKeyArg
                        false, // shiftKeyArg
                        false, // metaKeyArg
                        13, // keyCodeArg : unsigned long the virtual key code, else 0
                        0 // charCodeArgs : unsigned long the Unicode character associated with the depressed key, else 0
    );
    return document.dispatchEvent(keyboardEvent);
}

function sendSubmit(elform) {
    var event = new Event('submit');  // (*)
    elform.dispatchEvent(event); 
}

function clickSubmit(elform) {
        var inputs = elform.getElementsByTagName("input");
        for(var j=0;j<inputs.length;j++) {
          console.log(inputs[j].type.toLowerCase());
            if(inputs[j].type.toLowerCase() == "submit") {
              console.log("found submit!");
                inputs[j].dispatchEvent(new Event("click"));
            }
        }
}

function submitForm(el, elform) {
    var res;
    res=downEnter(el);
    console.log(res);
    res=upEnter(el);
    console.log(res);
    res=sendEnter(el);
    console.log(res);
    res=downEnter(elform);
    console.log(res);
    res=upEnter(elform);
    console.log(res);
    res=sendEnter(elform);
    console.log(res);
    res=sendSubmit(elform);
    console.log(res);
    clickSubmit(elform);
    //elform.submit(); // do not want to submit, but to press enter on an element instead
}

PlotticoTrack.processLoginForm = function () {
    var allforms =  document.getElementsByTagName("form");
    for(var i=0; i<allforms.length;i++) {
        var inputs = allforms[i].getElementsByTagName("input");
        for(var j=0;j<inputs.length;j++) {
            if(inputs[j].type.toLowerCase() == "password" && inputs[j].value) {
                submitForm(inputs[j], allforms[i]);
            }
        }
    }
    return null;
};

PlotticoTrack.checkSend = function () {
  var pt = PlotticoTrack;
  if(pt.pt_XPath && typeof(pt.pt_NumberIndex) != "undefined") {
    normalizedData = PlotticoTrack.getTrackedValue();
    if(!normalizedData) {
      console.log("can not get normalizedData; will retry");
      // TODO: try to do login here/replay script in case we have several failures
      PlotticoTrack.processLoginForm();
      setTimeout(PlotticoTrack.checkSend, pt.pt_waitInterval);
      return;
    }
    if(pt.pt_oldData == normalizedData && PlotticoTrack.bdataSent) {
      // need refresh
      console.log("Will do a full page refresh");
      location.reload();
    } else {
      pt.pt_oldData = normalizedData;
      pt.sendToPlot(normalizedData, pt.pt_Hash);
      setTimeout(PlotticoTrack.checkSend, pt.pt_checkInterval);
      console.log("Will do next check in "+pt.pt_checkInterval+"ms");
    }
  } else {
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

function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("Meaasge!"+request.action);
    if (request.action == "select") {
        console.log("Meaasge action");
        var sheet = window.document.styleSheets[0]
        var ruleNum = sheet.cssRules.length;
        sheet.insertRule('*:hover { border: 1px solid blue; }', ruleNum);
        var old_mov=document.onmouseover;
        var old_moo=document.onmouseout;
        var old_cl=document.onclick;
        document.onmouseover=function(e) {e.target.contentEditable=true;};
        document.onmouseout=function(e) {e.target.contentEditable=false;};
        document.onclick=function(e) {
          e.preventDefault(); 
          var charIndex = getCaretCharacterOffsetWithin(e.target);
          var xpath = PlotticoTrack.createSelector(e.target);
          var targetText = e.target.innerHTML;
          var trackables = PlotticoTrack.parseTrackableValues(targetText);
          var trackablesIndex = PlotticoTrack.parseTrackableIndex(targetText);
          var min_diff = 99999999;
          var nrIndex = -1;
          for(var i=0; i<trackablesIndex.length;i++) {
              var trdiff = Math.abs(trackablesIndex[i] - charIndex);
              if(trdiff < min_diff) {
                min_diff = trdiff;
                nrIndex = i;
              }
          }
          console.log("Target text: "+targetText);
          console.log("XPath: "+xpath+" Index: "+nrIndex);
          console.log(charIndex);
          console.log(trackablesIndex);
          var trackedInfo = {
            "url": document.location.href,
            "nindex": nrIndex,
            "xpath": xpath
          };
          chrome.storage.sync.set(trackedInfo, function() {
            // Notify that we saved.
            console.log("set values");
          });
          document.onmouseover=old_mov;
          document.onmouseout=old_moo;
          document.onclick=old_cl;
          sheet.deleteRule(ruleNum);
          return false;
        };
        sendResponse({});
    }
});
