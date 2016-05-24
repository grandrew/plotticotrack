/*
    This file is part of PlotticoTrack.

    PlotticoTrack is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    PlotticoTrack is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with PlotticoTrack. If not, see <http://www.gnu.org/licenses/>.
*/

// Sift4 - common version
// online algorithm to compute the distance between two strings in O(n)
// maxOffset is the number of characters to search for matching letters
// maxDistance is the distance at which the algorithm should stop computing the value and just exit (the strings are too different anyway)
function sift4(s1, s2, maxOffset, maxDistance) {
    if (!s1||!s1.length) {
        if (!s2) {
            return 0;
        }
        return s2.length;
    }

    if (!s2||!s2.length) {
        return s1.length;
    }

    var l1=s1.length;
    var l2=s2.length;

    var c1 = 0;  //cursor for string 1
    var c2 = 0;  //cursor for string 2
    var lcss = 0;  //largest common subsequence
    var local_cs = 0; //local common substring
    var trans = 0;  //number of transpositions ('ab' vs 'ba')
    var offset_arr=[];  //offset pair array, for computing the transpositions

    while ((c1 < l1) && (c2 < l2)) {
        if (s1.charAt(c1) == s2.charAt(c2)) {
            local_cs++;
            var isTrans=false;
            //see if current match is a transposition
            var i=0;
            while (i<offset_arr.length) {
                var ofs=offset_arr[i];
                if (c1<=ofs.c1 || c2 <= ofs.c2) {
                    // when two matches cross, the one considered a transposition is the one with the largest difference in offsets
                    isTrans=Math.abs(c2-c1)>=Math.abs(ofs.c2-ofs.c1);
                    if (isTrans)
                    {
                        trans++;
                    } else
                    {
                        if (!ofs.trans) {
                            ofs.trans=true;
                            trans++;
                        }
                    }
                    break;
                } else {
                    if (c1>ofs.c2 && c2>ofs.c1) {
                        offset_arr.splice(i,1);
                    } else {
                        i++;
                    }
                }
            }
            offset_arr.push({
                c1:c1,
                c2:c2,
                trans:isTrans
            });
        } else {
            lcss+=local_cs;
            local_cs=0;
            if (c1!=c2) {
                c1=c2=Math.min(c1,c2);  //using min allows the computation of transpositions
            }
            //if matching characters are found, remove 1 from both cursors (they get incremented at the end of the loop)
            //so that we can have only one code block handling matches 
            for (var i = 0; i < maxOffset && (c1+i<l1 || c2+i<l2); i++) {
                if ((c1 + i < l1) && (s1.charAt(c1 + i) == s2.charAt(c2))) {
                    c1+= i-1; 
                    c2--;
                    break;
                }
                if ((c2 + i < l2) && (s1.charAt(c1) == s2.charAt(c2 + i))) {
                    c1--;
                    c2+= i-1;
                    break;
                }
            }
        }
        c1++;
        c2++;
        if (maxDistance)
        {
            var temporaryDistance=Math.max(c1,c2)-lcss+trans;
            if (temporaryDistance>=maxDistance) return Math.round(temporaryDistance);
        }
        // this covers the case where the last match is on the last token in list, so that it can compute transpositions correctly
        if ((c1 >= l1) || (c2 >= l2)) {
            lcss+=local_cs;
            local_cs=0;
            c1=c2=Math.min(c1,c2);
        }
    }
    lcss+=local_cs;
    return Math.round(Math.max(l1,l2)- lcss +trans); //add the cost of transpositions to the final result
}

function diffAlg(s1, s2, maxDistance) {
    return sift4(s1, s2, 10, maxDistance);
    //return levDist(s1, s2);
}

function get_super_selector(el) {
    var dom_shot = get_dom_shot(el);
    var element_info = entropy_match(dom_shot, false, true);
    dom_shot.push(element_info.entropy_window);
    if(element_info.entropy_window == 0) {
        dom_shot = get_dom_shot(el, dom_shot[1].length+1);
        element_info = entropy_match(dom_shot, false, true);
        dom_shot.push(element_info.entropy_window);
        if(element_info.entropy_window == 0) return null; // not enough entropy
    }
    return dom_shot;
}

var attr_template = JSON.stringify({
    "title": null,
    "label": null,
    "alt": null,
    // "class": null,
    // "id": null,
    "pt-image-fingerprint": null
});

function describe_node(node) {
    if(!node.attributes) {
        if(node.data) return node.data.replace(/\d/g, "");
        return node.nodeName;
    }
    var nodeAttrs = [].slice.call(node.attributes);
    var attrs = JSON.parse(attr_template);
    var i;
    var desc = node.tagName;
    for(i=0; i<nodeAttrs.length;i++) {
        if(nodeAttrs[i].name in attrs) {
            attrs[nodeAttrs[i].name] = nodeAttrs[i].value;
        }
    }
    for(var oName in attrs) {
        if(attrs[oName]) {
            desc += attrs[oName];
        }
    }
    // or
    // return JSON.stringify(attrs)
    return desc.replace(/\d/g, "");
}

function get_comparable_perspective(enode, gcp_info, maxNodes) {
    var serialized = describe_node(enode);
    var nodes = [].slice.call(enode.childNodes);
    
    var nodesTested = 0;

    while(nodes.length) {
        var node = nodes.shift();
        serialized += describe_node(node);
        if(serialized.length > 2000) break;

        if (node.childNodes.length) {
            nodes = [].slice.call(node.childNodes).concat(nodes);
        }
        nodesTested++;
        if(maxNodes && nodesTested > maxNodes) break;
    }
    gcp_info.nodesTested = nodesTested;
    return serialized;
}

