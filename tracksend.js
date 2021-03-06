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

/*global chrome,load_list,Image,UTILS,XPathEvaluator,XPathResult*/
/*global recorder*/ // defined at recorder.js and included above
/*global get_super_selector, execute_selector, b64_encode_safe, b64_decode_safe, xor*/
/*global atob, btoa, Element, CustomEvent*/
// we are loading page after we have set everything up...
var PlotticoTrack;
if (typeof(PlotticoTrack) == "undefined") {
    PlotticoTrack = {};
    PlotticoTrack.pt_recId = -1; // current record ID
    PlotticoTrack.pt_retry = 0;
    PlotticoTrack.pt_retry_action = 0;
    PlotticoTrack.my_hash = Math.random();
    PlotticoTrack.clickWaiting = -1;
    // PlotticoTrack.unsupported_sites = ["yahoo.com"];
    PlotticoTrack.unsupported_sites = ["chrome.google.com"];
    PlotticoTrack.pt_docListenersCleaned = false;
    PlotticoTrack.pt_xorkey = "00000000000000000000000000000000000000";
    PlotticoTrack.pt_listeners = [];
}

function get_vals(objects) {
    var r = "";
    for (var key in objects) {
        r += objects[key] + " ";
    }
    return r;
}

function removeAllListeners() {
    var removeListenerCode = `
       for(var i=0;i<window.pt_listeners.length;i++) {
           window.pt_listeners[i].target.removeEventListener(window.pt_listeners[i].type, window.pt_listeners[i].listener, window.pt_listeners[i].useCapture);
       }
       console.log("deregistering all listeners...");
       window.pt_stopListen = true;
    `;
    document.documentElement.setAttribute('onreset', removeListenerCode);
    document.documentElement.dispatchEvent(new CustomEvent('reset'));
    document.documentElement.removeAttribute('onreset');
}

var listenCode = `
if(!window.pt_listeners) window.pt_listeners = [];
window.pt_stopListen = false;
var origAddEventListener = Element.prototype.addEventListener;
console.log("patching listener");
function patchedAddEventListener(type, listener, useCapture) {
    if(window.pt_stopListen) {
        console.log("Stopping listener "+type);
        return;
    }
    window.pt_listeners.push({
        "target": this,
        "type": type,
        "listener": listener,
        "useCapture": useCapture
    });
    origAddEventListener.apply(this, arguments);
}

window.constructor.prototype.addEventListener = document.constructor.prototype.addEventListener = Element.prototype.addEventListener = patchedAddEventListener;
`;

// var script = document.createElement('script');
// script.textContent = listenCode;
// (document.head||document.documentElement).appendChild(script);
// script.parentNode.removeChild(script);

var actualCode = '// Some code example \n' + 
                 'console.log(document.documentElement.outerHTML);';

document.documentElement.setAttribute('onreset', listenCode);
document.documentElement.dispatchEvent(new CustomEvent('reset'));
document.documentElement.removeAttribute('onreset');

PlotticoTrack.createXPathFromElement = function(elm) {
    var allNodes = document.getElementsByTagName('*');
    for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) {
        if (elm.hasAttribute('id')) {
            var uniqueIdCount = 0;
            for (var n = 0; n < allNodes.length; n++) {
                if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++;
                if (uniqueIdCount > 1) break;
            }
            if (uniqueIdCount == 1) {
                segs.unshift('id("' + elm.getAttribute('id') + '")');
                return segs.join('/');
            }
            else {
                segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
            }
        }
        else if (elm.hasAttribute('class')) {
            segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]');
        }
        else {
            var i, sib;
            for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
                if (sib.localName == elm.localName) i++;
            }
            segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');
        }
    }
    return segs.length ? '/' + segs.join('/') : null;
};

