function recv(xml) {
  processLocale(xml);
}

Event.observe(window, "load", function windowOnLoad(evt) {
  Musubi.init(recv);
  sendMusubiGetLocales("chrome://musubi/locale/account.new.properties");
});