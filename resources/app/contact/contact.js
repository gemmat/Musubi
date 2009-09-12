function findContacts(aJID) {
  return [];
  var res = [];
  var arr = [].concat($("contacts-none").childElements(),
                      $("contacts-from").childElements(),
                      $("contacts-to").childElements(),
                      $("contacts-both").childElements());
  for (var i = 0, len = arr.length; i < len; i++) {
    if (aJID == arr[i].textContent) res.push(arr[i]);
  }
  return res;
}

function appendPresenceUnsubscribe(aFrom) {
}

function appendPresenceUnsubscribed(aFrom) {
}

function appendPresenceSubscribe(aFrom) {
}

function appendPresenceSubscribed(aFrom) {
}

function appendContactNone(aJID) {
  findContacts(aJID).forEach(function(x) {
    Element.remove(x);
  });
  var buttonSubscribe = BUTTON("アイサツ");
  var elt = LI(SPAN({className: "contact"}, aJID),
                buttonSubscribe);
  Event.observe(buttonSubscribe, "click", function(e) {
                  if (Musubi.info) {
                    sendPresenceSubscribe(Musubi.info.account, aJID);
                  }
                  Element.remove(buttonSubscribe);
                  elt.appendChild(SPAN("アイサツしました"));
                });
  $("contacts-none").appendChild(elt);

}

function appendContactFrom(aJID) {
  findContacts(aJID).forEach(function(x) {
    Element.remove(x);
  });
  var buttonSubscribed   = BUTTON("アイサツ");
  var buttonUnsubscribed = BUTTON("シカト");
  var elt = LI(SPAN({className: "contact"}, aJID),
                buttonSubscribe,
                buttonUnsubscribe);
  Event.observe(buttonSubscribe, "click", function(e) {
                  if (Musubi.info) {
                    sendPresenceSubscribe(Musubi.info.account, aJID);
                  }
                  Element.remove(buttonSubscribe);
                  Element.remove(buttonUnsubscribe);
                  elt.appendChild(SPAN("フレンドになりました"));
                });
  Event.observe(buttonUnsubscribe, "click", function(e) {
                  if (Musubi.info) {
                    sendPresenceUnsubscribe(Musubi.info.account, aJID);
                  }
                  Element.remove(buttonSubscribe);
                  Element.remove(buttonUnsubscribe);
                  elt.appendChild(SPAN("ムカンケイになりました"));
                });
  $("contacts-from").appendChild(elt);
}

function appendContactTo(aJID) {
  findContacts(aJID).forEach(function(x) {
    Element.remove(x);
  });
  var buttonUnsubscribed = BUTTON("キャンセル");
  var elt = LI(SPAN({className: "contact"}, aJID),
                buttonUnsubscribed);
  Event.observe(buttonUnsubscribed, "click", function(e) {
                  if (Musubi.info) {
                    sendPresenceUnsubscribed(Musubi.info.account, aJID);
                  }
                  Element.remove(buttonUnsubscribed);
                  elt.appendChild(SPAN("ムカンケイになりました"));
                });
  $("contacts-to").appendChild(elt);
}

function appendContactBoth(aJID) {
  findContacts(aJID).forEach(function(x) {
    Element.remove(x);
  });
  var buttonUnsubscribe = BUTTON("やめる");
  var elt = LI(SPAN({className: "contact"}, aJID),
                buttonUnsubscribe);
  Event.observe(buttonUnsubscribe, "click", function(e) {
                  if (Musubi.info) {
                    sendPresenceUnsubscribe(Musubi.info.account, aJID);
                  }
                  Element.remove(buttonUnsubscribe);
                  elt.appendChild(SPAN("フレンドをやめました"));
                });
  $("contacts-both").appendChild(elt);
}

function sendIQGetRoster(aFulljid, aBarejid) {
  Musubi.send(<iq from={aFulljid} to={aBarejid} type="get">
                <query xmlns="jabber:iq:roster"/>
              </iq>);
}

function sendIQResult(aFrom, aTo, aId) {
  Musubi.send(<iq from={aFrom} to={aTo} type="result" id={aId}/>);
}

