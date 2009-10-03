function findContacts(aJID) {
  var res = [];
  var arr = $$("span.contact");
  for (var i = 0, len = arr.length; i < len; i++) {
    if (aJID == arr[i].textContent) res.push(Element.up(arr[i]));
  }
  return res;
}

function appendPresenceUnsubscribe(aFrom) {
}

function appendPresenceUnsubscribed(aFrom) {
}

function appendPresenceSubscribe(aFrom) {
  appendContactFrom(aFrom);
}

function appendPresenceSubscribed(aFrom) {
}

function makeButtonSubscribe(aJID) {
  var elt = BUTTON("アイサツ");
  Event.observe(elt, "click", function(e) {
    if (Musubi.info) {
      sendPresenceSubscribe(Musubi.info.account, aJID);
      findContacts(aJID).forEach(Element.remove);
    }
  });
  return elt;
}

function makeButtonSubscribed(aJID) {
  var elt = BUTTON("アイサツを返す");
  Event.observe(elt, "click", function(e) {
    if (Musubi.info) {
      sendPresenceSubscribed(Musubi.info.account, aJID);
      findContacts(aJID).forEach(Element.remove);
    }
  });
  return elt;
}

function makeButtonUnsubscribed(aJID) {
  var elt = BUTTON("シカト");
  Event.observe(elt, "click", function(e) {
    if (Musubi.info) {
      sendPresenceUnsubscribed(Musubi.info.account, aJID);
      findContacts(aJID).forEach(Element.remove);
    }
  });
  return elt;
}

function makeButtonUnsubscribe(aJID) {
  var elt = BUTTON("サヨナラ");
  Event.observe(elt, "click", function(e) {
    if (Musubi.info) {
      sendPresenceUnsubscribe(Musubi.info.account, aJID);
      findContacts(aJID).forEach(Element.remove);
    }
  });
  return elt;
}

function makeButtonRemove(aJID) {
  var elt = BUTTON("サヨナラ");
  Event.observe(elt, "click", function(e) {
    if (Musubi.info) {
      sendIQRemoveRoster(Musubi.info.account, aJID);
      findContacts(aJID).forEach(Element.remove);
    }
  });
  return elt;
}

function makeButtonRemoveCompletely(aJID) {
  var elt = BUTTON("ワスれる");
  Event.observe(elt, "click", function(e) {
    if (Musubi.info) {
      sendIQRemoveRosterCompletely(Musubi.info.account, aJID);
      findContacts(aJID).forEach(Element.remove);
    }
  });
  return elt;
}

function appendContactNone(aJID) {
  findContacts(aJID).forEach(Element.remove);
  $("contacts-none").appendChild(LI(SPAN({className: "contact"}, aJID),
                                    makeButtonSubscribe(aJID),
                                    makeButtonRemoveCompletely(aJID)));
}

function appendContactFrom(aJID) {
  findContacts(aJID).forEach(Element.remove);
  $("contacts-from").appendChild(LI(SPAN({className: "contact"}, aJID),
                                    makeButtonSubscribe(aJID),
                                    makeButtonSubscribed(aJID),
                                    makeButtonUnsubscribed(aJID)));
}

function appendContactTo(aJID) {
  findContacts(aJID).forEach(Element.remove);
  $("contacts-to").appendChild(LI(SPAN({className: "contact"}, aJID),
                                  makeButtonSubscribe(aJID),
                                  makeButtonUnsubscribe(aJID),
                                  makeButtonRemoveCompletely(aJID)));
}

function appendContactBoth(aJID) {
  findContacts(aJID).forEach(Element.remove);
  $("contacts-both").appendChild(LI(SPAN({className: "contact"}, aJID),
                                    makeButtonUnsubscribe(aJID)));
}

function sendIQGetRoster(aFulljid, aBarejid) {
  Musubi.send(<iq from={aFulljid} to={aBarejid} type="get">
                <query xmlns="jabber:iq:roster"/>
              </iq>);
}

function sendIQResult(aFrom, aTo, aId) {
  Musubi.send(<iq from={aFrom} to={aTo} type="result" id={aId}/>);
}

function sendIQRemoveRoster(aFrom, aTo) {
  Musubi.send(<iq from={aFrom} type="set" id="remove1">
                <query xmlns="jabber:iq:roster">
                  <item jid={aTo}
                        subscription="remove"/>
                </query>
              </iq>);
}

function sendIQRemoveRosterCompletely(aFrom, aTo) {
  Musubi.send(<iq from={aFrom} type="set" id="roster_4">
                <query xmlns="jabber:iq:roster">
                  <item jid={aTo}
                        subscription="remove"/>
                </query>
              </iq>);
}

function sendIQAddRoster(aFrom, aTo) {
  Musubi.send(<iq from={aFrom} type="set" id="set1">
                <query xmlns="jabber:iq:roster">
                  <item jid={aTo}/>
                </query>
              </iq>);
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
            if (item.@ask.toString() == "subscribe") {
              appendContactTo(jid);
            } else {
              appendContactFrom(jid);
            }
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
      var v = $("subscribe-jid").value;
      sendIQAddRoster(Musubi.info.account, v);
      sendPresenceSubscribe(Musubi.info.account, v);
    }
    Event.stop(e);
  });
});
