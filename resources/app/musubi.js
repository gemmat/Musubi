var Musubi = {
  eltIn:  null,
  eltOut: null,
  info: null,
  init: function MusubiInit() {
    if ("createEvent" in document) {
      this.eltIn  = document.createElement("xmppin");
      this.eltOut = document.createElement("xmppout");
      this.eltIn .style.display = "none";
      this.eltOut.style.display = "none";
      document.documentElement.appendChild(this.eltIn);
      document.documentElement.appendChild(this.eltOut);
      this.eltIn .addEventListener("DOMNodeInserted", this.listnerIn,  false);
      this.eltOut.addEventListener("DOMNodeInserted", this.listnerOut, false);
    }
    this.info = this.parseURI(document.location.href);
  },
  listnerIn:  function MusubiListenerIn(aEvt) {
    Musubi.onRecv(Musubi.DOMToE4X(aEvt.target));
  },
  listnerOut: function MusubiListenerOut(aEvt) {
    if ("createEvent" in document) {
      var e = document.createEvent("Events");
      e.initEvent("XmppEvent", true, false);
      aEvt.target.dispatchEvent(e);
    }
  },
  onRecv: function MusubiOnRecv(aXML) {
  },
  send: function MusubiSend(aXML) {
    Musubi.eltOut.appendChild(Musubi.E4XToDOM(aXML));
  },
  DOMToE4X: function DOMToE4X(aDOMNode) {
    return new XML(new XMLSerializer().serializeToString(aDOMNode));
  },
  E4XToDOM: function E4XToDOM(aXML) {
    return document.importNode(
      new DOMParser().
        parseFromString(aXML.toXMLString(), "application/xml").
		    documentElement,
        true);
  },
  parseURI: function parseURI(aURISpec) {
    function parseHref(aURISpec) {
      var m;
      var reHref = /;href=(.*)$/;
      m = reHref.exec(aURISpec);
      if (m) return [m[1], aURISpec.slice(0, -m[0].length)];
      return ["", aURISpec];
    }
    function parseXmpp(aURISpec) {
      var m;
      var reXMPPColonDoubleSlash = /^xmpp:\/\/([^\/\?#]+)\/([^\/\?#]+)/;
      m = reXMPPColonDoubleSlash.exec(aURISpec);
      if (m) return [m[1], m[2], aURISpec.slice(m[0].length)];
      var reXMPPColon = /^xmpp:([^\/\?#]+)/;
      m = reXMPPColon.exec(aURISpec);
      if (m) return ["", m[1], aURISpec.slice(m[0].length)];
      return null;
    }
    function parseResource(aString) {
      var m;
      var reResource = /^\/([^\/\?#]*)/;
      m = reResource.exec(aString);
      if (m) return [m[1], aString.slice(m[0].length)];
      return [null, aString];
    }
    function parseQuery(aString) {
      var m;
      var reQuery = /^\?(.*)/;
      m = reQuery.exec(aString);
      if (m) return m[1];
      return "";
    }
    var e0 = parseHref(aURISpec);
    var href = e0[0], spec = e0[1];
    var e1 = parseXmpp(spec);
    if (!e1) return null;
    var account = e1[0], sendto = e1[1], r0 = e1[2];
    var e2 = parseResource(r0);
    var resource = e2[0], r1 = e2[1];
    var q  = parseQuery(r1);
    return {
      href:     href,
      account:  account,
      sendto:   sendto,
      resource: resource,
      to:       sendto + (resource == null ? "" : "/" + resource),
      query:    q
    };
  },
  parseJID: function parseJID(aString) {
    var m = /^(.+?@)?(.+?)(?:\/|$)(.*$)/.exec(aString);
    if (!m) return null;
    if (m[1] == undefined) m[1] = "";
    return {
      node:     m[1] ? m[1].slice(0, -1) : "",
      domain:   m[2],
      resource: (aString.indexOf("/") == -1) ? null : m[3],
      barejid:  m[1] + m[2],
      fulljid:  m[1] + m[2] + "/" + m[3]
    };
  }
};

