function recv(xml) {
  if (xml.name().localName != "musubi") return;
  if (xml.@type == "result" && xml.account.length()) {
    if (xml.account.*.length()) {
      var account = xml.account;
      var p = Musubi.parseJID(account.barejid.toString());
      if (!p) return;
      $("node").value = p.node;
      $("domain").value = p.domain;
      $("password").value = account.password.toString();
      $("connection-host").value = account.connectionHost.toString();
      $("connection-port").value = account.connectionPort.toString();
      if (account.connectionScrty.toString() == "0") {
        $("connection-scrty-none").checked = true;
      } else {
        $("connection-scrty-ssl").checked = true;
      }
    }
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
