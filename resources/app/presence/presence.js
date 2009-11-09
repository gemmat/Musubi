function appendHistory(aElement) {
  var history = $("history");
  if (history.firstChild) {
    history.insertBefore(aElement, history.firstChild);
  } else {
    history.appendChild(aElement);
  }
}

function appendStatus(aFrom, aStatus) {
  var df = document.createDocumentFragment();
  var spanContact = new Element("span", {className: "contact"});
  spanContact.appendChild(document.createTextNode(aFrom));
  Event.observe(spanContact, "click", sendOpenContact);
  var spanStatus = new Element("span", {className: "status"});
  spanStatus.appendChild(document.createTextNode(aStatus));
  df.appendChild(spanContact);
  df.appendChild(document.createTextNode(" : "));
  df.appendChild(spanStatus);
  var li = new Element("li");
  li.appendChild(df);
  new Tip(li, Date(),
          {
            title: aFrom,
            style: 'default',
            stem: 'topLeft',
            hook: { tip: 'topLeft' },
            offset: { x: 14, y: 14 }
          });
  appendHistory(li);
}

function sendPresence(e) {
  Event.stop(e);
  var input = $("input");
  Musubi.send(<presence>
                <status>{input.value}</status>
              </presence>);
  appendStatus("me", input.value);
  input.value = "";
}

function sendOpenContact(e) {
  Event.stop(e);
  Musubi.send(<musubi type="set">
                <opencontact>{e.target.textContent}</opencontact>
              </musubi>);
}

function recv(xml) {
  if (xml.name().localName != "presence") return;
  if (xml.status.length()) {
    appendStatus(xml.@from.toString(), xml.status.toString());
  } else if (xml.@type.length()) {
    appendStatus(xml.@from.toString(), xml.@type.toString());
  } else {
    appendStatus(xml.@from.toString(), "");
  }
}

function recvTest0() {
  recv(<presence from="hogehoge@gmail.com/foobar">
         <status>Hi, all</status>
       </presence>);
}

function recvTest1() {
  recv(<presence from="hogehoge@gmail.com/foobar" />);
}

function recvTest2() {
  recv(<presence from="hogehoge@gmail.com/foobar" type="unavailable"/>);
}

function main(e) {
  Musubi.init(recv);
  Event.observe($("form"), "submit", sendPresence);
}

Event.observe(window, "load", main);
