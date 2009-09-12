function appendMessage(aFrom, aMessage) {
  var history = $("history");
  history.appendChild(DT(aFrom));
  history.appendChild(DD(aMessage));
}

function appendXHTMLMessage(aFrom, aMessage) {
  var history = $("history");
  history.appendChild(DT(aFrom));
  history.appendChild(DD().update(aMessage));
}

function appendPresence(aFrom, aTo, aPresenceType) {
  switch (aPresenceType) {
  case "unavailable":
    findContacts(aFrom).forEach(function(x) {
      Element.remove(x);
    });
    syncContactsWithSendtoOptions();
    break;
  case "subscribe":
    var elt0 = LI(SPAN(aFrom + "からフレンドリクエストです。オプションへどうぞ"));
    setTimeout(function(e) {Element.remove(elt0);}, 5000);
    $("contacts-message").appendChild(elt0);
    break;
  case "subscribed":
    var elt1 = LI(SPAN(aFrom + "がフレンドリクエストにOKしました"));
    setTimeout(function(e) {Element.remove(elt1);}, 5000);
    $("contacts-message").appendChild(elt1);
    break;
  case "unsubscribed":
    var elt2 = LI(SPAN(aFrom + "がフレンドリクエストをキャンセルしました"));
    setTimeout(function(e) {Element.remove(elt2);}, 5000);
    $("contacts-message").appendChild(elt2);
    break;
  default:
    if (!Musubi.info) break;
    var p = Musubi.parseJID(aFrom);
    if (!p) break;
    if (Musubi.info.account == p.barejid) break;
    if (findContacts(p.fulljid).length) break;
    var elt3 = LI(SPAN({className: "contact-item"}, aFrom));
    Event.observe(elt3, "click", (function (aTo) {
      return function(e) {
        if (Musubi.info) {
          sendMusubiOpenContact(Musubi.info.account, aTo);
        }
      };
    })(aFrom));
    $("contacts").appendChild(elt3);
    syncContactsWithSendtoOptions();
    break;
  }
}

function findContacts(aFrom) {
  var res = [];
  var arr = $("contacts").childElements();
  var p0 = Musubi.parseJID(aFrom);
  if (!p0) return res;
  for (var i = 0, len = arr.length; i < len; i++) {
    var p1 = Musubi.parseJID(arr[i].down().textContent);
    if (!p1) continue;
    if (p0.resource == null) {
      if (p0.barejid == p1.barejid) res.push(arr[i]);
    } else {
      if (p0.fulljid == p1.fulljid) res.push(arr[i]);
    }
  }
  return res;
}

function syncContactsWithSendtoOptions() {
  var selectSendto = $("sendto");
  while (selectSendto.firstChild)
    selectSendto.removeChild(selectSendto.firstChild);
  var df = document.createDocumentFragment();
  $("contacts").childElements().forEach(function(x) {
    var value = x.down().textContent;
    df.appendChild(OPTION({value: value}, value));
  });
  selectSendto.appendChild(df);
}

function appendRoster(aFrom, aItems) {
  var df = document.createDocumentFragment();
  for (var i = 0, len = aItems.length(); i < len; i++) {
    var itemjid = aItems[i].@jid.toString();
    if (findContacts(itemjid).length) continue;
    var elt = LI(SPAN({className: "contact-item"}, itemjid));
    Event.observe(elt, "click", (function (aTo) {
      return function(e) {
        if (Musubi.info) {
          sendMusubiOpenContact(Musubi.info.account, aTo);
        }
      };
    })(itemjid));
    df.appendChild(elt);
  }
  $("contacts").appendChild(df);
  syncContactsWithSendtoOptions();
}

function send() {
  var value = $F("msg");
  Musubi.send(<message to={$("sendto").value} type="chat">
                <body>{value}</body>
              </message>);
  appendMessage("me", value);
  Field.clear("msg");
}

