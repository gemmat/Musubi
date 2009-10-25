const EXPORTED_SYMBOLS = ["ftpQueuedUpload", "ftpUpload"];
Components.utils.import("resource://musubi/modules/00-Utils.jsm");

function ftpQueuedUpload(aFtpURI, aQueue, aCont) {
  var uploadedItem = null;
  var success = [];
  var failure = [];
  function f(result) {
    if (uploadedItem) {
      (result ? success : failure).push(uploadedItem);
    }
    if (!aQueue.length) {
      if (aCont) aCont(success, failure);
      return;
    }
    var item = aQueue.pop();
    uploadedItem = item.basename;
    ftpUpload(aFtpURI, item.basename, item.istream, f);
  }
  f(false);
}

function ftpUpload(aFtpURI, aBasename, aInputStream, aCallback) {
  if (!aInputStream) return aCallback(false);
  aCallback = aCallback || function(_) {};
  var target  = IOService.newURI(aBasename, null, aFtpURI);
  var channel = IOService.newChannelFromURI(target);
  var uploadChannel = channel.QueryInterface(Ci.nsIUploadChannel);
  uploadChannel.setUploadStream(aInputStream, "", -1);
  var listener = new StreamListener(aCallback);
  channel.asyncOpen(listener, null);
  return true;
}

function StreamListener(aCallbackFunc) {
  this.mCallbackFunc = aCallbackFunc;
}

StreamListener.prototype = {
  // nsIStreamListener
  onStartRequest: function (aRequest, aContext) {
  },

  onDataAvailable: function (aRequest, aContext, aStream, aSourceOffset, aLength) {
    var scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"]
                                  .createInstance(Ci.nsIScriptableInputStream);
    scriptableInputStream.init(aStream);
    scriptableInputStream.read(aLength);
  },

  onStopRequest: function (aRequest, aContext, aStatus) {
    if (Components.isSuccessCode(aStatus)) {
      // request was successfull
      this.mCallbackFunc(true);
    } else {
      // request failed
      this.mCallbackFunc(false);
    }
  },

  // nsIInterfaceRequestor
  getInterface: function (aIID) {
    try {
      return this.QueryInterface(aIID);
    } catch (e) {
      throw Components.results.NS_NOINTERFACE;
    }
  },

  // nsIProgressEventSink (not implementing will cause annoying exceptions)
  onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
  onStatus   : function (aRequest, aContext, aStatus, aStatusArg) { },

  // we are faking an XPCOM interface, so we need to implement QI
  QueryInterface : function(aIID) {
    if (aIID.equals(Ci.nsISupports) ||
        aIID.equals(Ci.nsIInterfaceRequestor) ||
        aIID.equals(Ci.nsIChannelEventSink) ||
        aIID.equals(Ci.nsIProgressEventSink) ||
        aIID.equals(Ci.nsIStreamListener))
      return this;

    throw Components.results.NS_NOINTERFACE;
  }
};
