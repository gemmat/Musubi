const EXPORTED_SYMBOLS = ["Database", "Model", "Entity"];
Components.utils.import("resource://musubi/modules/00-Utils.jsm");

/*
 * original codes from tombloo
 * http://github.com/to/tombloo
 * The following codes follow the licence of the Tombloo.
 */

function Database(file) {
  this.connection = StorageService.openDatabase(file);
}

extend(Database, {
    LIST_DELIMITER : ',',

    /**
     * クエリにパラメーターをバインドする。
     *
     * @param {mozIStorageStatementWrapper} wrapper クエリ。
     * @param {Object || Array || String || Number} params
     *        パラメーター。
     *        Objectの場合、名前付きパラメーターとみなされる。
     *        Arrayの場合、出現順に先頭からバインドされる。
     *        単値の場合、先頭のパラメーターにバインドされる。
     *        この値がnullの場合、処理は行われない。
     * @return {mozIStorageStatementWrapper} バインド済みのクエリ。
     */
    bindParams : function bindParams(wrapper, params) {
        if(params==null)
            return wrapper;

        // Object
        if(typeof(params)=='object' && params.length==null){
            var paramNames = this.getParamNames(wrapper);
            for(var i=0,len=paramNames.length ; i<len ; i++){
                var name = paramNames[i];
                var param = params[name];
                if(typeof(param)=='undefined')
                    continue;

                // 日付型の場合、数値をバインドする
                if(param instanceof Date){
                    wrapper.params[name] = param.getTime();
                    continue;
                }

                // 配列型の場合、結合し文字列をバインドする
                if(param instanceof Array){
                    wrapper.params[name] = this.LIST_DELIMITER + param.join(this.LIST_DELIMITER) + this.LIST_DELIMITER;
                    continue;
                }

                wrapper.params[name] = param;
            }
            return wrapper;
        }

        if(typeof(params)=='string' || params.length==null)
            params = [].concat(params);

        // Array
        var statement = wrapper.statement;
        for(var i=0, len=statement.parameterCount ; i<len ; i++)
            statement.bindUTF8StringParameter(i, params[i]);

        return wrapper;
    },

    /**
     * クエリ内に含まれる名前付きパラメーターのリストを取得する。
     *
     * @param {mozIStorageStatementWrapper} wrapper クエリ。
     * @return {Array} パラメーター名のリスト。
     */
    getParamNames : function getParamNames(wrapper) {
        var paramNames = [];
        var statement = wrapper.statement;
        for (var i=0, len=statement.parameterCount ; i<len ; i++)
            paramNames.push(statement.getParameterName(i).substr(1));

        return paramNames;
    },

    /**
     * クエリ結果値の列名のリストを取得する。
     *
     * @param {mozIStorageStatement || mozIStorageStatementWrapper} statement クエリ。
     * @return {Array} 列名のリスト。
     */
    getColumnNames : function getColumnNames(statement) {
        statement = statement.statement || statement;

        var columnNames=[];
        for(var i=0, len=statement.columnCount ; i<len ; i++)
            columnNames.push(statement.getColumnName(i));

        return columnNames;
    },

    /**
     * テーブル行をオブジェクトに変換する。
     *
     * @param {mozIStorageStatementRow} row テーブル行。
     * @param {Array} columnNames 列名のリスト。
     * @return {Object} 列名をプロパティとして値を格納したオブジェクト。
     */
    getRow : function getRow(row, columnNames){
        var result = {};
        for(var i=0,len=columnNames.length ; i<len ; i++){
            var name = columnNames[i];
            result[name] = row[name];
        }

        return result;
    }
});

