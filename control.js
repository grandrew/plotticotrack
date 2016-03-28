window.onload = function(){
    //document.querySelector('input#startupd').onclick=function() {return false;};
    console.log("disabled");
    document.getElementById("selectElement").disabled = true;
      	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
          chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(v) {
            console.log("pong: "+v);
            if(typeof(v) != "undefined" && "ping" in v && v["ping"] == "pong") document.getElementById("selectElement").disabled = false;
          });  
  	});
    document.querySelector('input#settracked').onclick=function() {
      var trackedInfo = {
        "url": document.getElementById("url").value,
        "hash": document.getElementById("hash").value,
        "nindex": parseInt(document.getElementById("nindex").value),
        "xpath": document.getElementById("xpath").value,
        "interval": document.getElementById("checkInt").value
      };
      chrome.storage.sync.set(trackedInfo, function() {
        // Notify that we saved.
        console.log("set values");
      });
      console.log("going to set values");
      return false;
    };
    chrome.storage.sync.get({"url":"", "hash":"", "nindex": -1, "xpath": "", "interval": 5000, "recording": null},function(v){ 
      document.getElementById("url").value = v["url"];
      document.getElementById("hash").value = v["hash"];
      document.getElementById("nindex").value  = v["nindex"];
      document.getElementById("xpath").value = v["xpath"];
      document.getElementById("checkInt").value = v["interval"];
      if(v.recording) {
        document.getElementById("dropRecording").disabled = false;
        document.getElementById("playRecording").disabled = false;
      } else {
        document.getElementById("dropRecording").disabled = true;
        document.getElementById("playRecording").disabled = true;
      }
      
    });
    document.querySelector('input#selectElement').onclick=function() {
      	chrome.tabs.getSelected(null, function(tab) {
      	    console.log("sending message!");
      	    chrome.runtime.sendMessage({action: "select", recorded_tab: tab.id, start_url: ""});
      	    
      	});
      	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {action: "select"}, function(response) {});  
        });
        window.close();
    }
    document.querySelector('input#dropRecording').onclick=function() {
        chrome.storage.sync.set({"recording":null}, function() {
            // Notify that we saved.
            console.log("recording deleted");
        });
    }
    document.querySelector('input#playRecording').onclick=function() {
  	    console.log("will play recording!");
  	    chrome.tabs.getSelected(null, function(tab) {
      	    console.log("sending message!");
      	    chrome.runtime.sendMessage({action: "play", recorded_tab: tab.id, start_url: ""});
      	    
      	});
      	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(tabs[0].id, {action: "play"}, function(response) {});  
        });
        window.close();
    }
};