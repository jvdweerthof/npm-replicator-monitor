# npm-replicator-monitor

[![NPM](https://nodei.co/npm/npm-replicator-monitor.png?simple=true)](https://nodei.co/npm/npm-replicator-monitor/)

**Monitor the replication status of an npm mirror and give it a kick if it gets stuck**

```js
$ npm-replicator-monitor -c config.json
```

Where config.json might look something like:

```json
{
    "couchUrl"       : "http://my.npm.mirror.foo.com:5984"
  , "couchUser"      : "admin"
  , "couchPass"      : "fs98dkKHs87lasl"
  , "db"             : "registry"
  , "checkInterval"  : 3600000
  , "replicationDoc" : {
        "source"     : "https://fullfatdb.npmjs.com/registry"
      , "target"     : "registry"
      , "continuous" : true
      , "user_ctx"   : {
            "name"  : "admin"
          , "roles" : [ "_admin" ]
       }
    }
}
```

or for multiple replications:

```json
[
  {
      "couchUrl"       : "http://my.npm.mirror.foo.com:5984"
    , "couchUser"      : "admin"
    , "couchPass"      : "fs98dkKHs87lasl"
    , "db"             : "registry"
    , "checkInterval"  : 3600000
    , "replicationDoc" : {
          "source"     : "https://fullfatdb.npmjs.com/registry"
        , "target"     : "registry"
        , "continuous" : true
        , "user_ctx"   : {
              "name"  : "admin"
            , "roles" : [ "_admin" ]
         }
      }
  },
  {
      "couchUrl"       : "http://my.npm.mirror.foo.com:5984"
    , "couchUser"      : "admin"
    , "couchPass"      : "fs98dkKHs87lasl"
    , "db"             : "registry2"
    , "checkInterval"  : 3600000
    , "replicationDoc" : {
          "source"     : "https://fullfatdb.npmjs.com/registry2"
        , "target"     : "registry2"
        , "continuous" : true
        , "user_ctx"   : {
              "name"  : "admin"
            , "roles" : [ "_admin" ]
         }
      }
  },
]
```

You need to ensure that you have an existing *_replicator* entry named `"registry"` for this to work.

## What?

In my experience (not necessarily shared by others and may be caused by living on the other side of the planet to npm), the *_replicator* replication mechanism in CouchDB is a little brittle and can get *stuck*. It can even watch the upstream sequence count increase and not do anything about it even while the replication is in a `"triggered"` state.

An easy solution is to restart CouchDB when you notice this problem, but that's a brittle solution! An easier solution is to delete and re-create the *_replicator* doc for the npm registry which will trigger a re-start of the replication. It quickly figures out where it's at and starts again.

npm-replicator-monitor uses [couch-replicator-api](https://github.com/rvagg/node-couch-replicator-api) to monitor the status of the registry replication and if it's observed to be behind the source sequence and stuck at the same sequence number over two check intervals (interval time is set in config.json) then it'll delete the *_replicator* doc and re-insert it and start monitoring again.

Actual check interval will depend on the speed of your computer (i.e. it can be stuck but actually working on the data, as observed by CPU usage, so you generally want to leave it alone when it does this), and the speed of your connection.


## License

**npm-replicator-monitor** is Copyright (c) 2014 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.