function recv(xml) {
  switch (xml.name().localName) {
  case "message":
    var nsXHTMLIm = new Namespace("http://jabber.org/protocol/xhtml-im");
    var nsXHTML   = new Namespace("http://www.w3.org/1999/xhtml");
    if (xml.nsXHTMLIm::html.nsXHTML::body.length()) {
      appendXHTMLMessage(xml.@from.toString(),
                         xml.nsXHTMLIm::html.nsXHTML::body.toString());
    } else {
      appendMessage(xml.@from.toString(),
                    xml.body.toString());
    }
    break;
  case "presence":
    if (xml.@from.length()) {
      appendPresence(xml.@from.toString(),
                     xml.@to.toString(),
                     xml.@type.toString());
    }
    break;
  case "iq":
    if (xml.@type == "result" || xml.@type == "set") {
      var nsIQRoster = new Namespace("jabber:iq:roster");
      if (xml.nsIQRoster::query.length() && xml.nsIQRoster::query.nsIQRoster::item.length()) {
        appendRoster(xml.@from.toString(), xml.nsIQRoster::query.nsIQRoster::item);
      }
      if (xml.@type == "set") {
        if (Musubi.info) {
          sendIQResultRoster(Musubi.info.account, xml.@from.toString, xml.@id.toString());
        }
      }
    }
  }
  var historyContainer = $("history-container");
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function sendMusubiOpenContact(aFrom, aTo) {
  Musubi.send(<musubi type="get">
                <opencontanct>
                  <account>{aFrom}</account>
                  <contact>{aTo}</contact>
                </opencontanct>
              </musubi>);
}

function sendMusubiGetCachedPresence(aFrom) {
  Musubi.send(<musubi type="get">
                <cachedpresences from={aFrom}/>
              </musubi>);
}

function sendIQGetRoster(aFulljid, aBarejid) {
  Musubi.send(<iq from={aFulljid} to={aBarejid} type="get">
                <query xmlns="jabber:iq:roster"/>
              </iq>);
}

function sendIQResultRoster(aAccount, aTo, aId) {
  Musubi.send(<iq from={aAccount} to={aTo} id={aId} type="result"/>);
}

function recvTest0() {
  recv(<message from="romeo@localhost">
         <body>"hello, world."</body>
       </message>);
}

function recvTest1() {
  recv(<message from="romeo@localhost">
         <body>hello world</body>
         <x xmlns="jabber:x:oob">
           <url>http://www.google.co.jp</url>
           <desc>Google</desc>
         </x>
       </message>);
}

function recvTest2() {
  recv(<message from="romeo@localhost">
         <body>hi!</body>
         <html xmlns="http://jabber.org/protocol/xhtml-im">
           <body xmlns="http://www.w3.org/1999/xhtml">
             <p style="font-weight:bold">hi!</p>
           </body>
         </html>
       </message>);
}

function recvTest3() {
  recv(<presence from="juliet@localhost"/>);
}

function recvTest4() {
  recv(<presence from="chat@conference.jabber.org/Alice"/>);
  recv(<presence from="chat@conference.jabber.org/Bob"/>);
  recv(<presence from="chat@conference.jabber.org/Charlie"/>);
  recv(<presence from="chat@conference.jabber.org/Dan"/>);
  recv(<presence from="chat@conference.jabber.org/Emily"/>);
  recv(<presence from="chat@conference.jabber.org/Fey"/>);
}

function recvTest5() {
  recv(<presence from="juliet@localhost" type="unavailable"/>);
}

function recvTest6() {
  recv(<presence from="chat@conference.jabber.org" type="unavailable"/>);
}

function recvTest7() {
  recv(<presence from="someone@localhost" type="subscribe"/>);
}

function recvTest8() {
  recv(<iq from="romeo@localhost" to="romeo@localhost/Home" type="result">
         <query xmlns="jabber:iq:roster">
           <item jid="juliet@localhost"/>
           <item jid="lory@wonderland.lit"/>
           <item jid="mouse@wonderland.lit"/>
           <item jid="sister@realworld.lit"/>
         </query>
       </iq>);
}

function recvTest9() {
  recv(<iq from="juliet@localhost" to="juliet@localhost/Home" type="result"/>);
}

Event.observe(window, "load", function (e) {
  Builder.dump(window);
  Musubi.init();
  Musubi.onRecv = recv;
  if (Musubi.info) {
    sendMusubiGetCachedPresence(Musubi.info.to);
    sendIQGetRoster(Musubi.info.to, Musubi.info.account);
    $("account-container").appendChild(P(A({href: document.location.href},
                                           Musubi.info.account)));
  }
  Event.observe("chat", "submit", function(e) {
    send();
    Event.stop(e);
  });
});
