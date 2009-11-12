var nsXHTMLIm = new Namespace("http://jabber.org/protocol/xhtml-im");
var nsXHTML   = new Namespace("http://www.w3.org/1999/xhtml");

function appendHistory(aElement) {
  var history = $("history");
  if (history.firstChild) {
    history.insertBefore(aElement, history.firstChild);
  } else {
    history.appendChild(aElement);
  }
}

function appendMessage(aFrom, aMessage) {
  var li = new Element("li");
  li.appendChild(document.createTextNode(aFrom.replace(/@.*/, "") + ": " + aMessage.toString()));
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

function appendXHTMLMessage(aFrom, aMessage) {
  var li = new Element("li");
  li.innerHTML = aMessage;
  new Tip(li, Date(),
          {
            title: aFrom,
            style: 'default',
            stem: 'topLeft',
            hook: { tip: 'topLeft', mouse: true },
            offset: { x: 14, y: 14 }
          });
  appendHistory(li);
}

function send(e) {
  Event.stop(e);
  var input = $("input");
  Musubi.send(<message type="chat">
                <body>{input.value}</body>
                <x xmlns="jabber:x:oob">
                  <url>{Musubi.location.href}</url>
                  <desc>Musubi Chat</desc>
                </x>);
              </message>);
  appendMessage("me", input.value);
  input.value = "";
}

function recv(xml) {
  if (xml.name().localName != "message") return;
  if (xml.nsXHTMLIm::html.nsXHTML::body.length()) {
    appendXHTMLMessage(xml.@from.toString(), xml.nsXHTMLIm::html.nsXHTML::body);
  } else if (xml.body.length()) {
    appendMessage(xml.@from.toString(), xml.body.toString());
  }
}

function main(e) {
  Musubi.init(recv);
  Event.observe($("form"), "submit", send);
}

Event.observe(window, "load", main);