PlotticoTrack.lookupElementByXPath = function(path) {
    var evaluator = new XPathEvaluator();
    var result = evaluator.evaluate(path, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
};

PlotticoTrack.fullPath = function(el) {
    var names = [];
    while (el.parentNode) {
        if (el.id) {
            names.unshift('[id="' + el.id + '"]'); // TODO: 1. check ID uniq 2. shorten ID
            // check http://stackoverflow.com/a/31281201
            break;
        }
        else {
            if (el == el.ownerDocument.documentElement) names.unshift(el.tagName);
            else {
                for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
                names.unshift(el.tagName + ":nth-child(" + c + ")");
            }
            el = el.parentNode;
        }
    }
    return names.join(" > ");
};

PlotticoTrack.documentQuerySelector = function(sel) {
    return document.querySelector(sel);
};

PlotticoTrack.chromeCopySelector = function (el) {
    return UTILS.cssPath(el,true);
};

var SUPER_ID = ">";
var SUPER_ID_2 = ">2";
var SUPER_ID_3 = ">3";

PlotticoTrack.getCombinedSuperSelector = function(el) {
    if(document.getElementById("pt_blueline").contains(el) || 
        document.getElementById("pt_redline").contains(el) ||
        document.getElementById("pt_yellowline").contains(el))
        return null;
    var ssel = get_super_selector(el);
    if(ssel && execute_selector(ssel) === el) {
        return SUPER_ID_3+b64_encode_safe(JSON.stringify(ssel));
    }
    console.log("warning! could not apply entropy selector, falling back to CSS");
    return PlotticoTrack.chromeCopySelector(el);
};

PlotticoTrack.chooseSelector = function(sel) {
    if(!sel) return null;
    if(sel.startsWith(SUPER_ID_3)) {
        describe_node = describe_node_3;
        return execute_selector(JSON.parse(b64_decode_safe(sel.substring(2))));
    } else if(sel.startsWith(SUPER_ID_2)) {
        describe_node = describe_node_2;
        return execute_selector(JSON.parse(b64_decode_safe(sel.substring(2))));
    } else if(sel[0] == SUPER_ID) {
        console.log("Using old entropy selector");
        var ss = JSON.parse(b64_decode_safe(sel.substring(1)));
        if(ss.length == 4)
            return execute_selector(ss);
        else
            return execute_selector_old(ss);
    }
    console.log("Using default CSS selector");
    return PlotticoTrack.fuzzifiedSelector(sel);
};

function has_identifier(lsel) {
    for(var i=0;i<lsel.length;i++) {
        if(lsel[i].indexOf(".") != -1 || lsel[i].indexOf("#") != -1) return true;
    }
    return false;
}

PlotticoTrack.fuzzifiedSelector = function fuzzs (sel, orig) {
    // console.log(sel);
    if(typeof(sel) == "string") {
        var sel_path = sel.split(" > ");
        return fuzzs(sel_path, sel_path.slice());
    } else {
        var el = document.querySelector(sel.join(" > "));
        if(el) return el;
        
        // now remove a single specificity tag and start over
        var reduced = false;
        var my_sel = sel;
        for(var j=0; j<my_sel.length; j++) {
            if((my_sel[j].split(".").length - 1) > 1) {
                my_sel[j] = my_sel[j].split(".");
                my_sel[j].pop();
                my_sel[j] = my_sel[j].join(".");
                reduced = true;
            }
        }
        
        if(reduced) {
            return fuzzs(my_sel, orig);
        }
        
        // sel = orig.slice()
        orig.shift();
        if(has_identifier(orig)) {
            return fuzzs(orig, orig.slice());
        }
        
        return null;
    }
};

// PlotticoTrack.createSelector = PlotticoTrack.fullPath;
// PlotticoTrack.createSelector = PlotticoTrack.chromeCopySelector;
PlotticoTrack.createSelector = PlotticoTrack.getCombinedSuperSelector;

// PlotticoTrack.querySelector = PlotticoTrack.documentQuerySelector;
// PlotticoTrack.querySelector = PlotticoTrack.fuzzifiedSelector;
PlotticoTrack.querySelector = PlotticoTrack.chooseSelector;

// PlotticoTrack.nrReg = /[-+]?[0-9]*\.?[0-9]+/g;
// PlotticoTrack.nrReg = /[-+]?[0-9]*[\.,]?[0-9]+/g;
// PlotticoTrack.nrReg = /[-+]?[0-9\s\u00a0]*[\.,]?[0-9]+/g;
PlotticoTrack.nrReg = /[-+]?[0-9\s\u00a0,]*[\.]?[0-9]+/g;
PlotticoTrack.parseTrackableValues = function(string) {
    var reg = PlotticoTrack.nrReg;
    var matches = [], found;
    while (found = reg.exec(string)) {
        matches.push(found[0]);
    }
    console.log(matches);
    return matches;
};

PlotticoTrack.parseTrackableIndex = function(string) {
    var reg = PlotticoTrack.nrReg;
    var indexes = [], found;
    // var matches = [];
    while (found = reg.exec(string)) {
        indexes.push(found.index);
        // matches.push(found[0]);
    }
    // console.log("Matching against");
    // console.log(string);
    // console.log(matches);
    return indexes;
};

PlotticoTrack.parseUnits = function (str) {
    // TODO: support scientific notations
    var str = str.trim();
    var lstr = str.split(",");
    if(lstr.length > 1) {
        if(lstr[lstr.length-1].length == 2 || lstr[lstr.length-1].length == 1) { // TODO: support 0,005 15,4256 56,5345435 etc.
            return PlotticoTrack.parseUnitsRUS(str);
        }
    }
    return PlotticoTrack.parseUnitsEU(str);
};

PlotticoTrack.parseUnitsEU = function(str) {
    str = str.replace(/,/g, "");
    str = str.replace(/\s/g,""); // any whitesp
    str = str.replace(/\u00a0/g,""); // nbsp
    // TODO: wolfram|alpha units simplifier / parser? [and cache alpha results w/convert ratio?]
    // cheaper and simpler: x=UnitConvert[Quantity[0.2,"GBit/s"]];x/Quantity[1,QuantityUnit[x]]
    PlotticoTrack.pt_captionHint = str.replace(PlotticoTrack.nrReg, "");
    return parseFloat(str);
};

PlotticoTrack.parseUnitsRUS = function(str) {
    str = str.replace(",", ".");
    str = str.replace(/\s/g,""); // any whitesp
    str = str.replace(/\u00a0/g,""); // nbsp
    // TODO: wolfram|alpha units simplifier / parser? [and cache alpha results w/convert ratio?]
    // cheaper and simpler: x=UnitConvert[Quantity[0.2,"GBit/s"]];x/Quantity[1,QuantityUnit[x]]
    PlotticoTrack.pt_captionHint = str.replace(PlotticoTrack.nrReg, "");
    return parseFloat(str);
};

PlotticoTrack.sendToPlot = function(data, hash) {
    var caption = PlotticoTrack.pt_captionHint;
    if(PlotticoTrack.pt_dataCaption) caption = PlotticoTrack.pt_dataCaption;
    if(caption) data.push(caption.trim());
    var pushSrc = "https://plotti.co/" + hash + "?d=" + data.join(",") + "&h=" + Math.random();
    if(PlotticoTrack.pt_pkey) pushSrc += "&k="+PlotticoTrack.pt_pkey;
    var doneSrc = "http://localhost:8080/notifyDone?phash=" + hash + "&h=" + Math.random();
    PlotticoTrack.xhttp(pushSrc, function(){
        PlotticoTrack.xhttp(doneSrc, function() {});
    });
    
    // http://localhost:8080/notifyDone?phash=
    // console.log("Sending to plot: " + pushSrc);
    // var img = new Image();
    // img.src = pushSrc;
    var notification_sent = {result: false};
    
    document.getElementById("pt_working").innerHTML = "Sent data="+data.join(",");
    // img.onload = function(e) {
    //     PlotticoTrack.bdataSent = true;
    //     // console.log("data successfully sent!");
    //     // retry, clear interval here?
    //     // but need to make sure we send data only once, so in case of good conn - its ok
    //     var img2 = new Image();
    //     img2.src = doneSrc;
    //     var img3 = new Image();
    //     img3.src = doneSrcS;
    //     notification_sent.result = true;
    // };
    // img.onerror = function(e) {
    //     var img2 = new Image();
    //     img2.src = doneSrc;
    //     var img3 = new Image();
    //     img3.src = doneSrcS;
    //     notification_sent.result = true;
    // };
    
    // setTimeout(function() {
    //     if(!notification_sent.result) {
    //         var img2 = new Image();
    //         img2.src = doneSrc;
    //         var img3 = new Image();
    //         img3.src = doneSrcS;
    //     }
    // }, 1000);
};

PlotticoTrack.sendRequest = function(uri, data, cb) {
    console.log("Sending request");
    var req = new XMLHttpRequest();
    req.open("GET", uri, true);
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                console.log("Received: " + req.responseText);
                cb(req.responseText);
            }
        }
    };
    req.send();
};