extend(Database.prototype, {

    /**
     * データベースのバージョンを取得する。
     * PRAGMAのuser_versionに相当する(schema_versionではない)。
     *
     * @return {Number} データベースバージョン。
     */
    get version(){
        return this.getPragma('user_version');
    },

    /**
     * データベースのバージョンを設定する。
     */
    set version(ver){
        return this.setPragma('user_version', ver);
    },

    /**
     * PRAGMAの値を取得する。
     * Firefox 2でPRAGMA user_versionを使うステートメントを
     * StorageStatementWrapperに渡すと不正終了したため暫定的に設けられた。
     */
    setPragma : function setPragma(name, val){
        this.connection.executeSimpleSQL('PRAGMA ' + name + '=' + val);
    },

    /**
     * PRAGMAの値を取得する。
     */
    getPragma : function getPragma(name){
        try {
            var sql = 'PRAGMA ' + name;
            var statement = this.connection.createStatement(sql);
            if(statement.executeStep())
                return statement.getInt32(0);
            return null;
        } finally {
            if(statement){
                statement.reset();
                statement.finalize && statement.finalize();
            }
        }
    },

    /**
     * ステートメントを生成する。
     *
     * @param {String} SQL。
     */
    createStatement : function createStatement(sql) {
        return new StorageStatementWrapper(this.connection.createStatement(sql));
    },

    /**
     * SQLを実行する。
     * DDL/DML共に利用できる。
     *
     * @param {String || mozIStorageStatementWrapper} sql SQL。
     * @param {Object || Array || String} params。
     */
    execute : function execute(sql, params) {
        sql+='';
        var sqls = sql.split(';').map(Entity.compactSQL).filter(function(a){ return !!a; });
        if(sqls.length > 1){
            var self = this;
            return this.transaction(function(){
                sqls.forEach(function(sql){
                    self.execute(sql, params);
                });
            });
        }
        sql = sqls[0];

        if(params && params.group){
            sql += ' GROUP BY ' + params.group;
        }

        if(params && params.order){
            sql += ' ORDER BY ' + params.order;
        }

        if(params && params.limit){
            sql += ' LIMIT :limit OFFSET :offset';
            if(params.offset==null)
                params.offset = 0;
        }

        try{
            var statement = sql.initialize ? sql : this.createStatement(sql);
            Database.bindParams(statement, params);

            var columnNames;
            var result = [];

            // 全ての行を繰り返す
            while (statement.step()){
                // 列名はパフォーマンスを考慮しキャッシュする
                if (!columnNames)
                    columnNames = Database.getColumnNames(statement);

                result.push(Database.getRow(statement.row, columnNames));
            }
            return result;
        } catch(e if e==StopIteration) {
        } catch(e) {
            this.throwException(e);
        } finally {
            // ステートメントを終了させる
            // これを怠ると、データベースをクローズできなくなる
            if(statement){
                statement.reset();
                statement.statement.finalize && statement.statement.finalize();
            }
        }
        return null;
    },

    /**
     * トランザクション内で処理を実行する。
     * パフォーマンスを考慮する必要のある一括追加部分などで用いる。
     * エラーが発生した場合は、トランザクションがロールバックされる。
     * それ以外は、自動的にコミットされる。
     * 既にトランザクションが始まっていたら新たなトランザクションは開始されない。
     *
     * @param {Function} handler 処理。
     */
    transaction : function transaction(handler) {
        var d = succeed();

        if(this.connection.transactionInProgress){
            d.addCallback(handler);
            return d;
        }

        var self = this;
        d.addCallback(bind('beginTransaction', this));
        d.addCallback(handler);
        d.addCallback(function(res){
            self.commitTransaction();

            return res;
        });
        d.addErrback(function(err){
            self.rollbackTransaction();

            throw err;
        });

        return d;
    },

    /**
     * トランザクションを開始する。
     * トランザクションが既に開始されていた場合でも、エラーを発生させない。
     */
    beginTransaction : function beginTransaction(){
      this.connection.transactionInProgress || this.connection.beginTransaction();
    },

    /**
     * トランザクションをコミットする。
     * トランザクションが開始されていない場合でも、エラーを発生させない。
     */
    commitTransaction : function commitTransaction(){
      this.connection.transactionInProgress && this.connection.commitTransaction();
    },

    /**
     * トランザクションをロールバックする。
     * トランザクションが開始されていない場合でも、エラーを発生させない。
     */
    rollbackTransaction : function rollbackTransaction(){
      this.connection.transactionInProgress && this.connection.rollbackTransaction();
    },

    /**
     * データベース例外を解釈し再発生させる。
     *
     * @param {Exception} e データベース例外。
     * @throws エラー内容に即した例外。未定義のものは汎用的な例外となる。
     */
    throwException : function throwException(e){
        var code = this.connection.lastError;
        var message = this.connection.lastErrorString;
        switch(code){
        case 1:
            if(message.match(/already exists$/))
                throw new Database.AlreadyExistsException(this, e);
        case 19:
            throw new Database.DuplicateKeyException(this, e);
        case 20:
            throw new Database.TypeMismatchException(this, e);
        default:
            throw new Database.DatabaseException(this, e);
        }
    },

    /**
     * データベースをクローズする。
     * クローズしない場合、ファイルがロックされ削除できない。
     */
    close : function close(){
        // Firefox 2ではcloseは存在しない
        this.connection.close && this.connection.close();
    },

    /**
     * テーブルが存在するかを確認する。
     *
     * @param {String} name テーブル名。
     */
    tableExists : function tableExists(name){
        // Firefox 2ではtableExistsは存在しない
        return this.connection.tableExists?
            this.connection.tableExists(name) :
            !!this.execute('PRAGMA table_info('+name+')').length;
    },

    /**
     * データベースの無駄な領域を除去する。
     */
    vacuum : function vacuum(){
        this.connection.executeSimpleSQL('vacuum');
    }
});