function get_dom_shot(el, deep, maxNodes) {
    //console.log("dom_shor");
    var p_el = el;
    var gcp_info = {};
    var all_shots = [get_comparable_perspective(p_el, gcp_info, maxNodes)];
    var depth = 1;
    var cp = "";
    var totl = 0;
    var max_nodes = 0;
    var tagNames = [el.tagName];
    while((deep && depth < deep) || (!deep && JSON.stringify(all_shots).length < 500)) {
        // console.log("shot "+depth);
        p_el = p_el.parentNode;
        if(!p_el) break;
        tagNames.push(p_el.tagName);
        cp = get_comparable_perspective(p_el, gcp_info, maxNodes);
        if(gcp_info.nodesTested > max_nodes) max_nodes = gcp_info.nodesTested;
        totl += cp.length;
        all_shots.push(cp.replace(all_shots[depth-1], ""));
        if(totl > 2000) break;
        
        depth++;
    }
    if(!deep && JSON.stringify(all_shots).length > 2000) {
        all_shots.pop();
    }
    tagNames.reverse();
    return [tagNames.join(" > "), all_shots, max_nodes]; 
}

function compare_shots(s1, s2, maxDistance) {
    var maxlen;
    if(s1.length > s2.length) maxlen = s1.length;
    else maxlen = s2.length;
    var dist = 0;
    for(var i=0;i<maxlen;i++){
        // dist += diffAlg(""+s1[i], ""+s2[i], maxDistance)/(i+1);
        dist += diffAlg(""+s1[i], ""+s2[i], maxDistance);
    }
    return dist;
}

function compareNumbers(a, b) {
  return a - b;
}

function entropy_match(sel_list, back, full) {
    var tagSelector = sel_list[0];
    var sel = sel_list[1];
    var tels = document.querySelectorAll(tagSelector);
    var dshot;
    var diffs = [];
    var min_diff = 999999;
    var min_diff_i = -1;
    var deep = sel_list[1].length;
    var cdif;
    if(back) {
        tels = Array.prototype.slice.call(tels);
        tels.reverse();
    }
    full = true; // TODO: sift4 unstable in maxDistance, need to investigate
    for(var i=0; i<tels.length; i++) {
        dshot = get_dom_shot(tels[i], deep, sel_list[2]);
        if(full) {
            cdif = compare_shots(sel, dshot[1], 0);
        } else {
            cdif = compare_shots(sel, dshot[1], min_diff * 10);
        }
        diffs.push(cdif);
        if(cdif < min_diff) {
            min_diff = cdif;
            min_diff_i = i;
        }
    }
    diffs.sort(compareNumbers);
    // console.log(diffs);
    var entropy_window = diffs[1] - min_diff;
    // console.log(min_diff);
    if(sel_list[3] && min_diff >= sel_list[3]) {
        var l_tagSelector = tagSelector.split(" > ");
        if(l_tagSelector.length > 1) {
            var sel_mod = sel_list.slice();
            sel_mod[0] = l_tagSelector[l_tagSelector.length-1];
            return entropy_match(sel_mod);
        }
        return {"node": null, "entropy_window": 0, "min_diff": min_diff, "matches": diffs, "closest_match": tels[min_diff_i]};
    }
    return {"node": tels[min_diff_i], "entropy_window": entropy_window, "min_diff": min_diff, "matches": diffs};
}

function execute_selector(sel_list, back) {
    return entropy_match(sel_list, back).node;
}

///////////////////////////////////////////////////
// for compatibility with old selector

function get_dom_shot_old(el) {
    var p_el = el;
    var old_p = el;
    var all_shots = [p_el.outerHTML.replaceAll(' contenteditable="true">','>').replaceAll(' contenteditable="false">','>')];
    while(JSON.stringify(all_shots).length < 500) {
        old_p = p_el;
        p_el = p_el.parentNode;
        if(!p_el) break;
        
        all_shots.push(p_el.outerHTML.replace(old_p.outerHTML, "").replaceAll(' contenteditable="true">','>').replaceAll(' contenteditable="false">','>'));
    }
    if(JSON.stringify(all_shots).length > 2000) {
        all_shots.pop();
    }
    return [el.tagName, all_shots]; 
}

function entropy_match_old(sel_list, back, full) {
    var tagName = sel_list[0];
    var sel = sel_list[1];
    var tels = document.getElementsByTagName(tagName);
    var dshot;
    var diffs = [];
    var min_diff = 999999;
    var min_diff_i = -1;
    var cdif;
    if(back) {
        tels = Array.prototype.slice.call(tels);
        tels.reverse();
    }
    full = true; // TODO: sift4 unstable in maxDistance, need to investigate
    for(var i=0; i<tels.length; i++) {
        dshot = get_dom_shot_old(tels[i]);
        if(full) {
            cdif = compare_shots(sel, dshot[1], 0);
        } else {
            cdif = compare_shots(sel, dshot[1], min_diff * 10);
        }
        diffs.push(cdif);
        if(cdif < min_diff) {
            min_diff = cdif;
            min_diff_i = i;
        }
    }
    diffs.sort(compareNumbers);
    // console.log(diffs);
    var entropy_window = diffs[1] - min_diff;
    // console.log(min_diff);
    if(sel_list[2] && min_diff >= sel_list[2]) return {"node": null, "entropy_window": 0, "min_diff": min_diff, "matches": diffs};
    return {"node": tels[min_diff_i], "entropy_window": entropy_window, "min_diff": min_diff, "matches": diffs};
}

function execute_selector_old(sel_list, back) {
    return entropy_match_old(sel_list, back).node;
}