PlotticoTrack.getTargetContent = function(el) {
    if(el.nodeName == "INPUT") {
        return el.value;
    }
    return el.textContent;
}

PlotticoTrack.getTrackedValue = function() {
    // if any of the elements to track is not found, we just return nothing. The upper page will try to refresh and then fail
    // TODO: this may not be desired behaviour.. but we may not find the element because we need to retry
    var normalizedData = [];
    for(var i=0; i<PlotticoTrack.pt_XPath.length;i++) {
        if(typeof(PlotticoTrack.pt_XPath[i]) != "string" || !PlotticoTrack.pt_XPath[i].length) {
            continue;
        }
        //console.log("Parsing "+i+" xp "+PlotticoTrack.pt_XPath[i]+'  t' + typeof(PlotticoTrack.pt_XPath[i]) );
        var el = PlotticoTrack.querySelector(PlotticoTrack.pt_XPath[i]);
        if (!el) return [];
        var inData = PlotticoTrack.getTargetContent(el);
        //console.log("Parse text "+inData);
        var dataList = PlotticoTrack.parseTrackableValues(inData);
        console.log(dataList);
        if (dataList.length <= parseInt(PlotticoTrack.pt_NumberIndex[i])) return [];
        var trackData = dataList[parseInt(PlotticoTrack.pt_NumberIndex[i])];
        //console.log("Parsing tackdata "+trackData);
        normalizedData[i] = PlotticoTrack.parseUnits(trackData);
    }
    return normalizedData;
};

// function eventFire(el, etype) {
//     if (el.fireEvent) {
//         el.fireEvent('on' + etype);
//     }
//     else {
//         var evObj = document.createEvent('Events');
//         evObj.initEvent(etype, true, false);
//         return el.dispatchEvent(evObj);
//     }
// }

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
    var event = new Event('submit'); // (*)
    elform.dispatchEvent(event);
}

function clickSubmit(elform) {
    var inputs = elform.getElementsByTagName("input");
    for (var j = 0; j < inputs.length; j++) {
        console.log(inputs[j].type.toLowerCase());
        if (inputs[j].type.toLowerCase() == "submit") {
            console.log("found submit!");
            inputs[j].dispatchEvent(new Event("click"));
        }
    }
}

function submitForm(el, elform) {
    var res;
    res = downEnter(el);
    console.log(res);
    res = upEnter(el);
    console.log(res);
    res = sendEnter(el);
    console.log(res);
    res = downEnter(elform);
    console.log(res);
    res = upEnter(elform);
    console.log(res);
    res = sendEnter(elform);
    console.log(res);
    res = sendSubmit(elform);
    console.log(res);
    clickSubmit(elform);
    //elform.submit(); // do not want to submit, but to press enter on an element instead
}

