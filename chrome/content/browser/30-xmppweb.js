const EXPORT = ["filterBrowsers", "makeChannel"];

// export filterBrowsers just for the debug.
function filterBrowsers(aFrom, aAccount) {
  var res = [];
  if (!gBrowser) return res;
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = parseURI(b.currentURI.spec);
    if (!o) continue;
    var p = parseJID(o.auth);
    if (!p) continue;
    var q = parseJID(o.path);
    if (!q) continue;
    if (( aAccount.resource && p.fulljid == aAccount.fulljid) ||
        (!aAccount.resource && p.barejid == aAccount.barejid)) {
      if (q.barejid == aFrom.barejid) {
      // TODO: consider wheather to uncomment the following conditionals or not...
      //if (( aFrom.resource && q.fulljid == aFrom.fulljid) ||
      //    (!aFrom.resource && q.barejid == aFrom.barejid)) {
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
  var stanza  = aObject.stanza;
  var account = parseJID(aObject.account);
  var from    = parseJID(stanza.@from.toString());
  var to      = parseJID(stanza.@to.length() ? stanza.@to.toString() : aObject.account);
  return [stanza, account, from, to];
}

function appendStanzaToBrowsers(aBrowsers, aStanza) {
  for (var i = 0, len = aBrowsers.length; i < len; i++) {
    appendE4XToXmppIn(aBrowsers[i].contentDocument, aStanza);
  }
  return aBrowsers.length;
}

//We call onMessage many times so we need to be aware of the performance.
function onMessage(aObj) {
  var [stanza, account, from, to] = parseXMPP4MOZEvent(aObj);
  print("message:" + stanza.toXMLString());
  if (from && to) {
    appendStanzaToBrowsers(filterBrowsers(from, account), stanza);
  }
}

function onPresence(aObj) {
  var [stanza, account, from, to] = parseXMPP4MOZEvent(aObj);
  print("presence:" + stanza.toXMLString());
  if (from && to) {
    appendStanzaToBrowsers(filterBrowsers(from, account), stanza);
    insertPresence(stanza);
    // TODO: OK, this is the Twitter style. We have to implement the "private mode".
    if (stanza.@type.toString() == "subscribe") {
      xmppSend(account, <presence to={from.barejid} type="subscribed"/>);
    }
  }
}

function onIQ(aObj) {
  var [stanza, account, from, to] = parseXMPP4MOZEvent(aObj);
  print("iq:" + stanza.toXMLString());
  if (from && to) {
    appendStanzaToBrowsers(filterBrowsers(from, account), stanza);
  }
  insertRoster(stanza);
}
