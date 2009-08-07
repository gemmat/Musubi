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
        m = /^(xmpp:\/\/[^\/\?#]+\/[^\/\?#]+)/.exec(aBaseURI.spec);
        if (m) return m[1];
        m = /^(xmpp:[^\/\?#]+)/.exec(aBaseURI.spec);
        if (m) return m[1];
      }
      return "";
    }
    function makeShareHrefSpec(aSpec, aCharset, aBaseURI) {
      var sh;
      sh = parseLocationHref(aSpec);
      if (sh) return sh[2];
      if (aBaseURI) {
        sh = parseLocationHref(aBaseURI.spec);
        if (!sh) return "";
        var urlBase = IOService.newURI(sh[2], null, null);
        var url = Cc["@mozilla.org/network/standard-url;1"]
                    .createInstance(Ci.nsIStandardURL);
        url.init(1, -1, aSpec, aCharset, urlBase);
        url.QueryInterface(Ci.nsIURI);
        return url.spec;
      }
      return aSpec;
    }
    var sp = makeXmppSpec(aSpec, aCharset, aBaseURI);
    var sh = makeShareHrefSpec(aSpec, aCharset, aBaseURI);
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    uri.spec = sp ? sp + (sh ? "?share;href=" + sh : "") : aSpec;
    return uri;
  },
  newChannel: function XMPProtocolNewChannel(aURI) {
    var href = parseLocationHref(aURI.spec);
    var url = href ? href[2] : "http://www.google.co.jp";
    return IOService.newChannel(url, null, null);
  }
};

function NSGetModule(compMgr, fileSpec){
	return XPCOMUtils.generateModule([XMPProtocol]);
}