['Database', 'DuplicateKey', 'TypeMismatch', 'AlreadyExists'].forEach(function(name){
    name += 'Exception';
    Database[name] = function(db, e){
        this.lastError = db.connection.lastError;
        this.lastErrorString = db.connection.lastErrorString;
        update(this, e);
        this.toString = function(){
            return this.lastErrorString;
        };
    };
});


function Entity(def) {
    def.fields = def.fields || [];

    function Model(obj){
        update(this, obj);
        this.temporary=true;
    };

    extend(Model.prototype, {
        save : function(){
            if(this.temporary){
                Model.insert(this);
                this.temporary=false;
                if (Model.db.connection.lastInsertRowID) {
                    // id と固定されてしまう…
                    this.id = Model.db.connection.lastInsertRowID;
                }
            } else {
                Model.update(this);
            }
        },

        remove : function(){
            Model.deleteById(this.id);
            this.temporary = true;
        }
    });

    var fields = [];
    for(var field in def.fields){
        var type = def.fields[field];
        var proto = Model.prototype;
        switch(type){
        case 'TIMESTAMP':
            proto.__defineGetter__(field, new Function('return this._'+field));
            proto.__defineSetter__(field, new Function('val',
                'this._'+field+' = typeof(val)=="object"? val : new Date(val)'
            ));
            break;

        case 'LIST':
            proto.__defineGetter__(field, new Function('return this._'+field));
            proto.__defineSetter__(field, new Function('val',
                'this._'+field+' = typeof(val)=="object"? val : val.split(Database.LIST_DELIMITER).filter(function(i){return i!=""})'
            ));
            break;
        }
    }

    var INSERT_SQL = Entity.createInsertSQL(def);
    var UPDATE_SQL = Entity.createUpdateSQL(def);

    var sqlCache = {};

    extend(Model, {
        definitions : def,

        initialize : function initialize(){
            var sql = Entity.createInitializeSQL(def);
            Model.db.execute(sql);
        },

        deinitialize : function deinitialize(){
            return Model.db.execute(<>
                DROP TABLE {def.name}
            </>);
        },

        insert : function insert(model){
            if(!(model instanceof Model))
                model = new Model(model);
            Model.db.execute(INSERT_SQL, model);
        },

        update : function update(model){
            Model.db.execute(UPDATE_SQL, model);
        },

        deleteById : function deleteById(id){
            return Model.db.execute(<>
                DELETE FROM {def.name}
                WHERE
                    id = :id
            </>, id);
        },

        deleteAll : function deleteAll(){
            return Model.db.execute(<>
                DELETE FROM {def.name}
            </>);
        },

        countAll : function countAll(){
            return Model.db.execute(<>
                SELECT count(*) AS count
                FROM {def.name}
            </>)[0].count;
        },

        findAll : function findAll(){
            return this.find(<>
                SELECT *
                FROM {def.name}
            </>);
        },

        rowToObject : function rowToObject(obj){
            var model = new Model(obj);
            model.temporary = false;
            return model;
        },

        findFirst : function findFirst(params) {
            if (!params) params = {};
            params.limit = 1;
            return this.find(params)[0];
        },

        find : function find(sql, params){
            if (!params && typeof sql == 'object') {
                if (typeof sql.where == 'string') {
                    var str = <>
                        SELECT *
                        FROM {def.name}
                        WHERE {sql.where}
                    </>;
                    delete sql.where;
                    return this.find(str, sql);
                } else {
                    return this.find(<>
                        SELECT *
                        FROM {def.name}
                    </>, sql);
                }
            } else {
                return Model.db.execute(sql, params).map(Model.rowToObject);
            }
        },

        __noSuchMethod__ : function (method, args) {
            if( ! method.match(/^(find|count)By/))
                throw new TypeError("No such method: " + method);

            var me = arguments.callee;
            var cache = me.cache || (me.cache = {});

            var sql;
            var type = RegExp.$1;
            if(method in cache){
                sql = cache[method];
            } else {
                var fields = method.substr(type.length+2).
                    split('And').
                    map(function (e) {return decapitalize(e);});

                switch(type){
                case 'find':
                    sql = Entity.compactSQL(<>
                        SELECT *
                        FROM {def.name}
                        {Entity.createWhereClause(fields)}
                    </>);
                    break;
                case 'count':
                    sql = Entity.compactSQL(<>
                        SELECT count(id) AS count
                        FROM {def.name}
                        {Entity.createWhereClause(fields)}
                    </>);
                    break;
                }

                cache[method] = sql;
            }
            args.unshift(sql);

            switch(type){
            case 'find':
                return this.find.apply(this, args);
            case 'count':
                return Model.db.execute.apply(Model.db, args)[0].count;
            default:
                return null;
            }
        }
    });

    return Model;
};

