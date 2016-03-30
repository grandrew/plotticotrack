var testcase_items = [];
var tracked_tabs = {};
var active = false;
var empty = true;
var tab_id = null;
/*global chrome*/
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

// use like this: chrome "http://127.0.0.1:0/?abc=42&xyz=hello"
chrome.windows.onCreated.addListener(function (window) {
    chrome.tabs.query({}, function (tabs) {
        var args = { abc: null, xyz: null }, argName, regExp, match;
        for (argName in args) {
            regExp = new RegExp(argName + "=([^\&]+)")
            match = regExp.exec(tabs[0].url);
            if (!match) return;
            args[argName] = match[1];
        }
        console.log(JSON.stringify(args));
        // TODO HERE: either load the supplied arguments (hash, user-id, etc.)
        //          or read the data from storage and set it to the page
        
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//  console.log(request);
    if(request.action == "checkTab") {
        console.log("Requiest from tab: "+sender.tab.id);
          if (sender.tab.id in tracked_tabs) {
              console.log("doing init request");
              chrome.tabs.sendMessage(sender.tab.id, {"action": "init", "url": tracked_tabs[sender.tab.id] });
          } else {
              console.log("requrest to init not authorized");
          }
    }
  if (request.action == "checkUrl") {
      
      chrome.tabs.query({}, function(tabs) {
          tabs.forEach(function(tab) {
              chrome.tabs.sendMessage(tab.id, request, function(r) {
                //   console.log("CheckUrl Response: "+r);
                  if(r && "working" in r) {
                        // console.log("SEND CheckUrl Response: "+r);
                      chrome.tabs.sendMessage(sender.tab.id, r);
                  } 
                 });
          });
      });
  }
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
            if(l[i].url == request.page) {
                var v = l[i];
                v.script = testcase_items;
                save_list(l);
                return;
            }
        }
    });
  }
  if(request.action == "setTrackedTab") {
      console.log("Tracking tab "+request.tabId);
      tracked_tabs[request.tabId] = request.url; // TODO: do we ever need to remove old tabs?
  }
});