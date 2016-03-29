/*global chrome*/
/*global recorder*/ // defined at recorder.js and included above
// we are loading page after we have set everything up...
var PlotticoTrack;
if (typeof(PlotticoTrack) == "undefined") {
    PlotticoTrack = {};
    PlotticoTrack.pt_retry = 0;
}

function get_vals(objects) {
    var r = "";
    for (var key in objects) {
        r += objects[key] + " ";
    }
    return r;
}


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

PlotticoTrack.createSelector = PlotticoTrack.fullPath;
PlotticoTrack.querySelector = PlotticoTrack.documentQuerySelector;
// PlotticoTrack.nrReg = /[-+]?[0-9]*\.?[0-9]+/g;
PlotticoTrack.nrReg = /[-+]?[0-9]*[\.,]?[0-9]+/g;
PlotticoTrack.parseTrackableValues = function(string) {
    var reg = PlotticoTrack.nrReg;
    var matches = [],
        found;
    while (found = reg.exec(string)) {
        matches.push(found[0]);
    }
    return matches;
};

PlotticoTrack.parseTrackableIndex = function(string) {
    var reg = PlotticoTrack.nrReg;
    var indexes = [],
        found;
    while (found = reg.exec(string)) {
        indexes.push(found.index);
    }
    return indexes;
};

PlotticoTrack.parseUnits = function(str) {
    str = str.replace(",", ".");
    // TODO: wolfram|alpha units simplifier / parser? [and cache alpha results w/convert ratio?]
    // cheaper and simpler: x=UnitConvert[Quantity[0.2,"GBit/s"]];x/Quantity[1,QuantityUnit[x]]
    PlotticoTrack.pt_captionHint = str.replace(PlotticoTrack.nrReg, "");
    return parseFloat(str);
};

PlotticoTrack.sendToPlot = function(data, hash) {
    var caption = PlotticoTrack.pt_captionHint;
    if(PlotticoTrack.pt_dataCaption) caption = PlotticoTrack.pt_dataCaption;
    var pushSrc = "https://plotti.co/" + hash + "?d=" + data.join(",") + caption.trim() + "&h=" + Math.random();
    console.log("Sending to plot: " + pushSrc);
    var img = new Image();
    img.src = pushSrc;
    document.getElementById("pt_working").innerHTML = "Sent data="+data.join(",");
    img.onload = function(e) {
        PlotticoTrack.bdataSent = true;
        console.log("data successfully sent!");
        // retry, clear interval here?
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
                console.log("Received: " + req.responseText);
                cb(req.responseText);
            }
        }
    };
    req.send();
};

PlotticoTrack.getTrackedValue = function() {
    var normalizedData = [];
    for(var i=0; i<PlotticoTrack.pt_XPath.length;i++) {
        if(typeof(PlotticoTrack.pt_XPath[i]) != "string" || !PlotticoTrack.pt_XPath[i].length) {
            continue;
        }
        //console.log("Parsing "+i+" xp "+PlotticoTrack.pt_XPath[i]+'  t' + typeof(PlotticoTrack.pt_XPath[i]) );
        var el = PlotticoTrack.querySelector(PlotticoTrack.pt_XPath[i]);
        if (!el) return false;
        var inData = el.innerHTML;
        //console.log("Parse text "+inData);
        var dataList = PlotticoTrack.parseTrackableValues(inData);
        //console.log(dataList);
        if (dataList.length <= parseInt(PlotticoTrack.pt_NumberIndex[i])) return false;
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
            inject.innerHTML = xmlHttp.responseText;
            document.body.appendChild(inject);
            if("pt_working" in PlotticoTrack) {
                document.getElementById("plotticotrack_work").style.visibility = "visible";
            }
        });
        xmlHttp.send( null );
    });
    xmlHttp.send( null );
};

