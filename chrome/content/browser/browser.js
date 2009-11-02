const EXPORT = ["onLoad", "onUnload", "addMusubiButtonToToolbar", "onCommandToolbarButton"];

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
  if (!q) return;
  var xml = DOMToE4X(aEvent.target);
  if (q.resource) {
    xml.@to = q.fulljid;
  } else if (xml.@res.length()) {
    xml.@to = q.barejid + "/" + xml.@res;
  } else {
    xml.@to = q.barejid;
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
    if (xml.@res.length() && xml.@type == "unavailable") {
      // User left the MUC Room.
      bookmarkPresence(<presence from={q.barejid} to={p.fulljid} type="unavailable"/>, true);
    }
    break;
  }
  delete xml.@res;
  xmppSend(p, xml);
}

function addMusubiButtonToToolbar(aButtonId) {
  var toolbar = document.getElementById("nav-bar");
  if (toolbar.getAttribute("customizable") != "true") return;
  var set = toolbar.currentSet;
  if (set.indexOf(aButtonId) != -1) return;
  toolbar.currentSet = set.replace(/(urlbar-container|separator)/, aButtonId + ',$1');
  toolbar.setAttribute("currentset", toolbar.currentSet);
  document.persist(toolbar.id, "currentset");
  try {
    BrowserToolboxCustomizeDone(true);
  } catch (e) {};
}

function onCommandToolbarButton() {
  var uri = IOService.newURI(content.document.documentURI, null, null);
  if (uri.schemeIs("file")) {
    karaage("teruaki", content.document, function(aHttpValue) {
      openUILink(aHttpValue);
    });
  }
  return;
  function makeMessage(aTo, aURLValue, aDesc) {
    return <message to={aTo}>
             <body>{aURLValue}</body>
             <x xmlns="jabber:x:oob">
               <url>{aURLValue}</url>
               <desc>{aDesc}</desc>
             </x>
           </message>;
  }
  var o = parseURI(content.document.documentURI);
  if (!o || !o.path || !o.frag) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var uri = IOService.newURI(o.frag, null, null);
  if (uri.schemeIs("file")) {
    karaage(p.barejid, content.document, function(aHttpValue) {
      openUILink(makeXmppURI(o.auth, o.path, "", aHttpValue));
      xmppSend(p, makeMessage(o.path, aHttpValue, content.document.title));
    });
  } else {
    xmppSend(p, makeMessage(o.path, o.frag, content.document.title));
  }
}