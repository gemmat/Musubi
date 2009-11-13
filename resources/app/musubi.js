var Musubi = {
  eltIn:  null,
  eltOut: null,
  location: {href: "", info: null},
  init: function MusubiInit(onRecv) {
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
    var o = this.parseURI(document.location.href);
    if (o) {
      this.location.info = o;
      this.location.href = o.frag;
    } else {
      this.location.href = document.location.href;
    }
    Musubi.onRecv = onRecv;
    Musubi.send(<musubi><init/></musubi>);
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
    function parseXmpp(aURISpec, aCont) {
      var m;
      m = /^xmpp:\/\//.exec(aURISpec);
      if (m) return ["xmpp://", aURISpec.slice(m[0].length)];
      m = /^xmpp:/.exec(aURISpec);
      if (m) return ["xmpp:", aURISpec.slice(m[0].length)];
      return null;
    }
    function parseFrag(aURISpec) {
      var m = /#(.*)/.exec(aURISpec);
      if (m) return [m[1], aURISpec.slice(0, -m[0].length)];
      return [null, aURISpec];
    }
    function parseQuery(aURISpec) {
      var m = /\?(.*)$/.exec(aURISpec);
      if (m) return [m[1], aURISpec.slice(0, -m[0].length)];
      return [null, aURISpec];
    }
    function parseHier(aURISpec, aScheme) {
      var arr = aURISpec.split("/");
      switch (arr.length) {
      case 1:
        if (!arr[0]) return null;
        if (aScheme == "xmpp:")
          return [null, arr[0]];
        break;
      case 2:
        if (!arr[0]) return null;
        if (aScheme == "xmpp:")
          return [null, arr[0] + "/" + arr[1]];
        if (aScheme == "xmpp://")
          return [arr[0] + "/" + arr[1], null];
        break;
      case 3:
        if (!arr[0] || !arr[2]) return null;
        if (aScheme == "xmpp://")
          return [arr[0] + "/" + arr[1], arr[2]];
        break;
      case 4:
        if (!arr[0] || !arr[2]) return null;
        if (aScheme == "xmpp://")
          return [arr[0] + "/" + arr[1], arr[2] + "/" + arr[3]];
        break;
      }
      return null;
    }
    var tmp;
    tmp = parseXmpp(aURISpec);
    if (!tmp) return null;
    var scheme = tmp[0];
    tmp = parseFrag(tmp[1]);
    var frag = tmp[0];
    tmp = parseQuery(tmp[1]);
    var query = tmp[0];
    tmp = parseHier(tmp[1], scheme);
    if (!tmp) return null;
    var auth = tmp[0], path = tmp[1];
    return {
      auth:  auth,
      path:  path,
      query: query,
      frag:  frag
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
