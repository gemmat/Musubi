const EXPORT = ["filterBrowsers", "makeChannel", "makeStorageKey"];
// export filterBrowsers just for the debug.

const nsOob = new Namespace("jabber:x:oob");

function filterBrowsers(aAccount, aFrom, aURL) {
  var bs = [];
  var addtabp = true;
  if (!gBrowser) return bs;
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = parseURI(b.currentURI.spec);
    if (!o) continue;
    var p = parseJID(o.auth);
    if (!p) continue;
    if (( aAccount.resource && p.fulljid == aAccount.fulljid) ||
        (!aAccount.resource && p.barejid == aAccount.barejid)) {
      if (aFrom) {
        var q = parseJID(o.path);
        if (!q) continue;
        if (q.barejid == aFrom.barejid) {
          // TODO: consider wheather to uncomment the following conditionals or not...
          //if (( aFrom.resource && q.fulljid == aFrom.fulljid) ||
          //    (!aFrom.resource && q.barejid == aFrom.barejid)) {
          bs.push(b);
          if (o.frag == aURL) addtabp = false;
        }
      } else {
        bs.push(b);
        addtabp = false;
      }
    }
  }
  return {browsers: bs, addtabp: addtabp};
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
  var to      = parseJID(stanza.@to.toString());
  return [stanza, account, from, to];
}

function appendStanzaToBrowsers(aBrowsers, aStanza) {
  for (var i = 0, len = aBrowsers.length; i < len; i++) {
    appendE4XToXmppIn(aBrowsers[i].contentDocument, aStanza);
  }
}

// Make a consistent key for addTab and onXmppEventAtDocument.
function makeStorageKey(aURL) {
  return "init:" + aURL;
}

function addTab(aAuth, aPath, aFrag, aStanza) {
  if (!gBrowser) return;
  var url = makeXmppURI(aAuth.fulljid, aPath.fulljid, "", aFrag);
  // guard from duplicating tab during its loading.
  if (Application.storage.get(url, false)) return;
  var newTab = gBrowser.getBrowserForTab(gBrowser.addTab(url));
  Application.storage.set(url, true);
  var unlock = function(e) {
    Application.storage.set(url, false);
    newTab.removeEventListener("load", unlock, true);
  };
  newTab.addEventListener("load", unlock, true);
  // When the contents of the newTab called Musubi.init(...), we response with aStanza.
  // Unfortunaly Firefox throw an error when Application.storage.set(key, aStanza), so set its DOM representation.
  // See also onXmppEventAtDocument.
  Application.storage.set(makeStorageKey(url), E4XToDOM(document, aStanza));
}

//We call onMessage many times so we need to be aware of the performance.
function onMessage(aObj) {
  var [stanza, account, from, to] = parseXMPP4MOZEvent(aObj);
  //print("message:" + stanza.toXMLString());
  if (from && to) {
    var url  = stanza.nsOob::x.nsOob::url.toString() || getPrefDefaultPage();
    var r = filterBrowsers(account, from, url);
    appendStanzaToBrowsers(r.browsers, stanza);
    if (r.addtabp) {
      addTab(account, from, url, stanza);
    }
  }
}

function onPresence(aObj) {
  var [stanza, account, from, to] = parseXMPP4MOZEvent(aObj);
  print("presence:" + stanza.toXMLString());
  if (from && to) {
    appendStanzaToBrowsers(filterBrowsers(account, from).browsers, stanza);
    bookmarkPresence(stanza);
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
    appendStanzaToBrowsers(filterBrowsers(account, from).browsers, stanza);
  }
  bookmarkRoster(stanza);
}
