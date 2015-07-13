#!/usr/bin/env node

const CouchReplicator = require('couch-replicator-api')
    , argv            = require('minimist')(process.argv.slice(2))
    , fs              = require('fs')
    , xtend           = require('xtend')


if (!argv.c || !fs.existsSync(argv.c)) {
  console.error('Usage: npm-replication-monitor -c <config file.json>')
  return process.exit(-1)
}


var config     = JSON.parse(fs.readFileSync(argv.c))
  , replicator = new CouchReplicator(config.couchUrl, config.couchUser, config.couchPass, config.db)
  , lastCheckpoint


function check () {
  replicator.status(function (err, status) {
    if (err)
      return console.error('Got error from status:', err.message)

    if (status.checkpointed_source_seq == status.source_seq) {
      console.log('Replication up to date')
      lastCheckpoint = null
      return // all good!
    }

    if (status.checkpointed_source_seq != lastCheckpoint) {
      console.log('Checkpoint changed since last check, was', lastCheckpoint, 'now', status.checkpointed_source_seq)
      lastCheckpoint = status.checkpointed_source_seq
      return // something has changed
    }

    // nothing has changed, time to bump!
    console.log('Giving the replicator a jolt...')
    lastCheckpoint = null
    replicator.del(function (err) {
      if (err)
        return console.error('Got error deleting replication doc:', err.message)

      setTimeout(function () {
        // Add a new Date so we ensure the rev is different (helps with determinism)
        var doc = xtend(config.replicationDoc, { created_at_date: new Date() })
        replicator.put(doc, function (err) {
          if (err)
            return console.error('Error adding replication doc:', err.message)
        })
      }, 2000) // give it a moment to think
    })
  })
}


setInterval(check, config.checkInterval)
check()