extend(Entity, {
    createWhereClause : function createWhereClause(fields){
        return Entity.compactSQL(<>
            WHERE
            {fields.map(function(p){return p + '=:' + p;}).join(' AND ')}
        </>);
    },

    createInitializeSQL : function createInitializeSQL(def){
        var fields = [];
        for(var p in def.fields)
            fields.push(p + ' ' + def.fields[p].replace('TIMESTAMP', 'INTEGER').replace('LIST', 'TEXT'));

        return Entity.compactSQL(<>
            CREATE TABLE IF NOT EXISTS {def.name} (
                {fields.join(', ')}
            )
        </>);
    },

    createInsertSQL : function createInsertSQL(def){
        var fields =  [key for (key in def.fields)];
        var params = fields.map(function(p){
          return ':' + p;
        });
        return Entity.compactSQL(<>
            INSERT INTO {def.name} (
                {fields.join(', ')}
            ) VALUES (
                {params.join(', ')}
            )
        </>);
    },

    createUpdateSQL : function createUpdateSQL(def){
        var fields = [key for (key in def.fields)].
            filter(function(p){return p!='id';}).
            map(function(p){
                return p + '=:' + p;
            }).join(', ');

        return Entity.compactSQL(<>
            UPDATE {def.name}
            SET
                {fields}
            WHERE
                id = :id
        </>);
    },

    /**
     * SQL文から不要な空白などを取り除き短く整形する。
     * 表記のぶれを無くし、解析後の文のキャッシュヒットを増やす目的がある。
     *
     * @param {String} sql SQL文。
     * @return {String} 整形されたSQL文。
     */
    compactSQL: function compactSQL(sql){
        sql+='';
        return sql.
            replace(/[\n\r]/gm,'').
            replace(/[\t ]+/g,' ').
            replace(/(^ +)|( +$)/g,'');
    }
});
