const EXPORTED_SYMBOLS = ["Strings", "stringsGetter"];
Components.utils.import("resource://musubi/modules/00-Utils.jsm");

function Strings(propertiesFile) {
    this._bundle = StringBundleService.createBundle(propertiesFile);
}

extend(Strings.prototype, {
    get: function Strings_get(name, args) {
        return args
            ? this._bundle.formatStringFromName(name, args, args.length)
            : this._bundle.GetStringFromName(name);
    }
});
