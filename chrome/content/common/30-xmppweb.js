const EXPORT = ["appendE4XToXmppIn", "filterBrowsersByURI", "xmppConnect", "xmppDisconnect", "xmppSend", "xmppCachedPresences"];

function appendE4XToXmppIn(aDocument, aE4X) {
  var arr = Musubi.deeplyGetElementsByTagName(aDocument, "xmppin");
  for (var i = 0, len = xmppins.length; i < len; i++) {
    var dom = Musubi.E4XToDOM(arr[i].doc, aE4X);
    arr[i].elt.appendChild(dom);
  }
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
        var sidebar = Musubi.getMusubiSidebar();
        if (!sidebar) return;
        appendE4XToXmppIn(sidebar.iframe.doc, stanza);
      }
    }
    return;
  }
  var sidebar = Musubi.getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, stanza);
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
  var sidebar = Musubi.getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, stanza);
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
  var sidebar = Musubi.getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, stanza);
}

function xmppConnect(aFulljid) {
  var p = Musubi.parseJID(aFulljid);
  if (!p) return;
  if (Application.storage.get(p.barejid, null)) return;
  var account = Musubi.DBFindAccountByBarejid(p.barejid);
  account.channel = XMPP.createChannel();
  account.channel.on({direction : "in", event : "message"},  onMessage);
  account.channel.on({direction : "in", event : "presence"}, onPresence);
  account.channel.on({direction : "in", event : "iq"},       onIQ);
  // XMPP.up(account, ...) shows a useless dialog, so we use XMPP.up("romeo@localhost/Home", ...);
  XMPP.up(account.barejid + "/" + account.resource, function cont(jid) {
    Application.storage.set(account.barejid, account);
    xmppSend(<presence from={account.barejid}/>);
    var sidebar = Musubi.getMusubiSidebar();
    if (!sidebar) return;
    appendE4XToXmppIn(sidebar.iframe.doc,
                      <musubi type="result">
                        <connect>{p.barejid}</connect>
                      </musubi>);
  });
}

function xmppDisconnect(aFulljid) {
  var p = Musubi.parseJID(aFulljid);
  if (!p) return;
  var sidebar = Musubi.getMusubiSidebar();
  if (!sidebar) return;
  appendE4XToXmppIn(sidebar.iframe.doc, <presence type="unavailable" from={p.fulljid}/>);
  var account = Application.storage.get(p.barejid, null);
  if (!account) return;
  account.channel.release();
  XMPP.down(account);
  Application.storage.set(p.barejid, null);
}

function xmppSend(aXML) {
  var p = Musubi.parseJID(aXML.@from.toString());
  if (!p) return;
  var account = Application.storage.get(p.barejid, null);
  if (!account) return;
  delete aXML.@from;
  // XMPP.send(account, ...) shows a useless dialog, so we use XMPP.send("romeo@localhost/Home", ...);
  XMPP.send(account.barejid + "/" + account.resource, aXML);
}

function xmppCachedPresences() {
  //TODO check aE4X.@from with presence.@from.
  return XMPP.cache.all(XMPP.q().event("presence"));
}
