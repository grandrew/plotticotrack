/*global jsSHA*/

var events = ["onclick", "onmouseover", "onmouseout", "onmousedown", "onmouseup", "onscroll", "oncontextmenu", "onmousewheel"];

function getAllElementsWithAttribute(attribute)
{
  var matchingElements = [];
  var allElements = document.getElementsByTagName('*');
  for (var i = 0, n = allElements.length; i < n; i++)
  {
    if (allElements[i].getAttribute(attribute) !== null)
    {
      // Element exists with attribute. Add to array.
      matchingElements.push(allElements[i]);
    }
  }
  return matchingElements;
}

function digest(text) {
    var shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.update(text);
    return shaObj.getHash("B64");
}

function get_manifest_entry() {
    var out = [];
    for(var i=0;i<events.length;i++) {
        var els = getAllElementsWithAttribute(events[i]);
        for(var j=0;j<els.length;j++) {
            out.push("sha256-"+digest(els[j].getAttribute(events[i])));
        }
    }
    return "'"+out.join("' '")+"'";
}