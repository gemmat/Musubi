const EXPORT = ["onlineAccounts", "DOMToE4X", "E4XToDOM", "updateXMPP4MOZAccount", "appendE4XToXmppIn", "xmppConnect", "xmppDisconnect", "xmppSend"];

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

function updateXMPP4MOZAccount(aAccount) {
  // The xmpp4moz's xmpp_impl.jsm says
  // "deprecation('2009-04-09 getAccountByJid() - use accounts.get({jid: <jid>}) instead');"
  // Roger that, however, here we use the getAccountByJid intentionally for the backward compatibility.
  var xmpp4mozAccount = XMPP.getAccountByJid(aAccount.jid);
  var key = 0;
  if (xmpp4mozAccount) {
    key = xmpp4mozAccount.key;
  } else {
    key = Date.now();
  }
  var prefs = new Musubi.Prefs("xmpp.account." + key + ".");
  prefs.set("address",            aAccount.address);
  prefs.set("resource",           aAccount.resource);
  prefs.set("connectionHost",     aAccount.connectionHost);
  prefs.set("connectionPort",     aAccount.connectionPort);
  prefs.set("connectionSecurity", aAccount.connectionSecurity);
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
  var arr = [];
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = Musubi.parseURI(b.currentURI.spec);
    if (o &&
        o.account  == aAccount &&
        o.sendto   == aSendto &&
        (!aResource || o.resource == aResource) &&
        (!aHref     || o.href     == aHref)) {
      arr.push(b);
    }
  }
  return arr;
}

//We call onMessage many times so we need to be aware of the performance.
function onMessage(aMessageObj) {
  var stanza = aMessageObj.stanza;
  if (!stanza.@from.length() || !stanza.@to.length()) return;
  var stanzaFrom = XMPP.JID(stanza.@from.toString());
  var stanzaTo   = XMPP.JID(stanza.@to  .toString());
  var nsoob = new Namespace("jabber:x:oob");
  var stanzaUrl  = stanza.nsoob::x.nsoob::url.toString();
  var bs = filterBrowsersByURI(stanzaTo.address,
                               stanzaFrom.address,
                               stanzaFrom.resource,
                               stanzaUrl);
  for (var i = 0, len = bs.length; i < len; i++) {
    appendE4XToXmppIn(bs[i].contentDocument, stanza);
  }
  if (stanzaUrl) {
    var newTab = gBrowser.getBrowserForTab(
                   gBrowser.addTab(
                     Musubi.makeXmppURI(stanzaTo.address,
                                        stanzaFrom.address,
                                        stanzaFrom.resource,
                                        "share",
                                        stanzaUrl)));
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
    var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
    if (!iframe) return;
    appendE4XToXmppIn(iframe.contentDocument, stanza);
  }
}

function onPresence(aPresenceObj) {
  var stanza = aPresenceObj.stanza;
  if (!stanza.@from.length() || !stanza.@to.length()) return;
  var stanzaFrom = XMPP.JID(stanza.@from.toString());
  var stanzaTo   = XMPP.JID(stanza.@to  .toString());
  var bs = filterBrowsersByURI(stanzaTo.address,
                               stanzaFrom.address,
                               stanzaFrom.resource);
  for (var i = 0, len = bs.length; i < len; i++) {
    appendE4XToXmppIn(bs[i].contentDocument, stanza);
  }
  var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, stanza);
}

function onIQ(aIQObj) {
  var stanza = aIQObj.stanza;
  if (!stanza.@from.length() || !stanza.@to.length()) return;
  var stanzaFrom = XMPP.JID(stanza.@from.toString());
  var stanzaTo   = XMPP.JID(stanza.@to  .toString());
  var bs = filterBrowsersByURI(stanzaTo.address,
                               stanzaFrom.address,
                               stanzaFrom.resource);
  for (var i = 0, len = bs.length; i < len; i++) {
    appendE4XToXmppIn(bs[i].contentDocument, stanza);
  }
  var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, stanza);
}

function findAccountFromAddress(aAddress) {
  var account = Musubi.callWithMusubiDB(function findJIDfromAddressAtMusubiDB(msbdb) {
    return msbdb.account.findByAddress(aAddress)[0];
  });
  if (!account) throw new Error("account data not found: " + aAddress);
  return account;
}

function xmppConnect(aAddress) {
  var p = Musubi.parseJID(aAddress);
  if (!p) return;
  if (Musubi.onlineAccounts[p.jid]) return;
  var account = findAccountFromAddress(p.jid);
  XMPP.up(account);
  account.channel = XMPP.createChannel();
  account.channel.on({
                       direction : "in",
                       event     : "message"
                     },
                     onMessage);
  account.channel.on({
                       direction : "in",
                       event     : "presence"
                     },
                     onPresence);
  account.channel.on({
                       direction : "in",
                       event     : "iq"
                     },
                     onIQ);
  XMPP.send(account, <presence/>);
  Musubi.onlineAccounts[p.jid] = account;
}

function xmppDisconnect(aAddress) {
  var p = Musubi.parseJID(aAddress);
  if (!p) return;
  var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
  // Check the sidebar's iframe is open.
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, <presence type="unavailable" from={p.jid}/>);

  var account = Musubi.onlineAccounts[p.jid];
  if (!account) return;

  account.channel.release();
  XMPP.down(account.jid);
  Musubi.onlineAccounts[p.jid] = null;

}

function xmppSend(aAddress, aXML) {
  var p = Musubi.parseJID(aAddress);
  if (!p) return;
  var account = Musubi.onlineAccounts[p.jid];
  if (!account) return;
  XMPP.send(account, aXML);
}
