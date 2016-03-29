/*global jsSHA*/

var events = ["onclick", "onmouseover", "onmouseout", "onmousedown", "onmouseup", "onscroll", "oncontextmenu", "onmousewheel", "ondblclick"];

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

function vulcanise_inlines() {
    for(var i=0;i<events.length;i++) {
        var els = getAllElementsWithAttribute(events[i]);
        for(var j=0;j<els.length;j++) {
            var fun = eval("(function a(){"+els[j].getAttribute(events[i])+"})");
            els[j].removeAttribute(events[i]);
            els[j][events[i]] = fun;
        }
    }
}

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}