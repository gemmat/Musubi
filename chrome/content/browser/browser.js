const EXPORT = ["onLoad", "onUnload", "filterBrowsers", "makeChannel", "getMusubiSidebar"];
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

function onXmppEventAtDocument(aEvent) {
  var doc = getDocumentFromEvent(aEvent);
  var o = parseURI(doc.location.href);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  var xml = DOMToE4X(aEvent.target);
  if (q) {
    if (q.resource) {
      xml.@to = q.fulljid;
    } else if (xml.@res.length()) {
      xml.@to = q.barejid + "/" + xml.@res;
    } else {
      xml.@to = q.barejid;
    }
  } else {
    delete xml.@to;
  }
  switch (xml.name().localName) {
  case "musubi":
    if (xml.init.length()) {
      var initStanzaDOM = Application.storage.get(makeStorageKey(doc.location.href), null);
      if (initStanzaDOM) {
        appendDOMToXmppIn(doc, initStanzaDOM);
        Application.storage.set(makeStorageKey(doc.location.href), null);
      }
    }
    return;
  case "message":
    // we need to keep a small message for the latency.
//     if (o.frag) {
//       xml.* += <x xmlns="jabber:x:oob">
//                  <url>{o.frag}</url>
//                  <desc>{doc.title}</desc>
//                </x>;
//     }
    break;
  case "iq":
    break;
  case "presence":
    if (q) {
      if (xml.@res.length() && xml.@type == "unavailable") {
        // User left the MUC Room.
        bookmarkPresence(<presence from={q.barejid} to={p.fulljid} type="unavailable"/>, true);
      }
    }
    break;
  }
  delete xml.@res;
  xmppSend(p, xml);
}

function filterBrowsers(aAccount, aFrom, aURL, aMessageType) {
  if (!gBrowser) return [];
  var bs = [];
  var addtabp = true;
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
          // TODO: consider wheather to use the following conditionals or not...
          if (( aFrom.resource && q.fulljid == aFrom.fulljid) ||
              (!aFrom.resource && q.barejid == aFrom.barejid) ||
              ( aMessageType == "groupchat" &&
                aFrom.resource && q.barejid == aFrom.barejid)) {
            bs.push(b);
            if (o.frag == aURL || aMessageType == "groupchat") addtabp = false;
          }
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

function filterSidebarIframe(aAccount, aFrom) {
  var sidebar = getMusubiSidebar();
  if (!sidebar) return null;
  var sidebarIframe = sidebar.doc.getElementById("sidebar-iframe");
  var o = parseURI(sidebarIframe.contentDocument.location.href);
  if (!o) return null;
  var p = parseJID(o.auth);
  if (!p) return null;
  if (( aAccount.resource && p.fulljid == aAccount.fulljid) ||
      (!aAccount.resource && p.barejid == aAccount.barejid)) {
    return sidebarIframe;
  }
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