PlotticoTrack.processLoginForm = function() {
    var allforms = document.getElementsByTagName("form");
    for (var i = 0; i < allforms.length; i++) {
        var inputs = allforms[i].getElementsByTagName("input");
        for (var j = 0; j < inputs.length; j++) {
            if (inputs[j].type.toLowerCase() == "password" && inputs[j].value) {
                submitForm(inputs[j], allforms[i]);
            }
        }
    }
    return null;
};

function reposition_panel_bug20574() {
    var panels = document.getElementsByClassName("plotticotrack_panel");
    for(var i=0;i<panels.length;i++) {
        panels[i].style.top=(-50+document.body.scrollTop)+"px";
    }
}

PlotticoTrack.insertPanel = function() {
    
    // continuing add-toolbar.js
    var bodyStyle = document.body.style;
    var cssTransform = 'transform' in bodyStyle ? 'transform' : 'webkitTransform';
    bodyStyle[cssTransform] = 'translateY(50px)';
    
    var xmlHttp = null;
    
    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", chrome.extension.getURL ("templates/panel.css"), true );
    xmlHttp.addEventListener("load", function() {
        
        // var sheet = window.document.styleSheets[0];
        // var ruleNum = 0;
        // if(sheet.cssRules) ruleNum = sheet.cssRules.length;
        // sheet.insertRule(xmlHttp.responseText, ruleNum);
        
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = xmlHttp.responseText;
        document.getElementsByTagName('head')[0].appendChild(style);
        
        xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", chrome.extension.getURL ("templates/panel.html"), true );
        xmlHttp.addEventListener("load", function() {
            var inject  = document.createElement("div");
            inject.id = "plotticotrack_main_panel";
            inject.style.zIndex=99999999;
            setInterval(reposition_panel_bug20574, 300);
            inject.innerHTML = xmlHttp.responseText;
            document.body.appendChild(inject);
            document.body.style.overflow = "visible";
            document.body.style.overflowY = "visible";
            document.body.style.overflowX = "visible";
            
            setup_panel_buttons();
            
            if(PlotticoTrack.pt_recStarted) {
                document.getElementById("pt_recording").innerHTML = "recording";
            }
            if("pt_working" in PlotticoTrack) {
                document.getElementById("plotticotrack_work").style.visibility = "visible";
            }
            if(PlotticoTrack.unsupported()) {
                document.getElementById("plotticotrack_unsupported").style.visibility = "visible";
            } else {
                document.body.style.visibility = "visible";
            }
            var doneSrc = "http://localhost:8080/notifyReady?phash=" + PlotticoTrack.pt_Hash + "&h=" + Math.random();
            PlotticoTrack.xhttp(doneSrc, function() {});
        });
        xmlHttp.send( null );
    });
    xmlHttp.send( null );
};

function setup_panel_buttons() {
    document.getElementById("pt_blueline").onclick = function () {document.dispatchEvent(new CustomEvent('pt_blueclick'));}
    document.getElementById("pt_redline").onclick = function () {document.dispatchEvent(new CustomEvent('pt_redclick'));}
    document.getElementById("pt_yellowline").onclick = function () {document.dispatchEvent(new CustomEvent('pt_yellowclick'));}
    document.getElementById("pt_startupd").onclick = function () {document.dispatchEvent(new CustomEvent('pt_startclick'));}
}

PlotticoTrack.unsupported = function() {
    for(var i=0;i<PlotticoTrack.unsupported_sites.length; i++) {
        if(window.location.href.indexOf(PlotticoTrack.unsupported_sites[i]) != -1) return true;
    }
    return false;
};

PlotticoTrack.xhttp = function(url, cb) {
    chrome.runtime.sendMessage({
        method: 'GET',
        action: 'xhttp',
        url: url,
        data: null
    }, function(responseText) {
        cb();
    });
};

