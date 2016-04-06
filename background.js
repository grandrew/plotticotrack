var testcase_items = [];
var tracked_tabs = {};
var active = false;
var firstRun = true;
var empty = true;
var tab_id = null;
/*global chrome, load_list, start_tab, save_list*/
/**
 * Listens for the app launching, then creates the window.
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
 
// chrome.app.runtime.onLaunched.addListener(function(launchData) {
//   chrome.app.window.create(
//     'index.html',
//     {
//       id: 'mainWindow',
//       bounds: {width: 800, height: 600}
//     }
//   );
// });
var EventTypes = {};
EventTypes.OpenUrl = 0;
EventTypes.Click = 1;
EventTypes.Change = 2;
EventTypes.Comment = 3;
EventTypes.Submit = 4;
EventTypes.CheckPageTitle = 5;
EventTypes.CheckPageLocation = 6;
EventTypes.CheckTextPresent = 7;
EventTypes.CheckValue = 8;
EventTypes.CheckValueContains = 9;
EventTypes.CheckText = 10;
EventTypes.CheckHref = 11;
EventTypes.CheckEnabled = 12;
EventTypes.CheckDisabled = 13;
EventTypes.CheckSelectValue = 14;
EventTypes.CheckSelectOptions = 15;
EventTypes.CheckImageSrc = 16;
EventTypes.PageLoad = 17;
EventTypes.ScreenShot = 18;
EventTypes.MouseDown = 19;
EventTypes.MouseUp = 20;
EventTypes.MouseDrag = 21;
EventTypes.MouseDrop = 22;
EventTypes.KeyPress = 23;



chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var callback = sendResponse;
//  console.log(request);
    
//   if (request.action == "checkUrl") { // deprecated
      
//       chrome.tabs.query({}, function(tabs) {
//           tabs.forEach(function(tab) {
//               chrome.tabs.sendMessage(tab.id, request, function(r) {
//                 //   console.log("CheckUrl Response: "+r);
//                   if(r && "working" in r) {
//                         // console.log("SEND CheckUrl Response: "+r);
//                       chrome.tabs.sendMessage(sender.tab.id, r);
//                   }
//                  });
//           });
//       });
//   }
  if (request.action == "append") {
    if(request.obj.type != EventTypes.Click) return;
    testcase_items[testcase_items.length] = request.obj;
    empty = false;
    sendResponse({});
  }
  if (request.action == "poke") {
    if(request.obj.type != TestRecorder.EventTypes.Click) return;
    testcase_items[testcase_items.length - 1] = request.obj;
    sendResponse({});
  }
  if (request.action == "get_status") {
    sendResponse({'active': active, 'empty': empty});
  }
  if (request.action == "start") {
  	if(!active) {
  	    active = true;
  	    empty = true;
  	    testcase_items = new Array();
  	    tab_id = request.recorded_tab;
  	    chrome.tabs.update(tab_id, {url: request.start_url}, function(tab) {
          alert("You are now recording your test sequence.");
          chrome.tabs.sendMessage(tab_id, {action: "open", 'url': request.start_url});
          sendResponse({start: true});
  	    });
  	}
  }
  if (request.action == "stop") {
    active = false;
    chrome.tabs.sendMessage(tab_id, {action: "stop"});
    sendResponse({});
  }
  if (request.action == "get_items") {
	sendResponse({'items': testcase_items});
  }
  if (request.action == "saveRecording") {
    load_list(function(l) {
        var i;
        for(i=0;i<l.length;i++){
            if(l[i].recid == request.recid) {
                var v = l[i];
                v.script = testcase_items;
                save_list(l);
                return;
            }
        }
    });
  }
    if (request.action == "setTrackedTab") {
        console.log("Tracking tab " + request.tabId);
        tracked_tabs[request.tabId] = request; // TODO: do we ever need to remove old tabs?
    }
    if (request.action == "checkTab") {
        console.log("Request from tab: " + sender.tab.id);
        if (sender.tab.id in tracked_tabs) {
            console.log("doing init request");
            tracked_tabs[sender.tab.id].action = "init";
            chrome.tabs.sendMessage(sender.tab.id, tracked_tabs[sender.tab.id]);
            chrome.tabs.insertCSS(sender.tab.id, { "runAt": "document_start", "code":"body { visibility: hidden; }" }, function(){});
        }
        else {
            console.log("requrest to init not authorized");
        }
    }

    // http://stackoverflow.com/questions/7699615/cross-domain-xmlhttprequest-using-background-pages/7699773#7699773 
    if (request.action == "xhttp") {
        var xhttp = new XMLHttpRequest();
        var method = request.method ? request.method.toUpperCase() : 'GET';

        xhttp.onload = function() {
            callback(xhttp.responseText);
        };
        xhttp.onerror = function() {
            // Do whatever you want on error. Don't forget to invoke the
            // callback to clean up the communication port.
            callback();
        };
        xhttp.open(method, request.url, true);
        if (method == 'POST') {
            xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xhttp.send(request.data);
        return true; // prevents the callback from being called too early on return
    }
    
});

function onStart (window) {
    if(!firstRun) return;
    firstRun = false;
    console.log("oncreated fired!");
    chrome.tabs.query({}, function (tabs) {
        if(!tabs.length) {
            console.log("tabs not found!");
            setTimeout(onStart, 400); // onCreated does not fire when browser starts... for some resason
        }
        // http://127.0.0.1:0/?url=%s&interval=%s&caption=%s&phash=%s
        var args = { url: null, interval: null, caption: null, phash: null }, argName, regExp, match;
        var cmdline = false;
        // console.log("tabs found -- "+tabs.length);
        for(var i=0; i<tabs.length; i++) {
            if(tabs[i].url.indexOf("//127.0.0.1:") != -1) {
                for (argName in args) {
                    regExp = new RegExp(argName + "=([^\&]+)");
                    match = regExp.exec(tabs[i].url);
                    if (!match) continue;
                    args[argName] = match[1];
                }
                cmdline = true;
                break;
            }
        }
        console.log("cmdline found: "+args);
        if(cmdline) {
            console.log("Loading data from command line: "+JSON.stringify(args));
            load_list(function(l) {
                if(!l.length) {
                    // 1. set the args to the storage if there are no other args there
                    var l = [{ recid: 0, autostart: true, phash: args.phash, url: decodeURIComponent(args.url), timer: args.interval, caption: decodeURIComponent(args.caption), selector: "", nrindex: -1, script: "" }];
                    save_list(l);
                    // 1.1. open the tab in this case if not tracked already
                }
                // close all other tabs
                var left = false;
                for(var i=0; i<tabs.length; i++) {
                    if(tabs[i].url.indexOf("//127.0.0.1:") == -1 || left) {
                        chrome.tabs.remove(tabs[i].id);
                    } else {
                        left = true;
                    }
                }
                start_tab(l[0].url, l[0].recid);
                // 2. close all the tabs that were open and are not tracked
            });
        } else {
            console.log("no command line args supplied, executing what we have "+tabs.length);
            chrome.windows.getAll(function(windows) {
                console.log("windows amt: "+windows.length);
                if (windows.length == 1) {
                    load_list(function(l) {
                        var i;
                        for(i=0;i<l.length;i++){
                            if(l[i].autostart) {
                                start_tab(l[i].url, l[i].recid);
                            }
                        }
                    });
                }
            });
        }
    });
}



// use like this: chrome "http://127.0.0.1:0/?abc=42&xyz=hello"
chrome.windows.onCreated.addListener(onStart);
setTimeout(onStart, 100); // onCreated does not fire when browser starts... for some resason

// chrome.runtime.getPlatformInfo(function(info) {
//     // Display host OS in the console
//     console.log(info.os); // watch for cros
// }); 