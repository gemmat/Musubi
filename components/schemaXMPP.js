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
    var temp = Cc["@mozilla.org/network/standard-url;1"]
                .createInstance(Ci.nsIStandardURL);
    var m = /href;url=(.*)$/.exec(aBaseURI ? aBaseURI.spec : aSpec);
    if (m) {
      aBaseURI = IOService.newURI(m[1], null, null);
    }
    temp.init(1, -1, aSpec, aCharset, aBaseURI);
    temp.QueryInterface(Ci.nsIURI);

    m = /^xmpp:\/\/(.*)/.exec(temp.spec);
    if (m) {
      var uri = Cc["@mozilla.org/network/simple-uri;1"].
                  createInstance(Ci.nsIURI);
      if (/^xmpp:\/\/[^\/\?#]+\/[^\/\?#]+/.test(temp.spec)) {
        uri.spec = temp.spec;
      } else {
        uri.spec = "xmpp:" + m[1];
      }
      return uri;
    }
    return temp;
  },
  newChannel: function XMPProtocolNewChannel(aURI) {
    var url = parseLocationHref(aURI.spec)[2];
    return IOService.newChannel(url, null, null);
  }
};

function NSGetModule(compMgr, fileSpec){
	return XPCOMUtils.generateModule([XMPProtocol]);
}
