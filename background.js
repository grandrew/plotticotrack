/**
 * Listens for the app launching, then creates the window.
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function(launchData) {
  chrome.app.window.create(
    'index.html',
    {
      id: 'mainWindow',
      bounds: {width: 800, height: 600}
    }
  );
});


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
