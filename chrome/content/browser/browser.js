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
