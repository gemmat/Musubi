const EXPORT = ["MusubiDB", "callWithMusubiDB", "DBFindAccount", "DBFindAllAccount", "DBNewAccount", "DBUpdateAccount", "DBDeleteAccount", "DBCountAllAccount"];

function MusubiDB() {
  this.db = null;
  this.account =
    Entity({
      name : "accounts",
      fields : {
        id              : "INTEGER PRIMARY KEY",
        barejid         : "TEXT UNIQUE NOT NULL",
        resource        : "TEXT NOT NULL",
        connectionHost  : "TEXT NOT NULL",
        connectionPort  : "INTEGER NOT NULL",
        connectionScrty : "INTEGER NOT NULL",
        bmAuth          : "INTEGER",
        bmRemv          : "INTEGER",
        bmNone          : "INTEGER",
        bmTo            : "INTEGER",
        bmFrom          : "INTEGER",
        bmBoth          : "INTEGER"
      }
    });
}

MusubiDB.prototype = {
  get file() {
    let pd = DirectoryService.get("ProfD", Ci.nsIFile);
    pd.append("musubi.sqlite");
    return pd;
  },
  open: function MusubiDBOpen() {
    if (!this.db) {
      this.db = new Database(this.file);
      this.account.db = this.db;
      this.account.initialize();
    }
  },
  close: function MusubiDBClose() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
};

function callWithMusubiDB(aProc) {
  var msbdb = new MusubiDB();
  msbdb.open();
  var r = aProc(msbdb);
  msbdb.close();
  return r;
}

function DBFindAccount(aAuth) {
  return callWithMusubiDB(function findByBarejid(msbdb) {
    var r = msbdb.account.findByBarejid(aAuth.barejid);
    if (!r || !r[0]) return null;
    return r[0];
  });
}

function DBFindAllAccount() {
  return callWithMusubiDB(function findAll(msbdb) {
    var r = msbdb.account.findAll();
    if (!r) return null;
    return r;
  });
}

function DBNewAccount(aObj) {
  return callWithMusubiDB(function newAccount(msbdb) {
    var account = new msbdb.account(aObj);
    if (!account) return null;
    if (msbdb.account.countByBarejid(account.barejid)) {
      msbdb.account.update(account);
    } else {
      msbdb.account.insert(account);
    }
    return account;
  });
}

function DBUpdateAccount(aModel) {
  return callWithMusubiDB(function updateAccount(msbdb) {
    msbdb.account.update(aModel);
  });
}

function DBDeleteAccount(aAuth) {
  return callWithMusubiDB(function deleteAccount(msbdb) {
    var r = msbdb.account.findByBarejid(aAuth.barejid);
    if (!r || !r[0]) return false;
    msbdb.account.deleteById(r[0].id);
    return true;
  });
}

function DBCountAllAccount() {
  return callWithMusubiDB(function countAll(msbdb) {
    return msbdb.account.countAll();
  });
}