PlotticoTrack.checkSend = function() {
    var pt = PlotticoTrack;
    if (pt.pt_XPath.length) {
        var normalizedData = PlotticoTrack.getTrackedValue();
        if (!normalizedData) {
            if (PlotticoTrack.bdataSent) {
                console.log("Can no longer find the tracked element; reload!");
                window.location.href = PlotticoTrack.pt_trackedSite;
                location.reload();
            }
            else {
                console.log("can not get normalizedData; will retry");
                PlotticoTrack.pt_retry++;
                PlotticoTrack.playOne();

                if (PlotticoTrack.pt_retry > 30) {
                    console.log("Failed to wait for the data for 100 retries. Giving up.");
                    return;
                }
                setTimeout(PlotticoTrack.checkSend, pt.pt_waitInterval);
                return;
            }
        }
        if (pt.pt_oldData && pt.pt_oldData.join(",") == normalizedData.join(",") && PlotticoTrack.bdataSent) {
            // need refresh
            console.log("Will do a full page refresh");
            location.reload();
        }
        else {
            console.log("Old: " + pt.pt_oldData + " New: " + normalizedData);
            pt.pt_oldData = normalizedData;
            pt.sendToPlot(normalizedData, pt.pt_Hash);
            PlotticoTrack.bdataSent = true; // TODO: we set this to always be true; switch to XHR!
            // the problem is that plottico will not return a value if there are no viewers
            // thus the image will never be loaded, and bdataSent not true
            setTimeout(PlotticoTrack.checkSend, pt.pt_checkInterval);
            console.log("Will do next check in " + pt.pt_checkInterval + "ms");
        }
    }
    else {}
};

PlotticoTrack.selectElement = function (num, bt_id) {
    if (PlotticoTrack.pt_recStarted) {
        PlotticoTrack.pt_recStarted = false;
        recorder.stop();
    }
    chrome.runtime.sendMessage({
        action: "saveRecording",
        page: PlotticoTrack.pt_trackedSite
    }); // hope it will complete before we stop and exit...

    console.log("Meaasge action");
    document.getElementById("plotticotrack_message").style.visibility = "visible";
    var sheet = window.document.styleSheets[0];
    var ruleNum = 0;
    if (sheet.cssRules) ruleNum = sheet.cssRules.length;
    sheet.insertRule('*:hover { border: 1px solid blue; }', ruleNum);
    var old_mov = document.onmouseover;
    var old_moo = document.onmouseout;
    var old_cl = document.onclick;
    var old_kp = document.onkeypress;
    var old_kd = document.onkeydown;
    var old_ku = document.onkeyup;
    function disable_enter (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    document.onkeypress = disable_enter;
    document.onkeydown = disable_enter;
    document.onkeyup = disable_enter;
    document.onmouseover = function(e) {
        e.target.contentEditable = true;
    };
    document.onmouseout = function(e) {
        e.target.contentEditable = false;
    };
    setTimeout(function () {
        document.onclick = function(e) {
            console.log("click happened!");
            e.preventDefault();
            e.stopPropagation();
            var charIndex = getCaretCharacterOffsetWithin(e.target);
            var xpath = PlotticoTrack.createSelector(e.target);
            var targetText = e.target.innerHTML;
            var trackables = PlotticoTrack.parseTrackableValues(targetText);
            var trackablesIndex = PlotticoTrack.parseTrackableIndex(targetText);
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
                "url": document.location.href,
                "nindex": PlotticoTrack.pt_NumberIndex.join(";"),
                "xpath": PlotticoTrack.pt_XPath.join(";")
            };
            PlotticoTrack.saveValues(trackedInfo);
            document.onmouseover = old_mov;
            document.onmouseout = old_moo;
            document.onclick = old_cl;
            document.onkeypress = old_kp;
            document.onkeydown = old_kd;
            document.onkeyup = old_ku;
            sheet.deleteRule(ruleNum);
            document.getElementById("pt_startupd").disabled = false;
            document.getElementById(bt_id).disabled = true;
            document.getElementById("plotticotrack_message").style.visibility = "hidden";
            return false;
        };
    }, 100);
};


// this won't be loaded before we actually set everything (hopefully)
// TODO: remove
chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg == "ready") {
        console.log("background ready");
    }
});