function sendPresenceSubscribe(aFrom, aTo) {
  Musubi.send(<presence from={aFrom} to={aTo} type="subscribe"/>);
}

function sendPresenceSubscribed(aFrom, aTo) {
  Musubi.send(<presence from={aFrom} to={aTo} type="subscribed"/>);
}

function sendPresenceUnsubscribed(aFrom, aTo) {
  Musubi.send(<presence from={aFrom} to={aTo} type="unsubscribed"/>);
}

function sendPresenceUnsubscribe(aFrom, aTo) {
  Musubi.send(<presence from={aFrom} to={aTo} type="unsubscribe"/>);
}

function recv(xml) {
  switch (xml.name().localName) {
  case "message":
    break;
  case "presence":
    if (xml.@from.length()) {
      switch (xml.@type.toString()) {
      case "unsubscribe":
        appendPresenceUnsubscribe(xml.@from.toString());
        break;
      case "unsubscribed":
        appendPresenceUnsubscribed(xml.@from.toString());
        break;
      case "subscribe":
        appendPresenceSubscribe(xml.@from.toString());
        break;
      case "subscribed":
        appendPresenceSubscribed(xml.@from.toString());
        break;
      default:
        break;
      }
    }
    break;
  case "iq":
    if (xml.@type == "result" || xml.@type == "set") {
      var nsIQRoster = new Namespace("jabber:iq:roster");
      if (xml.nsIQRoster::query.length() && xml.nsIQRoster::query.nsIQRoster::item.length()) {
        for (var i = 0, len = xml.nsIQRoster::query.nsIQRoster::item.length(); i < len; i++) {
          var item = xml.nsIQRoster::query.nsIQRoster::item[i];
          var jid = item.@jid.toString();
          switch (item.@subscription.toString()) {
          case "none":
            appendContactNone(jid);
            break;
          case "from":
            appendContactFrom(jid);
            break;
          case "to":
            appendContactTo(jid);
            break;
          case "both":
            appendContactBoth(jid);
            break;
          default:
            break;
          }
        }
      }
      if (xml.@type == "set") {
        if (Musubi.info) {
          sendIQResult(Musubi.info.account, xml.@from, xml.@id);
        }
      }
    }
  }
}

function recvTest0() {
  recv(<presence from="chat@conference.jabber.org/Alice"/>);
  recv(<presence from="chat@conference.jabber.org/Bob"/>);
  recv(<presence from="chat@conference.jabber.org/Charlie"/>);
  recv(<presence from="chat@conference.jabber.org/Dan"/>);
  recv(<presence from="chat@conference.jabber.org/Emily"/>);
  recv(<presence from="chat@conference.jabber.org/Fey"/>);
}

function recvTest1() {
  recv(<presence from="juliet@localhost" type="unavailable"/>);
}

function recvTest2() {
  recv(<presence from="juliet@localhost" type="subscribe"/>);
}

function recvTest3() {
  recv(<iq from="romeo@localhost" to="romeo@localhost/Home" type="result">
         <query xmlns="jabber:iq:roster">
           <item jid="None0@localhost"      subscription="none"/>
           <item jid="None1@wonderland.lit" subscription="none"/>
           <item jid="From0@wonderland.lit" subscription="from"/>
           <item jid="From1@realworld.lit"  subscription="from"/>
           <item jid="to0@wonderland.lit"   subscription="to"/>
           <item jid="to1@realworld.lit"    subscription="to"/>
           <item jid="both0@wonderland.lit" subscription="both"/>
           <item jid="both1@realworld.lit"  subscription="both"/>
         </query>
       </iq>);
}

function recvTest4() {
  recv(<iq from="juliet@localhost" to="juliet@localhost/Home" type="result"/>);
}

Event.observe(window, "load", function (evt) {
  Builder.dump(window);
  Musubi.init();
  Musubi.onRecv = recv;
  if (Musubi.info) {
    sendIQGetRoster(Musubi.info.to, Musubi.info.account);
  }
  Event.observe("subscribe-form", "submit", function(e) {
    if (Musubi.info) {
      sendPresenceSubscribe(Musubi.info.account, $("subscribe-jid").value);
    }
    Event.stop(e);
  });
});
