function recv(xml) {
  if (xml.name().localName != "musubi") return;
  if (xml.@type == "result" && xml.account.length()) {
    if (xml.account.*.length()) {
      var p = Musubi.parseJID(xml.account.barejid.toString());
      if (!p) return;
      $("node").value = p.node;
      if (p.domain == "gmail.com") {
        $("domain-gmail").selected = true;
      } else if (p.domain == "googlemail.com") {
        $("domain-googlemail").selected = true;
      }
      $("connection-host").value = xml.account.connectionHost.toString();
      $("connection-port").value = xml.account.connectionPort.toString();
      if (xml.account.connectionScrty.toString() == "0") {
        $("connection-scrty-none").checked = true;
      } else {
        $("connection-scrty-ssl").checked = true;
      }
    }
    return;
  }
  processLocale(xml);
}

Event.observe(window, "load", function windowOnLoad(evt) {
  Musubi.init(recv);
  sendMusubiGetLocales("chrome://musubi/locale/account.properties");
  Event.observe("form", "submit", function(e) {
    var o = Form.serialize("form", true);
    sendMusubiCreateUpdateAccount(o["node"] + "@" + o["domain"],
                                  o["resource"],
                                  o["password"],
                                  o["connection-host"],
                                  o["connection-port"],
                                  o["connection-scrty"]);
    sendMusubiSetDefaultAuth(o["node"] + "@" + o["domain"] + "/" + o["resource"]);
    Event.stop(e);
  });
  var m = /^\?barejid=(.+)/.exec(document.location.search);
  if (m) sendMusubiReadAccount(m[1]);
});
