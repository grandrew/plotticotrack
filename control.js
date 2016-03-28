/*global makeid,chrome, MutationObserver, vulcanise_inlines, w2ui*/
window.onload = function(){
    
    //document.querySelector('input#startupd').onclick=function() {return false;};
//     console.log("disabled");
//     document.getElementById("selectElement").disabled = true;
//       	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
//           chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(v) {
//             console.log("pong: "+v);
//             if(typeof(v) != "undefined" && "ping" in v && v["ping"] == "pong") document.getElementById("selectElement").disabled = false;
//           });  
//   	});
//     document.querySelector('input#settracked').onclick=function() {
//       var trackedInfo = {
//         "url": document.getElementById("url").value,
//         "hash": document.getElementById("hash").value,
//         "nindex": parseInt(document.getElementById("nindex").value),
//         "xpath": document.getElementById("xpath").value,
//         "interval": document.getElementById("checkInt").value
//       };
//       chrome.storage.sync.set(trackedInfo, function() {
//         // Notify that we saved.
//         console.log("set values");
//       });
//       console.log("going to set values");
//       return false;
//     };
//     chrome.storage.sync.get({"url":"", "hash":"", "nindex": -1, "xpath": "", "interval": 5000, "recording": null},function(v){ 
//       document.getElementById("url").value = v["url"];
//       document.getElementById("hash").value = v["hash"];
//       document.getElementById("nindex").value  = v["nindex"];
//       document.getElementById("xpath").value = v["xpath"];
//       document.getElementById("checkInt").value = v["interval"];
//       if(v.recording) {
//         document.getElementById("dropRecording").disabled = false;
//         document.getElementById("playRecording").disabled = false;
//       } else {
//         document.getElementById("dropRecording").disabled = true;
//         document.getElementById("playRecording").disabled = true;
//       }
      
//     });
//     document.querySelector('input#selectElement').onclick=function() {
//       	chrome.tabs.getSelected(null, function(tab) {
//       	    console.log("sending message!");
//       	    chrome.runtime.sendMessage({action: "select", recorded_tab: tab.id, start_url: ""});
      	    
//       	});
//       	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
//             chrome.tabs.sendMessage(tabs[0].id, {action: "select"}, function(response) {});  
//         });
//         window.close();
//     };
//     document.querySelector('input#dropRecording').onclick=function() {
//         chrome.storage.sync.set({"recording":null}, function() {
//             // Notify that we saved.
//             console.log("recording deleted");
//         });
//     };
//     document.querySelector('input#playRecording').onclick=function() {
//   	    console.log("will play recording!");
//   	    chrome.tabs.getSelected(null, function(tab) {
//       	    console.log("sending message!");
//       	    chrome.runtime.sendMessage({action: "play", recorded_tab: tab.id, start_url: ""});
      	    
//       	});
//       	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
//             chrome.tabs.sendMessage(tabs[0].id, {action: "play"}, function(response) {});  
//         });
//         window.close();
//     };
    
    $(function () {
        $('#grid').w2grid({
            name: 'grid',
            header: 'List of Tracks',
            show: {
                toolbar: true,
                footer: true,
                toolbarReload   : false,
                toolbarColumns  : true,
                toolbarSearch   : false,
                toolbarAdd      : true,
                toolbarDelete   : true,
                toolbarSave     : false,
                toolbarEdit     : false
            },
            toolbar: {
                items: [
                    { type: 'break' },
                    { type: 'button', id: 'gourl', caption: 'Visit site url and start', img: 'icon-search', disabled: true},
                    { type: 'break' },
                    { type: 'button', id: 'goplot', caption: 'View plot', img: 'icon-page', disabled: true},
                    { type: 'html', html: '<div style="width: 240px;text-align: right;"><a href="https://plotti.co" target="_blank">plotti.co</a> site tracker</div>'},
                ],
                onClick: function (target, data) {
                    if(target == "gourl") {
                        var sel = w2ui.grid.getSelection();
                        for(var i=0;i<sel.length;i++) {
                            //console.log("will open" + w2ui.grid.get(sel[i]).url);
                            var url = w2ui.grid.get(sel[i]).url;
                            // var win = window.open(url, '_blank');
                            chrome.tabs.create({
                                url: url
                            });
                        }
                        // win.focus();
                    }
                    if(target == "goplot") {
                        var sel = w2ui.grid.getSelection();
                        for(var i=0;i<sel.length;i++) {
                            //console.log("will open" + w2ui.grid.get(sel[i]).url);
                            var url = "https://plotti.co/"+w2ui.grid.get(sel[i]).phash;
                            // var win = window.open(url, '_blank');
                            chrome.tabs.create({
                                url: url
                            });
                        }
                        // win.focus();
                    }
                }
            },
            columns: [
                { field: 'rdy', caption: 'Enabled', size: '5%', render: 'toggle'},
                { field: 'phash', caption: 'Plotti.co Hash', size: '15%', editable: { type : 'text', inTag : '', style   : '' }},
                { field: 'url', caption: 'Track URL', size: '50%', editable: { type : 'text', inTag : '', style   : '' } },
                { field: 'timer', caption: 'Timer (s)', size: '10%', editable: { type : 'int', inTag : '', style   : '' } },
                { field: 'caption', caption: 'Data caption', size: '120px', editable: { type : 'text', inTag : '', style   : '' } },
                { field: 'selector', caption: 'Selector', size: '30%', hidden: true, editable: { type : 'text', inTag : '', style   : '' }},
                { field: 'nrindex', caption: 'NRIndex', size: '10%', hidden: true, editable: { type : 'int', inTag : '', style   : '' } },
                { field: 'script', caption: 'Script', size: '30%', hidden: true, editable: { type : 'text', inTag : '', style   : '' } }
            ],
            records: [
                // { recid: 1, rdy: true, phash: "asdfgre", url: "http://rbc.ru", timer: 5700, caption: 'bps', selector: "a > b>d sdfasdfasdfasd fasdf asd fasfds asdf asd", nrindex: 2, script: "[1,2,3,4]" },
                // { recid: 2, rdy: true,phash: "asdfgre", url: "http://rbc.ru", timer: 5700, caption: 'bps', selector: "a > b>d sdfasdfasdfasd fasdf asd fasfds asdf asd", nrindex: 2, script: "[1,2,3,4]"  },
                // { recid: 3, rdy: false,phash: "asdfgre", url: "http://rbc.ru", timer: 5700, caption: 'bps', selector: "a > b>d sdfasdfasdfasd fasdf asd fasfds asdf asd", nrindex: 2, script: "[1,2,3,4]"  },
                // { recid: 4, rdy: true,phash: "asdfgre", url: "http://rbc.ru", timer: 5700, caption: 'bps', selector: "a > b>d sdfasdfasdfasd fasdf asd fasfds asdf asd", nrindex: 2, script: "[1,2,3,4]"  },
                // { recid: 5, rdy: true,phash: "asdfgre", url: "http://rbc.ru", timer: 5700, caption: 'bps', selector: "a > b>d sdfasdfasdfasd fasdf asd fasfds asdf asd", nrindex: 2, script: "[1,2,3,4]"  },
                // { recid: 6, rdy: true,phash: "asdfgre", url: "http://rbc.ru", timer: 5700, caption: 'bps', selector: "a > b>d sdfasdfasdfasd fasdf asd fasfds asdf asd", nrindex: 2, script: "[1,2,3,4]"  },
                // { recid: 7, rdy: true,phash: "asdfgre", url: "http://rbc.ru", timer: 5700, caption: 'bps', selector: "a > b>d sdfasdfasdfasd fasdf asd fasfds asdf asd", nrindex: 2, script: "[1,2,3,4]"  },
            ]
        });
    });
    vulcanise_inlines();
    // $(document).bind('domChanged', function(){
    //     console.log("mutata");
    //     vulcanise_inlines();
    // });
    
    // select the target node
    var target = document.body;
     
    // create an observer instance
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        //console.log(mutation.type);
        vulcanise_inlines();
      });    
    });
     
    // configuration of the observer:
    var config = { /*attributes: true,*/ childList: true, characterData: true, subtree: true };
     
    // pass in the target node, as well as the observer options
    observer.observe(target, config);
     
    // later, you can stop observing
    // observer.disconnect();
    //var sel = grid.getSelection();
    w2ui.grid.on('add', function(event) {
        var nrid = 1;
        if(w2ui.grid.records.length) nrid = w2ui.grid.records[w2ui.grid.records.length-1].recid+1;
        w2ui['grid'].add({ recid: nrid, phash: makeid(), url: "", timer: 60*5, caption: '', selector: "", nrindex: -1, script: "" });
        w2ui.grid.editField(nrid, 2);
    });
    
    w2ui.grid.on('select', function(event) {
        w2ui['grid'].toolbar.enable('gourl');
        w2ui['grid'].toolbar.enable('goplot');
    });
    
    w2ui.grid.on('unselect', function(event) {
        w2ui['grid'].toolbar.disable('gourl');
        w2ui['grid'].toolbar.disable('goplot');
    });
    w2ui.grid.on('change', function(event) {
        event.onComplete = function () {
            var ch = w2ui.grid.getChanges();
            if(ch.length != 1) {
                console.log("do not know what to do: changed "+ch.length);
                return;
            }
            for(var i=0;i<w2ui.grid.records.length;i++) {
                if("url" in ch[0] && ch[0].url == w2ui.grid.records[i].url) {
                    return;
                }
            }
            w2ui.grid.mergeChanges(); // TODO: make use of red dot? - delete "yes" fiesd?
            chrome.storage.sync.set({"tracklist": w2ui.grid.records}, function() {
                console.log("set values");
            });
        };
    });
    w2ui.grid.on('delete', function(event) {
        event.onComplete = function() {
            w2ui.grid.mergeChanges();
            chrome.storage.sync.set({"tracklist": w2ui.grid.records}, function() {
                console.log("set values");
            });
        };
    });
    
    chrome.storage.sync.get({"tracklist": []},function(v){ 
        w2ui.grid.records = v.tracklist;
        w2ui.grid.refresh();
    });
    
};