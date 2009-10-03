const EXPORT = ["filterBrowsersByURI", "makeChannel"];

// export filterBrowsersByURI just for the debug.
function filterBrowsersByURI(aAccount, aSendto, aResource, aHref) {
  var res0 = [], res1 = [];
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = parseURI(b.currentURI.spec);
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

function makeChannel() {
  var channel = XMPP.createChannel();
  channel.on({direction : "in", event : "message"},  onMessage);
  channel.on({direction : "in", event : "presence"}, onPresence);
  channel.on({direction : "in", event : "iq"},       onIQ);
  return channel;
}

function parseXMPP4MOZEvent(aObject) {
  var stanza = aObject.stanza;
  var from = parseJID(stanza.@from.toString());
  var to   = parseJID(stanza.@to.length() ? stanza.@to.toString() : aObject.account);
  var nsOob = new Namespace("jabber:x:oob");
  var url  = stanza.nsOob::x.nsOob::url.toString();
  return [stanza, from, to, url];
}

function appendStanzaToBrowsers(aBrowsers, aStanza) {
  for (var i = 0, len = aBrowsers.length; i < len; i++) {
    appendE4XToXmppIn(aBrowsers[i].contentDocument, aStanza);
  }
  return aBrowsers.length;
}

function appendStanzaToSidebar(aStanza) {
  var sidebar = getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, aStanza);
}

//We call onMessage many times so we need to be aware of the performance.
function onMessage(aObj) {
  var [stanza, from, to, url] = parseXMPP4MOZEvent(aObj);
  if (from && to) {
    if (appendStanzaToBrowsers(
          filterBrowsersByURI(to.barejid, from.barejid, from.resource, url),
          stanza)) return;
    if (url) {
      var newTab = gBrowser.getBrowserForTab(
                     gBrowser.addTab(makeXmppURI(to.barejid, from.barejid, from.resource, "share", url)));
      var appendOnload0 = function(e) {
        newTab.contentDocument.addEventListener("load", appendOnload1, true);
        newTab.removeEventListener("load", appendOnload0, true);
      };
      var appendOnload1 = function(e) {
        appendE4XToXmppIn(newTab.contentDocument, stanza);
        newTab.contentDocument.removeEventListener("load", appendOnload1, true);
      };
      newTab.addEventListener("load", appendOnload0, true);
      return;
    }
  }
  appendStanzaToSidebar(stanza);
}

function onPresence(aObj) {
  var [stanza, from, to, _] = parseXMPP4MOZEvent(aObj);
  if (from && to) {
    appendStanzaToBrowsers(
      filterBrowsersByURI(to.barejid, from.barejid, from.resource),
      stanza);
  }
  appendStanzaToSidebar(stanza);
}

function onIQ(aObj) {
  var [stanza, from, to, _] = parseXMPP4MOZEvent(aObj);
  if (from && to) {
    appendStanzaToBrowsers(
      filterBrowsersByURI(to.barejid, from.barejid, from.resource),
      stanza);
  }
  appendStanzaToSidebar(stanza);
}
