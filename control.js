window.onload = function(){
    //document.querySelector('input#startupd').onclick=function() {return false;};
    document.querySelector('input#settracked').onclick=function() {
      var trackedInfo = {
        "url": document.getElementById("url").value,
        "hash": document.getElementById("hash").value,
        "nindex": parseInt(document.getElementById("nindex").value),
        "xpath": document.getElementById("xpath").value
      };
      chrome.storage.sync.set(trackedInfo, function() {
        // Notify that we saved.
        console.log("set values");
      });
      console.log("going to set values");
      return false;
    };
    chrome.storage.sync.get({"url":"", "hash":"", "nindex": 0, "xpath": ""},function(v){ 
      document.getElementById("url").value = v["url"];
      document.getElementById("hash").value = v["hash"];
      document.getElementById("nindex").value  = v["nindex"];
      document.getElementById("xpath").value = v["xpath"];
    });
};