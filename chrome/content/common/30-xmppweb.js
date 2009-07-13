const EXPORT = ["onlineAccounts", "DOMToE4X", "E4XToDOM", "updateXMPP4MOZAccount", "appendE4XToXmppIn", "xmppConnect", "xmppDisconnect", "xmppSendURL"];

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
  var key = 0;
  // The xmpp4moz's xmpp_impl.jsm says
  // "deprecation('2009-04-09 getAccountByJid() - use accounts.get({jid: <jid>}) instead');"
  // Roger that, however, we intentionally use the getAccountByJid for the backward compatibility.
  var xmpp4mozAccount = XMPP.getAccountByJid(aAccount.jid);
  if (xmpp4mozAccount) {
    key = xmpp4mozAccount.key;
  } else {
    key = Date.now();
  }
  var prefs = new Musubi.Prefs("xmpp.account." + key + ".");
  prefs.set("address",  aAccount.address);
  prefs.set("resource", aAccount.resource);
  prefs.set("connectionHost", aAccount.connectionHost);
  prefs.set("connectionPort", aAccount.connectionPort);
  prefs.set("connectionSecurity", aAccount.connectionSecurity);
}

function appendE4XToXmppIn(aDocument, aE4X) {
  var elts = aDocument.getElementsByTagName("XmppIn");
  if (elts.length) elts[0].appendChild(E4XToDOM(aE4X));
}

//We call onMessage many times so we need to be aware of the performance.
function onMessage(aMessageObj) {
  var stanza = aMessageObj.stanza;
  if (!stanza.@to.length() || !stanza.@from.length() || !stanza.body.length()) return;
  var nsoob = new Namespace("jabber:x:oob");
  var stanzaFrom = XMPP.JID(stanza.@from.toString()).address;
  var stanzaTo   = XMPP.JID(stanza.@to  .toString()).address;
  var stanzaUrl  = stanza.nsoob::x.nsoob::url.toString();
  if (stanzaUrl) {
    var url = "xmpp://" + stanzaTo + "/" + stanzaFrom + "?href;url=" + stanzaUrl;
    var notfound = true;
    for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
      var b = gBrowser.getBrowserAtIndex(i);
      if (b.currentURI.spec == url) {
        notfound = false;
        appendE4XToXmppIn(b.contentDocument, stanza);
      }
    }
    if (notfound) {
      var newTab = gBrowser.getBrowserForTab(gBrowser.addTab(url));
      newTab.addEventListener("load", function(e) {
        appendE4XToXmppIn(newTab.contentDocument, stanza);
      });
    }
  } else {
    var notfound = true;
    for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
      var b = gBrowser.getBrowserAtIndex(i);
      if (Musubi.parseLocationHref(b.currentURI.spec)[1] == stanzaFrom) {
        notfound = false;
        appendE4XToXmppIn(b.contentDocument, stanza);
      }
    }
    if (notfound) {
      var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
      // Check the sidebar's iframe is open.
      if (!iframe) return;
      appendE4XToXmppIn(iframe.contentDocument, stanza);
    }
  }
}

function onPresence(aPresenceObj) {
  var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
  // Check the sidebar's iframe is open.
  if (!iframe) return;
  appendE4XToXmppIn(iframe.contentDocument, aPresenceObj.stanza);
}

function xmppConnect(aAddress) {
  var account = Musubi.callWithMusubiDB(function(msbdb) {
                  return msbdb.account.findByAddress(aAddress)[0];
                });
  if (!account) throw new Error("account data not found: " + aAddress);
  XMPP.up(account.jid);
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
  XMPP.send(account, <presence/>);
  Musubi.onlineAccounts[aAddress] = account;
}

function xmppDisconnect(aAddress) {
  var account = Musubi.onlineAccounts[aAddress];
  account.channel.release();
  XMPP.down(account.jid);
  Musubi.onlineAccounts[aAddress] = null;
}

//jabber:x:oob is XEP-0066 Out of Band Data.
function xmppSendURL(aAddress, aSendto, aURL) {
  var account = Musubi.onlineAccounts[aAddress];
  XMPP.send(account,
    <message to={aSendto} type="chat">
	    <body>{aURL}</body>
	    <x xmlns="jabber:x:oob">
        <url>{aURL}</url>
        <desc>{window.content.document.title}</desc>
      </x>
	  </message>);
}
