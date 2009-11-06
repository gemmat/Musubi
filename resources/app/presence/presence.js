function appendHistory(aElement) {
  var history = $("history");
  if (history.firstChild) {
    history.insertBefore(aElement, history.firstChild);
  } else {
    history.appendChild(aElement);
  }
}

function appendStatus(aFrom, aStatus) {
  var li = new Element("li");
  li.appendChild(document.createTextNode(aFrom + ": " + aStatus.toString()));
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

function send(e) {
  Event.stop(e);
  var input = $("input");
  Musubi.send(<presence>
                <status>{input.value}</status>
              </presence>);
  appendStatus("me", input.value);
  input.value = "";
}

function recv(xml) {
  if (xml.name().localName != "presence") return;
  if (xml.status.length()) {
    appendStatus(xml.@from.toString(), xml.status.toString());
  }
  if (xml.@type.length()) {
    appendStatus(xml.@from.toString(), xml.@type.toString());
  } else {
    appendStatus(xml.@from.toString(), "");
  }
}

function main(e) {
  Musubi.init(recv);
  Event.observe($("form"), "submit", send);
}

Event.observe(window, "load", main);
