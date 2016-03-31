/*global makeid,chrome, MutationObserver, vulcanise_inlines, w2ui, tl2o, o2tl, load_list, save_list*/
window.onload = function(){
 
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
                    { type: 'html', html: '<div style="width: 240px;text-align: right;"><a href="https://plotti.co" target="_blank">plotti.co</a> site tracker <u>pro</u></div>'},
                ],
                onClick: function (target, data) {
                    if(target == "gourl") {
                        var sel = w2ui.grid.getSelection();
                        for(var i=0;i<sel.length;i++) {
                            //console.log("will open" + w2ui.grid.get(sel[i]).url);
                            var url = w2ui.grid.get(sel[i]).url;
                            var recid = w2ui.grid.get(sel[i]).recid;
                            // var win = window.open(url, '_blank');
                            start_tab(url, recid, function() {
                                window.close();
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
                                url: url,
                                
                            });
                        }
                        // win.focus();
                    }
                }
            },
            columns: [
                { field: 'autostart', caption: 'Auto', size: '6%', editable: { type : 'checkbox' } },
                { field: 'phash', caption: 'Plotti.co Hash', size: '15%', editable: { type : 'text', inTag : '', style   : '' }},
                { field: 'url', caption: 'Track URL', size: '50%', editable: { type : 'text', inTag : '', style   : '' } },
                { field: 'timer', caption: 'Timer (s)', size: '10%', editable: { type : 'int', inTag : '', style   : '' } },
                { field: 'caption', caption: 'Data caption', size: '120px', editable: { type : 'text', inTag : '', style   : '' } },
                { field: 'selector', caption: 'Selector', size: '30%', hidden: true, editable: { type : 'text', inTag : '', style   : '' }},
                { field: 'nrindex', caption: 'NRIndex', size: '10%', hidden: true, editable: { type : 'text', inTag : '', style   : '' } },
                { field: 'script', caption: 'Script', size: '30%', hidden: true, editable: { type : 'text', inTag : '', style   : '' } }
            ],
            records: [  ]
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
      //mutations.forEach(function(mutation) {
        //console.log(mutation.type);
        vulcanise_inlines();
      //});
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
        w2ui['grid'].add({ recid: nrid, phash: makeid(), url: "paste url here", timer: 60*5, caption: '', selector: "", nrindex: -1, script: "" });
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
            save_list(w2ui.grid.records);
        };
    });
    w2ui.grid.on('delete', function(event) {
        event.onComplete = function() {
            w2ui.grid.mergeChanges();
            save_list(w2ui.grid.records);
        };
    });
    
    load_list(function(l){
        w2ui.grid.records = l;
        w2ui.grid.refresh();
    });
    
};