var manifest = chrome.runtime.getManifest();
if(!("debug" in manifest && manifest.debug)) {
    console.log = function(){};
}

