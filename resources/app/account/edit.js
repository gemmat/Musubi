function recv(xml) {
  if (xml.name().localName != "musubi") return;
  if (xml.@type == "result" && xml.accounts.length()) {
    var df = document.createDocumentFragment();
    for (var i = 0; i < xml.accounts.account.length(); i++) {
      var account = xml.accounts.account[i];
      var p = Musubi.parseJID(account.barejid.toString());
      if (!p) return;
      var service = makeServiceInfo(p.domain);
      df.appendChild(
        LI(A({href: service.href + "?barejid=" + p.barejid},
          UL({className: "service"},
            LI(IMG({src: service.imgsrc, alt: service.imgalt})),
            LI(SPAN({className: "account-jid"}, p.barejid)),
            LI(service.imgalt)))));
    }
    $("accounts").appendChild(df);
  }
  processLocale(xml);
}

Event.observe(window, "load", function (evt) {
  Builder.dump(window);
  Musubi.init(recv);
  sendMusubiGetLocales("chrome://musubi/locale/account.edit.properties");
  sendMusubiReadAllAccount();
});