PlotticoTrack.checkSend = function() {
    var pt = PlotticoTrack;
    if (pt.pt_XPath.length) {
        // do a fast replay first
        // if (PlotticoTrack.pt_recIndex < PlotticoTrack.pt_recording.length) {
        //     if(PlotticoTrack.playOne()) {
        //         setTimeout(PlotticoTrack.checkSend, pt.pt_waitInterval);
        //     } else {
        //         setTimeout(PlotticoTrack.checkSend, 100);
        //     }
        //     return;
        // }
        // PlotticoTrack.pt_recIndex = 0; // retry from beginning...
        var normalizedData = PlotticoTrack.getTrackedValue();
        if (!normalizedData.length) {
            if (PlotticoTrack.bdataSent) {
                console.log("Can no longer find the tracked element; reload!");
                window.location.href = PlotticoTrack.pt_trackedSite;
                window.location.reload();
            }
            else {
                console.log("can not get normalizedData; will retry");
                PlotticoTrack.pt_retry++;
                PlotticoTrack.playOne();
                if(PlotticoTrack.pt_retry == 30) {
                    PlotticoTrack.pt_recIndex = 0; // retry from beginning...
                }

                if (PlotticoTrack.pt_retry > 150) {
                    console.log("Failed to wait for the data with retries. Giving up.");
                    document.getElementById("pt_working").innerHTML = "ERROR: Timeout waiting for tracked element!";
                    PlotticoTrack.pt_retry=0;
                    PlotticoTrack.pt_recIndex = 0; // retry from beginning...
                    
                    // var failSrcS = "https://localhost:443/notifyFailed?phash=" + PlotticoTrack.pt_Hash + "&h=" + Math.random();
                    var failSrc = "http://localhost:8080/notifyFailed?phash=" + PlotticoTrack.pt_Hash + "&h=" + Math.random();
                    PlotticoTrack.xhttp(failSrc, function(){});
                    // var img2 = new Image();
                    // img2.src = failSrc;
                    // var img3 = new Image();
                    // img3.src = failSrcS;
                    setTimeout(PlotticoTrack.checkSend, pt.pt_checkInterval);
                    // TODO: send crash report
                    return;
                }
                setTimeout(PlotticoTrack.checkSend, pt.pt_waitInterval);
                return;
            }
        }
        if (pt.pt_oldData && pt.pt_oldData.join(",") == normalizedData.join(",") && PlotticoTrack.bdataSent) {
            // need refresh
            console.log("Will do a full page refresh");
            window.location.reload();
        }
        else {
            // console.log("Old: " + pt.pt_oldData + " New: " + normalizedData);
            pt.pt_oldData = normalizedData;
            pt.sendToPlot(normalizedData, pt.pt_Hash);
            PlotticoTrack.bdataSent = true; // TODO: we set this to always be true; switch to XHR!
            // the problem is that plottico will not return a value if there are no viewers
            // thus the image will never be loaded, and bdataSent not true
            PlotticoTrack.pt_retry=0;
            setTimeout(PlotticoTrack.checkSend, pt.pt_checkInterval);
            // console.log("Will do next check in " + pt.pt_checkInterval + "ms");
        }
    }
    else {}
};

PlotticoTrack.saveSelector = function (e, num) {
    var charIndex = getCaretCharacterOffsetWithin(e.target);
    if(charIndex == null) {
        return;
    }
    var xpath = PlotticoTrack.createSelector(e.target);
    var targetText = PlotticoTrack.getTargetContent(e.target);
    var trackablesIndex = PlotticoTrack.parseTrackableIndex(targetText);
    var dataList =        PlotticoTrack.parseTrackableValues(targetText);
    var min_diff = 99999999;
    var nrIndex = -1;
    for (var i = 0; i < trackablesIndex.length; i++) {
        var trdiff = Math.abs(trackablesIndex[i] - charIndex);
        if (trdiff < min_diff) {
            min_diff = trdiff;
            nrIndex = i;
        }
    }
    console.log("Target text: " + targetText);
    console.log("XPath: " + xpath + " Index: " + nrIndex);
    console.log(charIndex);
    console.log(trackablesIndex);
    PlotticoTrack.pt_XPath[num] = xpath;
    PlotticoTrack.pt_NumberIndex[num] = nrIndex;
    var trackedInfo = {
        "url": PlotticoTrack.pt_trackedSite, //document.location.href,
        "nindex": PlotticoTrack.pt_NumberIndex.join(";"),
        "xpath": PlotticoTrack.pt_XPath.join(";")
    };
    PlotticoTrack.saveValues(trackedInfo);
    return PlotticoTrack.parseUnits(dataList[nrIndex]);
};

// http://stackoverflow.com/a/34693314/2659616
function recreateNode(el, withChildren) {
  console.log("Recreating");
  console.log(el);
  if (withChildren) {
    var newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
  } else {
    var newEl = el.cloneNode(false);
    while (el.hasChildNodes()) newEl.appendChild(el.firstChild);
    el.parentNode.replaceChild(newEl, el);
  }
  return newEl;
}

