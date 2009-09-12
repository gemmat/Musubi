const EXPORT = ["filterBrowsersByURI", "setChannel"];

function filterBrowsersByURI(aAccount, aSendto, aResource, aHref) {
  var res0 = [], res1 = [];
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = Musubi.parseURI(b.currentURI.spec);
    if (!o) continue;
    if (o.account  == aAccount &&
        o.sendto   == aSendto &&
        (!aHref || o.href == aHref)) {
      if (o.resource) {
        if (o.resource == aResource) {
          res0.push(b);
        }
      } else {
        res1.push(b);
      }
    }
  }
  if (res0.length && res1.length) return res0;
  return res0.concat(res1);
}

function setChannel(aChannel) {
  aChannel.on({direction : "in", event : "message"},  onMessage);
  aChannel.on({direction : "in", event : "presence"}, onPresence);
  aChannel.on({direction : "in", event : "iq"},       onIQ);
}

//We call onMessage many times so we need to be aware of the performance.
function onMessage(aObj) {
  var stanza = aObj.stanza;
  var from = Musubi.parseJID(stanza.@from.toString());
  var to   = Musubi.parseJID(stanza.@to.length() ? stanza.@to.toString() : aObj.account);
  if (from && to) {
    var nsOob = new Namespace("jabber:x:oob");
    var url  = stanza.nsOob::x.nsOob::url.toString();
    var bs = filterBrowsersByURI(to.barejid, from.barejid, from.resource, url);
    for (var i = 0, len = bs.length; i < len; i++) {
      appendE4XToXmppIn(bs[i].contentDocument, stanza);
    }
    if (!bs.length) {
      if (url) {
        var newTab = gBrowser.getBrowserForTab(
          gBrowser.addTab(
            Musubi.makeXmppURI(to.barejid, from.barejid, from.resource, "share", url)));
        var appendOnload0 = function(e) {
          newTab.contentDocument.addEventListener("load", appendOnload1, true);
          newTab.removeEventListener("load", appendOnload0, true);
        };
        var appendOnload1 = function(e) {
          appendE4XToXmppIn(newTab.contentDocument, stanza);
          newTab.contentDocument.removeEventListener("load", appendOnload1, true);
        };
        newTab.addEventListener("load", appendOnload0, true);
      } else {
        var sidebar = Musubi.getMusubiSidebar();
        if (!sidebar) return;
        appendE4XToXmppIn(sidebar.iframe.doc, stanza);
      }
    }
    return;
  }
  var sidebar = Musubi.getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, stanza);
}

function onPresence(aObj) {
  var stanza = aObj.stanza;
  var from = Musubi.parseJID(stanza.@from.toString());
  var to   = Musubi.parseJID(stanza.@to.length() ? stanza.@to.toString() : aObj.account);
  if (from && to) {
    var bs = filterBrowsersByURI(to.barejid, from.barejid, from.resource);
    for (var i = 0, len = bs.length; i < len; i++) {
      appendE4XToXmppIn(bs[i].contentDocument, stanza);
    }
  }
  var sidebar = Musubi.getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, stanza);
}

function onIQ(aObj) {
  var stanza = aObj.stanza;
  var from = Musubi.parseJID(stanza.@from.toString());
  var to   = Musubi.parseJID(stanza.@to.length() ? stanza.@to.toString() : aObj.account);
  if (from && to) {
    var bs = filterBrowsersByURI(to.barejid, from.barejid, from.resource);
    for (var i = 0, len = bs.length; i < len; i++) {
      appendE4XToXmppIn(bs[i].contentDocument, stanza);
    }
  }
  var sidebar = Musubi.getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, stanza);
}
