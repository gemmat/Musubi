const EXPORTED_SYMBOLS = ["Strings"];
Components.utils.import("resource://musubi/modules/00-Utils.jsm");

function Strings(propertiesFile) {
    this._bundle = StringBundleService.createBundle(propertiesFile);
}

extend(Strings.prototype, {
    get: function Strings_get(name, args) {
        return args
            ? this._bundle.formatStringFromName(name, args, args.length)
            : this._bundle.GetStringFromName(name);
    },
    map: function Strings_map(aProc) {
      var rv = [];
      var bundleEnum = this._bundle.getSimpleEnumeration();
      while (bundleEnum.hasMoreElements()) {
        var bundlePropElt = bundleEnum.getNext().QueryInterface(Ci.nsIPropertyElement);
        rv.push(aProc(bundlePropElt.key, bundlePropElt.value));
      }
      return rv;
    }
});