PlotticoTrack.selectElement = function (num, bt_id) {
    if (PlotticoTrack.pt_recStarted) {
        PlotticoTrack.pt_recStarted = false;
        recorder.stop();
        if(document.getElementById("pt_recording")) document.getElementById("pt_recording").innerHTML = "";
    }
    if(!PlotticoTrack.pt_docListenersCleaned) {
        recreateNode(document.body, true);
        removeAllListeners();
        PlotticoTrack.pt_docListenersCleaned = true;
        setup_panel_buttons();
    }
    chrome.runtime.sendMessage({
        action: "saveRecording",
        page: PlotticoTrack.pt_trackedSite,
        recid: PlotticoTrack.pt_recId
    }); // hope it will complete before we stop and exit...
    PlotticoTrack.clickWaiting = num;

    // console.log("Meaasge action");
    document.getElementById("plotticotrack_message").style.visibility = "visible";
    var sheet = window.document.styleSheets[0];
    // var ruleNum = 0;
    if (sheet.cssRules) ruleNum = sheet.cssRules.length;
    // sheet.insertRule('*:hover { border: 1px solid blue; }', ruleNum);
    var old_mov = document.onmouseover;
    var old_moo = document.onmouseout;
    var old_cl = document.onclick;
    var old_kp = document.onkeypress;
    var old_kd = document.onkeydown;
    var old_ku = document.onkeyup;
    function disable_enter (e) {
        if (e.keyCode == 13 || e.keyCode == 9) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    document.onkeypress = disable_enter;
    document.onkeydown = disable_enter;
    document.onkeyup = disable_enter;
    window.onbeforeunload = function() {
        return "PLOTTICO: BUG! Tried to navigate away from the page. If you leave the page, your setup will be lost. Please click stay on current page and report this issue.";
    };
    document.onmouseover = function(e) {
        e.target.contentEditable = true;
        e.preventDefault();
        e.stopPropagation();
        return false;
    };
    document.onmouseout = function(e) {
        e.target.contentEditable = false;
        e.preventDefault();
        e.stopPropagation();
        return false;
    };
    PlotticoTrack.handleSelectClick = function(e) {
            console.log("click happened!");
            e.preventDefault();
            e.stopPropagation();
            document.getElementById("plotticotrack_message").style.visibility = "hidden";
            document.getElementById("plotticotrack_selector_working").style.visibility = "visible";
            setTimeout(function(){
            var data = PlotticoTrack.saveSelector(e, num);
            PlotticoTrack.clickWaiting = -1;
            document.onmouseover = old_mov;
            document.onmouseout = old_moo;
            document.onclick = old_cl;
            document.onkeypress = old_kp;
            document.onkeydown = old_kd;
            document.onkeyup = old_ku;
            // sheet.deleteRule(ruleNum);
            document.getElementById("pt_startupd").disabled = false;
            // document.getElementById(bt_id).disabled = true;
            var but = document.getElementById(bt_id);
            but.className += but.className ? ' pt_button_done' : 'pt_button_done';
            document.getElementById(bt_id).innerHTML = data;
            document.getElementById("plotticotrack_selector_working").style.visibility = "hidden";
            }, 100);
            return false;
        };
    setTimeout(function () {
        // TODO HERE: use different methods to call this
        document.onclick = PlotticoTrack.handleSelectClick;
    }, 100);
};

// this won't be loaded before we actually set everything (hopefully)
// TODO: remove
chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg == "ready") {
        console.log("background ready");
    }
});

// http://stackoverflow.com/a/7215665/2659616
function getSelectionParentElement() {
    var parentEl = null, sel;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
            parentEl = sel.getRangeAt(0).commonAncestorContainer;
            if (parentEl.nodeType != 1) {
                parentEl = parentEl.parentNode;
            }
        }
    } else if ( (sel = document.selection) && sel.type != "Control") {
        parentEl = sel.createRange().parentElement();
    }
    return parentEl;
}

PlotticoTrack.setFilledPassword = function() {
    var getOb = {};
    getOb[PlotticoTrack.pt_trackedSite] = null;
    chrome.storage.sync.get(getOb,function(v){
        if(!v[PlotticoTrack.pt_trackedSite]) {
            clearInterval(PlotticoTrack.pt_fillInterval);
            console.log("Can not get stored passwords for "+PlotticoTrack.pt_trackedSite);
            return;
        }
        var allInputs = document.getElementsByTagName("input");
        for(var i=0;i<allInputs.length;i++) {
            if(allInputs[i].name) {
                if(allInputs[i].type == "password")  {
                    if(!allInputs[i].value) {
                        if(allInputs[i].name in v[PlotticoTrack.pt_trackedSite])
                            allInputs[i].value = xor(v[PlotticoTrack.pt_trackedSite][allInputs[i].name], PlotticoTrack.pt_xorkey, 1);
                        else
                            console.log("No stored value for password field "+allInputs[i].name);
                    } else {
                        console.log("Already have value for password field "+allInputs[i].name);
                        clearInterval(PlotticoTrack.pt_fillInterval);
                    }
                } else {
                    if(!allInputs[i].value) {
                        if(allInputs[i].name in v[PlotticoTrack.pt_trackedSite])
                            allInputs[i].value = xor(v[PlotticoTrack.pt_trackedSite][allInputs[i].name], PlotticoTrack.pt_xorkey.substring(PlotticoTrack.pt_xorkey.length/2), 1);
                        else
                            console.log("No stored value for field "+allInputs[i].name);
                    } else
                        console.log("Already have value for field "+allInputs[i].name);
                }
            }
            
        }
    });
};