// chrome.storage.sync.get({
//     "url": "",
//     "hash": "",
//     "nindex": -1,
//     "xpath": "",
//     "interval": 5000,
//     "recording": null
// }, function(v) {
//     PlotticoTrack.pt_trackedSite = v["url"];
//     PlotticoTrack.pt_Hash = v["hash"];
//     PlotticoTrack.pt_NumberIndex = v["nindex"];
//     PlotticoTrack.pt_XPath = v["xpath"];
//     PlotticoTrack.pt_oldData = false;
//     PlotticoTrack.pt_checkInterval = v["interval"]; // tracking interval
//     PlotticoTrack.pt_waitInterval = 700; // intervals to check for value while waiting
//     PlotticoTrack.pt_recIndex = 0;
//     PlotticoTrack.pt_recording = v.recording;
//     //console.log("local data "+get_vals(PlotticoTrack));
//     if (PlotticoTrack.pt_trackedSite && location.href == PlotticoTrack.pt_trackedSite) {
//         console.log("Site found! Launching");
//         PlotticoTrack.insertPanel();
//         if (!PlotticoTrack.pt_XPath) {
//             console.log("No xpath! Trying recording session");
//             if (PlotticoTrack.pt_recording) {
//                 console.log("Recording exists! Not starting recorer");
//             }
//             else {
//                 console.log("starting recorer");
//                 recorder.start();
//                 PlotticoTrack.pt_recStarted = true;
//             }
//         }
//         else {
//             PlotticoTrack.pt_checkTimer = setTimeout(PlotticoTrack.checkSend, PlotticoTrack.pt_waitInterval);
//         }
//     }
//     else {
//         console.log("Site not found! href=" + location.href + " but we are tracking " + PlotticoTrack.pt_trackedSite);
//     }
// });

chrome.storage.sync.get({
    "tracklist": []
}, function(l) {
    var i;
    for(i=0;i<l.tracklist.length;i++){
        if(l.tracklist[i].url == location.href) {
            var v = l.tracklist[i];
            PlotticoTrack.pt_trackedSite = v["url"];
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
            //console.log("local data "+get_vals(PlotticoTrack));
            if (PlotticoTrack.pt_trackedSite && location.href == PlotticoTrack.pt_trackedSite) {
                console.log("Site found! Launching");
                PlotticoTrack.insertPanel();
                if (!PlotticoTrack.pt_XPath.length) {
                    console.log("No xpath! Trying recording session");
                    document.addEventListener("pt_blueclick", function(){PlotticoTrack.selectElement(0, "pt_blueline");}, false);
                    document.addEventListener("pt_redclick", function(){PlotticoTrack.selectElement(1, "pt_redline");}, false);
                    document.addEventListener("pt_yellowclick", function(){PlotticoTrack.selectElement(2, "pt_yellowline");}, false);
                    // TODO HERE: what to do when stating?
                    document.addEventListener("pt_startclick", function(){window.location.href = PlotticoTrack.pt_trackedSite; location.reload();}, false);
                    if (PlotticoTrack.pt_recording) {
                        console.log("Recording exists! Not starting recorer");
                    }
                    else {
                        console.log("starting recorer");
                        recorder.start();
                        PlotticoTrack.pt_recStarted = true;
                    }
                } else {
                    PlotticoTrack.pt_checkTimer = setTimeout(PlotticoTrack.checkSend, PlotticoTrack.pt_waitInterval);
                    if(document.getElementById("pt_selectaction") && document.getElementById("pt_working")) {
                        document.getElementById("plotticotrack_work").style.visibility = "visible";
                    }
                    PlotticoTrack.pt_working = true;
                }
            }
            break;
        }
    }
    if(i == l.tracklist.length){
        console.log("Site not found! href=" + location.href );
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
        return;
    }

    if (!rec) {
        console.log("nothing to play at index " + PlotticoTrack.pt_recIndex);
        return;
    }
    console.log("Trying to perform action " + rec.type + " on element " + rec.info.selector);
    var el = document.querySelector(rec.info.selector);
    if (!el) console.log("  --- element not found!");
    if (el && rec.type == TestRecorder.EventTypes.Click) {
        console.log("Executing click!");
        el.dispatchEvent(new Event("click"));
    }
    PlotticoTrack.pt_recIndex++;
};

PlotticoTrack.saveValues = function(trackedInfo) {
    chrome.storage.sync.get({"tracklist": []}, function(l) {
        var i;
        for(i=0;i<l.tracklist.length;i++){
            if(l.tracklist[i].url == location.href) {
                var v = l.tracklist[i];
                v.nrindex = trackedInfo.nindex;
                v.selector = trackedInfo.xpath;
                v.rdy = true;
                chrome.storage.sync.set({ "tracklist": l.tracklist }, function() {
                    // Notify that we saved.
                    console.log("set values");
                });
                return;
            }
        }
    });
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Meaasge!" + request.action);
    if (request.action == "select") {
        console.log("unsupported");

        sendResponse({});
    }
    if (request.action == "play") {
        if (PlotticoTrack.pt_recStarted) {
            recorder.stop();
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
    if (request.action == "ping") {
        if ("pt_trackedSite" in PlotticoTrack && location.href == PlotticoTrack.pt_trackedSite) {
            sendResponse({
                "ping": "pong"
            });
        }
    }


});
