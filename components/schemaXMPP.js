Components.utils.import("resource://musubi/modules/00-Utils.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function XMPProtocol() {}

XMPProtocol.prototype = {
  classDescription: "XMPP Protocol",
  contractID      : "@mozilla.org/network/protocol;1?name=xmpp",
  classID         : Components.ID("f6cb8fd0-ef54-11dd-ba2f-0800200c9a67"),
  QueryInterface  : XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

  scheme: "xmpp",
  defaultPort: -1,
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH | Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  allowPort: function XMPProtocolAllowPort(aPort, aScheme) {
    return false;
  },
  newURI: function XMPProtocolNewURI(aSpec, aCharset, aBaseURI) {
    function makeXmppSpec(aSpec, aCharset, aBaseURI) {
      if (aBaseURI) {
        var m;
        var reXMPPColonDoubleSlash = /^xmpp:\/\/([^\/\?#]+)\/([^\/\?#]+)/;
        var reXMPPColon = /^xmpp:([^\/\?#]+)/;

        m = reXMPPColonDoubleSlash.exec(aBaseURI.spec);
        if (m) {
          var m1 = reXMPPColon.exec(aSpec);
          if (m1 && m1[1] != m[2]) return "xmpp://" + m[1] + "/" + m1[1];
          return "xmpp://" + m[1] + "/" + m[2];
        }
        m = reXMPPColon.exec(aBaseURI.spec);
        if (m) return "xmpp:" + m[1];
      }
      return "";
    }
    function makeActnSpec(aSpec, aCharset, aBaseURI) {
      var o;
      o = parseURI(aSpec);
      if (o) return o.action;
      if (aBaseURI) {
        o = parseURI(aBaseURI.spec);
        if (o) return o.action;
      }
      return "";
    }
    function makeHrefSpec(aSpec, aCharset, aBaseURI) {
      var o;
      o = parseURI(aSpec);
      if (o) return o.href;
      if (aBaseURI) {
        o = parseURI(aBaseURI.spec);
        if (o) {
          var base = IOService.newURI(o.href, null, null);
          var url = Cc["@mozilla.org/network/standard-url;1"]
                      .createInstance(Ci.nsIStandardURL);
          url.init(1, -1, aSpec, aCharset, base);
          url.QueryInterface(Ci.nsIURI);
          return url.spec;
        }
      }
      return aSpec;
    }
    var xmpp = makeXmppSpec(aSpec, aCharset, aBaseURI);
    var actn = makeActnSpec(aSpec, aCharset, aBaseURI);
    var href = makeHrefSpec(aSpec, aCharset, aBaseURI);
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    uri.spec = xmpp ? xmpp + actn + (href ? ";href=" + href : "") : aSpec;
    return uri;
  },
  newChannel: function XMPProtocolNewChannel(aURI) {
    var o = parseURI(aURI.spec);
    var url = o ? o.href : "http://www.google.co.jp";
    return IOService.newChannel(url, null, null);
  }
};

function NSGetModule(compMgr, fileSpec){
	return XPCOMUtils.generateModule([XMPProtocol]);
}
