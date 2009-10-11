const EXPORT = ["filterBrowsers", "makeChannel"];

// export filterBrowsers just for the debug.
function filterBrowsers(aFrom, aTo) {
  var res = [];
  if (!gBrowser) return res;
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = parseURI(b.currentURI.spec);
    if (!o) continue;
    var auth = parseJID(o.auth);
    var path = parseJID(o.path);
    if (!auth || !path) continue;
    if (( aTo.resource && auth.fulljid == aTo.fulljid) ||
        (!aTo.resource && auth.barejid == aTo.barejid)) {
      if (path.barejid == aFrom.barejid) {
      //if (( aFrom.resource && path.fulljid == aFrom.fulljid) ||
          //(!aFrom.resource && path.barejid == aFrom.barejid)) {
        res.push(b);
      }
    }
  }
  return res;
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
  //print("stanza:" + stanza.toXMLString());
  //print("from:" + toJSON(from));
  //print("to:"   + toJSON(to));
  return [stanza, from, to];
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
  var [stanza, from, to] = parseXMPP4MOZEvent(aObj);
  if (from && to) {
    if (appendStanzaToBrowsers(filterBrowsers(from, to), stanza)) {
      return;
    }
  }
  appendStanzaToSidebar(stanza);
}

function onPresence(aObj) {
  var [stanza, from, to] = parseXMPP4MOZEvent(aObj);
  if (from && to) {
    appendStanzaToBrowsers(filterBrowsers(from, to), stanza);
  }
  appendStanzaToSidebar(stanza);
}

function onIQ(aObj) {
  var [stanza, from, to] = parseXMPP4MOZEvent(aObj);
  if (from && to) {
    appendStanzaToBrowsers(filterBrowsers(from, to), stanza);
    getMusubiSidebar().win.Musubi.insertRoster(stanza);
  }
  appendStanzaToSidebar(stanza);
}
