var manifest = chrome.runtime.getManifest();
if(!("debug" in manifest && manifest.debug) || 'update_url' in manifest) {
    console.log = function(){};
}

