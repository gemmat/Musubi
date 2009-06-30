const EXPORT = ["onlineAccounts", "DOMToE4X", "E4XToDOM", "xmppConnect", "xmppDisconnect", "xmppSendURL"];

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

function xmppConnect(aJID) {
  function onMessageForDocument(aXML) {
    if (!aXML.body.length()) return;
	  var elts = window.content.document.documentElement.getElementsByTagName("XmppIn");
	  if (elts.length) elts[0].appendChild(E4XToDOM(aXML));
  }
  function onMessageForSidbarIframe(aXML) {
    if (!aXML.body.length()) return;
    // Check the sidebar's iframe is open.
    var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
    if (!iframe) return;
    var elts = iframe.contentDocument.getElementsByTagName("XmppIn");
    if (elts.length) elts[0].appendChild(E4XToDOM(aXML));
  }
  function onMessage(aMessageObj) {
    onMessageForDocument(aMessageObj.stanza);
    onMessageForSidbarIframe(aMessageObj.stanza);
  }

  var account = Musubi.callWithMusubiDB(function(msbdb) {
                  return msbdb.account.findByJid(aJID)[0];
                });
  if (!account) throw new Error("account data not found: " + aJID);
  account.password = account.name;
  XMPP.up(account);
  account.channel = XMPP.createChannel();
  account.channel.on({
                       direction : "in",
                       event     : "message"
                     },
                     onMessage);
  XMPP.send(account, <presence/>);
  Musubi.onlineAccounts[aJID] = account;
}

function xmppDisconnect(aJID) {
  var account = Musubi.onlineAccounts[aJID];
  account.channel.release();
  XMPP.down(account);
  Musubi.onlineAccounts[aJID] = null;
}

//jabber:x:oob is XEP-0066 Out of Band Data.
function xmppSendURL(aJID, aSendto, aURL) {
  var account = Musubi.onlineAccounts[aJID];
  XMPP.send(account,
    <message to={aSendto} type="chat">
	    <body>{aURL}</body>
	    <x xmlns="jabber:x:oob">
        <url>{aURL}</url>
        <desc>{window.content.document.title}</desc>
      </x>
	  </message>);
}
