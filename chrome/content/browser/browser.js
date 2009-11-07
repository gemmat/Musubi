const EXPORT = ["onLoad", "onUnload", "processStanzaWithURI", "filterBrowsers", "makeChannel", "getMusubiSidebar"];
// export filterBrowsers just for the debug.

const nsOob = new Namespace("jabber:x:oob");

function onLoad(aEvent) {
  document.addEventListener("XmppEvent", onXmppEventAtDocument, false, true);
  var appcontent = document.getElementById("appcontent");
  if (appcontent)
    appcontent.addEventListener("DOMContentLoaded", onPageLoad, true);
}

function onUnload(aEvent) {
  document.removeEventListener("XmppEvent", onXmppEventAtDocument, false, true);
}

function onPageLoad(aEvent) {
  var doc = aEvent.originalTarget;
  var o = parseURI(doc.location.href);
  if (!o || !o.auth) return;
  var p = parseJID(o.auth);
  if (!p) return;
  xmppConnect(p, function(account) {
    if (!o.path || !o.frag) return;
    if (/^http:/.test(o.frag)) {
      // Don't use the body, user may hate to send
      // a message when just loaded a page.
      xmppSend(p, <message to={o.path}>
                    <x xmlns="jabber:x:oob">
                      <url>{o.frag}</url>
                    </x>;
                   </message>);
    }
  });
}

function processStanzaWithURI(aAuth, aPath, aStanza) {
  if (aPath) {
    if (aPath.resource) {
      aStanza.@to = aPath.fulljid;
    } else if (aStanza.@res.length()) {
      aStanza.@to = aPath.barejid + "/" + aStanza.@res;
    } else {
      aStanza.@to = aPath.barejid;
    }
  } else {
    delete aStanza.@to;
  }
  delete aStanza.@res;
}

function onXmppEventAtDocument(aEvent) {
  var doc = getDocumentFromEvent(aEvent);
  var stanza = DOMToE4X(aEvent.target);
  var o = parseURI(doc.location.href);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  switch (stanza.name().localName) {
  case "musubi":
    if (stanza.init.length()) {
      var initStanzaDOM = Application.storage.get(makeStorageKey(doc.location.href), null);
      if (initStanzaDOM) {
        appendDOMToXmppIn(doc, initStanzaDOM);
        Application.storage.set(makeStorageKey(doc.location.href), null);
      }
    }
    return;
    break;
  case "presence":
    if (q) {
      if (stanza.@res.length() && stanza.@type == "unavailable") {
        // User left the MUC Room.
        bookmarkPresence(<presence from={q.barejid} to={p.fulljid} type="unavailable"/>, true);
      }
    }
    break;
  }
  processStanzaWithURI(p, q, stanza);
  xmppSend(p, stanza);
}

function filterWithURI(aAccount, aFrom, aAuth, aPath, aQuery, aFrag, aOpt) {
  aOpt = aOpt || {};
  if (( aAccount.resource && aAuth.fulljid == aAccount.fulljid) ||
      (!aAccount.resource && aAuth.barejid == aAccount.barejid)) {
    if (aFrom) {
      if (aPath) {
        if (aPath.barejid == aFrom.barejid) {
          // TODO: consider wheather to use the following conditionals or not...
          if (( aFrom.resource && aPath.fulljid == aFrom.fulljid) ||
              (!aFrom.resource && aPath.barejid == aFrom.barejid) ||
              ( aOpt.messageType == "groupchat" &&
                aFrom.resource && aPath.barejid == aFrom.barejid)) {
            return {result: true,
                    addtabp: (aFrag == aOpt.frag || aOpt.messageType == "groupchat")};
          }
        }
      }
      return {result: true, addtabp: false};
    }
  }
  return null;
}

function filterBrowsers(aAccount, aFrom, aURL, aMessageType) {
  if (!gBrowser) return [];
  var bs = [];
  var addtabp = true;
  var option = {frag: aURL, messageType: aMessageType};
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = parseURI(b.currentURI.spec);
    if (!o) continue;
    var p = parseJID(o.auth);
    if (!p) continue;
    var q = parseJID(o.path);
    var obj = filterWithURI(aAccount, aFrom, p, q, o.query, o.frag, option);
    if (obj) {
      if (obj.result) bs.push(b);
      if (obj.addtab) addtabp = true;
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

function filterSidebarIframe(aAccount, aFrom) {
  var sidebar = getMusubiSidebar();
  if (!sidebar) return null;
  var sidebarIframe = sidebar.doc.getElementById("sidebar-iframe");
  var o = parseURI(sidebarIframe.contentDocument.location.href);
  if (!o) return null;
  var p = parseJID(o.auth);
  if (!p) return null;
  var q = parseJID(o.path);
  var obj = filterWithURI(aAccount, aFrom, p, q, o.query, o.frag);
  if (obj && obj.result) return sidebarIframe;
  return null;
}

function appendStanzaToSidebarIframe(aSidebarIframe, aStanza) {
  if (!aSidebarIframe) return;
  appendE4XToXmppIn(aSidebarIframe.contentDocument, aStanza);
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
  print("message:" + stanza.toXMLString());
  if (from && to) {
    var url  = stanza.nsOob::x.nsOob::url.toString() || getPrefDefaultPage();
    var r = filterBrowsers(account, from, url, stanza.@type.toString());
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
    appendStanzaToSidebarIframe(filterSidebarIframe(account, from), stanza);
    bookmarkPresence(stanza);
    if (stanza.@type.toString() == "subscribe") {
      // This is the Twitter style.
      var prefs = new Prefs("extensions.musubi.");
      if (!prefs.get("privatemode", false)) {
        xmppSend(account, <presence to={from.barejid} type="subscribed"/>);
      }
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

function getMusubiSidebar() {
  var sidebar = document.getElementById("sidebar");
  if (!sidebar || !sidebar.contentWindow.Musubi) return null;
  return {
    win:       sidebar.contentWindow,
    doc:       sidebar.contentDocument,
    Musubi:    sidebar.contentWindow.Musubi
  };
}
