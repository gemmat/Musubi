const EXPORT = ["onlineAccounts", "DOMToE4X", "E4XToDOM", "updateXMPP4MOZAccount", "appendE4XToXmppIn", "xmppConnect", "xmppDisconnect", "xmppSend", "filterBrowsersByURI"];

var onlineAccounts = [];

function DOMToE4X(aDOMNode) {
  return new XML(new XMLSerializer().serializeToString(aDOMNode));
}

function E4XToDOM(aE4XXML) {
  return window.content.document.importNode(
    new DOMParser().
          parseFromString(aE4XXML.toXMLString(), "application/xml").
          documentElement,
    true);
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
  var prefs = new Musubi.Prefs("xmpp.account." + key + ".");
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

function appendE4XToXmppIn(aDocument, aE4X) {
  var xmppins = [];
  var stack = [aDocument];
  var i, len;
  var doc;
  var elts;
  // deeply getElementsByTagName("xmppin") for nested iframes.
  while (stack.length) {
    doc = stack.pop();
    elts = doc.getElementsByTagName("xmppin");
    for (i = 0, len = elts.length; i < len; i++) {
      xmppins.push(elts[i]);
    }
    elts = doc.getElementsByTagName("iframe");
    for (i = 0, len = elts.length; i < len; i++) {
      stack.push(elts[i].contentDocument);
    }
  }
  for (i = 0, len = xmppins.length; i < len; i++)
    xmppins[i].appendChild(E4XToDOM(aE4X));
}

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
        var iframe = Musubi.browser.getSidebarIframe();
        if (!iframe) return;
        appendE4XToXmppIn(iframe.contentDocument, stanza);
      }
    }
    return;
  }
  var iframe = Musubi.browser.getSidebarIframe();
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, stanza);
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
  var iframe = Musubi.browser.getSidebarIframe();
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, stanza);
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
  var iframe = Musubi.browser.getSidebarIframe();
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, stanza);
}

function findAccountFromBarejid(aBarejid) {
  var account = Musubi.callWithMusubiDB(function findAccountfromBarejidAtMusubiDB(msbdb) {
    return msbdb.account.findByBarejid(aBarejid)[0];
  });
  if (!account) throw new Error("account data not found: " + aBarejid);
  return account;
}

function xmppConnect(aFulljid) {
  var p = Musubi.parseJID(aFulljid);
  if (!p) return;
  if (Musubi.onlineAccounts[p.barejid]) return;
  var account = findAccountFromBarejid(p.barejid);
  account.channel = XMPP.createChannel();
  account.channel.on({direction : "in", event : "message"},  onMessage);
  account.channel.on({direction : "in", event : "presence"}, onPresence);
  account.channel.on({direction : "in", event : "iq"},       onIQ);
  // XMPP.up(account, ...) shows a useless dialog, so we use XMPP.up("romeo@localhost/Home", ...);
  XMPP.up(account.barejid + "/" + account.resource, function(jid) {
    Musubi.onlineAccounts[account.barejid] = account;
    xmppSend(<presence from={account.barejid}/>);
    var iframe = Musubi.browser.getSidebarIframe();
    if (!iframe) return;
    appendE4XToXmppIn(iframe.contentDocument,
                      <musubi type="result">
                        <connect>{p.barejid}</connect>
                      </musubi>);
  });
}

function xmppDisconnect(aFulljid) {
  var p = Musubi.parseJID(aFulljid);
  if (!p) return;
  var iframe = Musubi.browser.getSidebarIframe();
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, <presence type="unavailable" from={p.fulljid}/>);
  var account = Musubi.onlineAccounts[p.barejid];
  if (!account) return;
  account.channel.release();
  XMPP.down(account);
  Musubi.onlineAccounts[p.barejid] = null;
}

function xmppSend(aXML) {
  var p = Musubi.parseJID(aXML.@from.toString());
  if (!p) return;
  var account = Musubi.onlineAccounts[p.barejid];
  if (!account) return;
  delete aXML.@from;
  // XMPP.send(account, ...) shows a useless dialog, so we use XMPP.send("romeo@localhost/Home", ...);
  XMPP.send(account.barejid + "/" + account.resource, aXML);
}