PlotticoTrack.initTracker = function(v) {
    if(typeof(PlotticoTrack.pt_trackedSite) != "undefined" && PlotticoTrack.pt_trackedSite) {
        console.log("Will not init the tracker: "+PlotticoTrack.pt_trackedSite);
        return; // already init
    }
    PlotticoTrack.pt_trackedSite = v["url"];
    PlotticoTrack.pt_recId = v.recid;
    PlotticoTrack.pt_Hash = v["phash"];
    if(v.nrindex && typeof(v.nrindex) == "string") PlotticoTrack.pt_NumberIndex = v["nrindex"].split(";");
    else PlotticoTrack.pt_NumberIndex = [];
    if(v["selector"]) PlotticoTrack.pt_XPath = v["selector"].split(";");
    else PlotticoTrack.pt_XPath = [];
    PlotticoTrack.pt_oldData = false;
    PlotticoTrack.pt_checkInterval = v["timer"] * 1000; // tracking interval
    PlotticoTrack.pt_dataCaption = v["caption"];
    PlotticoTrack.pt_waitInterval = 700; // intervals to check for value while waiting
    PlotticoTrack.pt_captionHint = "";
    PlotticoTrack.pt_recIndex = 0;
    PlotticoTrack.pt_recording = v.script;
    PlotticoTrack.pt_pkey = v.pkey;
    //console.log("local data "+get_vals(PlotticoTrack));
    // init procedure
        // now check that no one is respoinding to this url already
    PlotticoTrack.initall = setTimeout(function (){
        console.log("Site found! Launching");
        PlotticoTrack.insertPanel();
        PlotticoTrack.pt_fillInterval = setInterval(PlotticoTrack.setFilledPassword, 300);
        PlotticoTrack.setFilledPassword();
        if (!PlotticoTrack.pt_XPath.length) {
            console.log("No xpath! Trying recording session");
            document.addEventListener("pt_blueclick", function(){PlotticoTrack.selectElement(0, "pt_blueline");}, false);
            document.addEventListener("pt_redclick", function(){PlotticoTrack.selectElement(1, "pt_redline");}, false);
            document.addEventListener("pt_yellowclick", function(){PlotticoTrack.selectElement(2, "pt_yellowline");}, false);
            document.addEventListener("pt_preventClick", function(e){
                console.log("Event caught! "+ PlotticoTrack.clickWaiting);
                if(PlotticoTrack.clickWaiting != -1) {
                    console.log("Saving selector! "+ PlotticoTrack.clickWaiting);
                    console.log(e.detail);
                    e = { target: getSelectionParentElement(), stopPropagation: function(){}, preventDefault: function(){} };
                    if(typeof(PlotticoTrack.handleSelectClick) != "undefined") PlotticoTrack.handleSelectClick(e);
                    PlotticoTrack.clickWaiting = -1;
                }
            }, false);
            // TODO HERE: what to do when stating?
            document.addEventListener("pt_startclick", function(){
                window.onbeforeunload = null;
                window.location.href = PlotticoTrack.pt_trackedSite; location.reload();
            }, false);
            if (PlotticoTrack.pt_recording) {
                console.log("Recording exists! Not starting recorer");
            }
            else {
                console.log("starting recorer");
                // TestRecorder.ElementInfo.prototype.getCleanCSSSelector = PlotticoTrack.chromeCopySelector;
                TestRecorder.ElementInfo.prototype.getCleanCSSSelector = PlotticoTrack.getCombinedSuperSelector;
                
                recorder.start();
                PlotticoTrack.pt_recStarted = true;
                if(document.getElementById("pt_recording")) document.getElementById("pt_recording").innerHTML = "recording";
            }
        } else {
            PlotticoTrack.pt_checkTimer = setTimeout(PlotticoTrack.checkSend, PlotticoTrack.pt_waitInterval * 2); // need time for auto-fill to fill in form?? // TODO: watch and detect form fill-in
            // setTimeout(function(){console.log("plauone");PlotticoTrack.playOne();}, 5000);
            if(document.getElementById("pt_selectaction") && document.getElementById("pt_working")) {
                document.getElementById("plotticotrack_work").style.visibility = "visible";
            }
            PlotticoTrack.pt_working = true;
        }
    }, 250);
    // chrome.runtime.sendMessage({"action": "checkUrl", "checkUrl": PlotticoTrack.pt_trackedSite, my_hash: PlotticoTrack.my_hash }, function(response) {});
}

// load_list(function(l) { // TODO: deprecate this method in favour of "init" message?
//     var i;
//     for(i=0;i<l.length;i++){
//         if(l[i].url == location.href) {
//             PlotticoTrack.initTracker(l[i]);
//             break;
//         }
//     }
//     if(i == l.length){
//         // console.log("Site not found! href=" + location.href );
//     }
// });

