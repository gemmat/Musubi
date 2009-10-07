function DOMToE4X(aDOM) {
  return new XML(new XMLSerializer().serializeToString(aDOM));
}

function E4XToDOM(aDocument, aE4X) {
  return aDocument.importNode(
    new DOMParser().
      parseFromString(aE4X.toXMLString(), "application/xml").
      documentElement,
    true);
}

function getDocumentFromEvent(aEvent) {
  var doc = aEvent.target.ownerDocument;
  if (doc instanceof HTMLDocument) {
    var dVFElt = doc.defaultView.frameElement;
    if (dVFElt) {
      while (dVFElt) {
        doc = dVFElt.ownerDocument;
        dVFElt = doc.defaultView.frameElement;
      }
    }
  }
  return doc;
}

// deeply gets elements for nested iframes.
function deeplyGetElementsByTagName(aDocument, aTagName) {
  var result = [];
  var stack = [aDocument];
  var i, len;
  var doc;
  var elts;
  while (stack.length) {
    doc = stack.pop();
    elts = doc.getElementsByTagName(aTagName);
    for (i = 0, len = elts.length; i < len; i++) {
      result.push({doc: doc, elt: elts[i]});
    }
    elts = doc.getElementsByTagName("iframe");
    for (i = 0, len = elts.length; i < len; i++) {
      stack.push(elts[i].contentDocument);
    }
  }
  return result;
}

function appendE4XToXmppIn(aDocument, aE4X) {
  var arr = deeplyGetElementsByTagName(aDocument, "xmppin");
  for (var i = 0, len = arr.length; i < len; i++) {
    var dom = E4XToDOM(arr[i].doc, aE4X);
    arr[i].elt.appendChild(dom);
  }
}

function updateXMPP4MOZAccount(aAccount, aDeleteP) {
  // The xmpp4moz's xmpp_impl.jsm says
  // "deprecation('2009-04-09 getAccountByJid() - use accounts.get({jid: <jid>}) instead');"
  // Roger that, however, here we use the getAccountByJid intentionally for the backward compatibility.
  var xmpp4mozAccount = XMPP.getAccountByJid(aAccount.barejid + "/" + aAccount.resource);
  var key = 0;
  if (xmpp4mozAccount) {
    key = xmpp4mozAccount.key;
  } else {
    key = Date.now();
  }
  var prefs = new Prefs("xmpp.account." + key + ".");
  if (aDeleteP) {
    prefs.clear("address");
    prefs.clear("resource");
    prefs.clear("connectionHost");
    prefs.clear("connectionPort");
    prefs.clear("connectionSecurity");
  } else {
    prefs.set("address",            aAccount.barejid);
    prefs.set("resource",           aAccount.resource);
    prefs.set("connectionHost",     aAccount.connectionHost);
    prefs.set("connectionPort",     aAccount.connectionPort);
    prefs.set("connectionSecurity", aAccount.connectionScrty);
  }
}

var Debug = true;

function p(x) {
  if (Debug) {
    Application.console.log(x);
  }
}

var EXPORT = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORT")];
