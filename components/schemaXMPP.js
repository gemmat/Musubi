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
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    // handle the following two cases.
    // defaultJID    : "xmpp:default@localhost"
    // aSpec         : "xmpp:juliet@localhost"
    // aBaseURI.spec : "xmpp://romeo@localhost/someone@localhost"
    // ---------------------------------------------------------
    // Result        : "xmpp://romeo@localhost/juliet@localhost"

    // defaultJID    : "xmpp:default@localhost"
    // aSpec         : "xmpp:juliet@localhost"
    // aBaseURI.spec : null
    // ---------------------------------------------------------
    // Result        : "xmpp://default@localhost/juliet@localhost"

    var o0, o1;
    o0 = parseURI(aSpec);
    o1 = aBaseURI ? parseURI(aBaseURI.spec) : null;
    var o = o0 || o1;
    if (!o) {
      uri.spec = aSpec;
      return uri;
    }

    if (o0 && o1) {
      o.account = o1.account;
    }

    if (!o.account) {
      try {
        o.account = PrefService.getBranch("extensions.musubi.").
                      getComplexValue("defaultJID", Ci.nsISupportsString).data;
      } catch (e) {};
      o.account = "default@localhost";
    }

    // handle the href.
    // aSpec         : "/page0.html"
    // aBaseURI      : "xmpp...;href=http://www.acme.com/index.html"
    // Result        : "xmpp...;href=http://www.acme.com/page0.html"

    // aSpec         : "xmpp...;href=page0.html"
    // aBaseURI      : "xmpp...;href=http://www.acme.com/index.html"
    // Result        : "xmpp...;href=http://www.acme.com/page0.html"

    // aSpec         : "xmpp...;href=page0.html"
    // aBaseURI      : "http://www.acme.com/index.html"
    // Result        : "xmpp...;href=http://www.acme.com/page0.html"

    if (aBaseURI) {
      var spec = o0 ? o0.href : aSpec;
      var base = IOService.newURI(o1 && o1.href ? o1.href : aBaseURI.spec, null, null);
      var standardURL = Cc["@mozilla.org/network/standard-url;1"]
                          .createInstance(Ci.nsIStandardURL);
      standardURL.init(1, -1, spec, aCharset, base);
      standardURL.QueryInterface(Ci.nsIURI);
      o.href = standardURL.spec;
    }
    uri.spec = "xmpp://" +
                 o.account +
                 "/" +
                 o.sendto +
                 (o.resource ? "/" + o.resource : "") +
                 (o.query ? "?" + o.query : "") +
                 (o.href ? ";href=" + o.href : "");
    return uri;
  },
  newChannel: function XMPProtocolNewChannel(aURI) {
    var o = parseURI(aURI.spec);
    var url = o ? o.href : "about:blank";
    return IOService.newChannel(url, null, null);
  }
};

function NSGetModule(compMgr, fileSpec){
	return XPCOMUtils.generateModule([XMPProtocol]);
}