// http://stackoverflow.com/a/4812022/2659616
function getCaretCharacterOffsetWithin(element) {
    if(!element) {
        console.log("WARNING! tried to call getCaretCharacterOffsetWithin on null!");
        return null;
    }
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
    }
    else if ((sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

PlotticoTrack.playRecording = function() {
    if (PlotticoTrack.pt_recIndex >= PlotticoTrack.pt_recording.length) {
        console.log("Replay finished");
        return;
    }
    PlotticoTrack.playOne();
    setTimeout(PlotticoTrack.playRecording, 500);
};

PlotticoTrack.playOne = function() {
    // skip all actions that we do not support
    // var rec={type:-1};
    // while(PlotticoTrack.pt_recIndex < PlotticoTrack.pt_recording.length &&
    //     rec.type != TestRecorder.EventTypes.Click) {
    //     rec = PlotticoTrack.pt_recording[PlotticoTrack.pt_recIndex];
    //     PlotticoTrack.pt_recIndex++;
    // }
    if (!PlotticoTrack.pt_recording) {
        console.log("No recording");
        return;
    }
    var rec = PlotticoTrack.pt_recording[PlotticoTrack.pt_recIndex];

    if (PlotticoTrack.pt_recIndex >= PlotticoTrack.pt_recording.length) {
        console.log("No more actions recorded");
        return false;
    }

    if (!rec) {
        console.log("nothing to play at index " + PlotticoTrack.pt_recIndex);
        return false;
    }
    console.log("Trying to perform action " + rec.type + " on element " + rec.info.selector);
    // var el = document.querySelector(rec.info.selector);
    var el = PlotticoTrack.chooseSelector(rec.info.selector);
    if (!el) {
        console.log("  --- element not found!");
        PlotticoTrack.pt_retry_action++;
        if(PlotticoTrack.pt_retry_action < 3) return false;
    }
    if (el && rec.type == TestRecorder.EventTypes.Click) {
        console.log("Executing click! " + rec.info.selector);
        console.log(el);
        if(rec.text != el.textContent) {
            console.log("not clicking! element textContent does not match: "+rec.text+" != "+el.textContent);
            PlotticoTrack.pt_retry_action++;
            if(PlotticoTrack.pt_retry_action < 3) return false;
        } else {
            PlotticoTrack.do_click(el);
        }
        // el.dispatchEvent(new Event("click"));
    }
    PlotticoTrack.pt_retry_action = 0;
    PlotticoTrack.pt_recIndex++;
    return true;
};

PlotticoTrack.do_click = function (el) {
    var clickEvt = document.createEvent('MouseEvents');
    clickEvt.initEvent(
      'click'     // event type
      ,true     // can bubble?
      ,true      // cancelable?
    );
    el.dispatchEvent(clickEvt);
    // $(el).click();
    // console.log("only click, password: "+document.getElementsByTagName("input")[1].value);
    // el.dispatchEvent(new Event("click"));
};

PlotticoTrack.saveValues = function(trackedInfo) {
    load_list(function(l) {
        var i;
        for(i=0;i<l.length;i++){
            if(!l[i]) {
                console.log("Warning! list "+i+" is "+l[i]);
                continue;
            }
            if(l[i].url == trackedInfo.url) {
                var v = l[i];
                v.nrindex = trackedInfo.nindex;
                v.selector = trackedInfo.xpath;
                save_list(l);
                return;
            }
        }
    });
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // console.log("Meaasge!" + request.action);
    if (request.action == "select") {
        console.log("unsupported");

        sendResponse({});
    }
    // if (request.action == "checkUrl") {
    //     // console.log("Someone requrested answer "+request.my_hash+" my hash "+PlotticoTrack.my_hash);
    //     if(PlotticoTrack.pt_working && PlotticoTrack.pt_trackedSite == request.checkUrl) {
    //         if(request.my_hash != PlotticoTrack.my_hash) {
    //             console.log("answering him!");
    //             sendResponse({"working": PlotticoTrack.pt_working});
    //         }
    //     }
    // }
    //     if(request && "working" in request) {
    //         // console.log("Someone is already working on "+PlotticoTrack.pt_trackedSite+" not starting");
    //         clearTimeout(PlotticoTrack.initall);
    //         if(PlotticoTrack.pt_recStarted) recorder.stop();
    //         if(PlotticoTrack.pt_working) {
    //             document.getElementById("plotticotrack_full_panel").style.display = "none";
    //             var bodyStyle = document.body.style;
    //             var cssTransform = 'transform' in bodyStyle ? 'transform' : 'webkitTransform';
    //             bodyStyle[cssTransform] = 'translateY(0px)';
    //             PlotticoTrack.pt_working = false;
    //             clearTimeout(PlotticoTrack.pt_checkTimer);
    //             }
    // }
    if (request.action == "play") {
        if (PlotticoTrack.pt_recStarted) {
            recorder.stop();
            if(document.getElementById("pt_recording")) document.getElementById("pt_recording").innerHTML = "";
            PlotticoTrack.pt_recStarted = false;
        }
        console.log("Loading recording for play");
        chrome.storage.sync.get({
            "recording": null
        }, function(v) {
            if (!v.recording) {
                console.log("No recrording recorded.");
                return;
            }
            console.log("Starting playback");
            PlotticoTrack.pt_recIndex = 0;
            PlotticoTrack.pt_recording = v.recording;
            PlotticoTrack.playRecording();
        })
    }
    if(request.action == "init") {
        PlotticoTrack.pt_xorkey = request.xorkey;
        console.log("init by request. url: "+request.url+" recid " + request.recid);
        load_list(function(l) {
            var i;
            for(i=0;i<l.length;i++){
                if(l[i].recid == request.recid) {
                    console.log("launching initTracker()");
                    PlotticoTrack.initTracker(l[i]);
                    break;
                }
            }
        });
    }
});

// no need for this as rec is started anew for each new session
// window.addEventListener("beforeunload", function(e){
//     chrome.runtime.sendMessage({
//         action: "deleteRecording"
//     });
// }, false);

window.onload = function (){
    chrome.runtime.sendMessage({"action": "checkTab"}, function(response) {});
};
