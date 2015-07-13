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
  , checks = []

/**
 * Runs check for replication identified by [id]
 * @function check
 * @param {number} id - The [id] of the check
 * @returns {Void}
 */
function check (id) {
  checks[id].replicator.status(function (err, status) {
    if (err)
      return console.error('Got error from status: %s [%s %s]', err.message, checks[id].config.db, checks[id].config.couchUrl)

    if (status.checkpointed_source_seq == status.source_seq) {
      console.log('Replication up to date [%s %s]', checks[id].config.db, checks[id].config.couchUrl)
      checks[id].lastCheckpoint = null
      return // all good!
    }

    if (status.checkpointed_source_seq != checks[id].lastCheckpoint) {
      console.log('Checkpoint changed since last check, was %d now %d [%s %s]', checks[id].lastCheckpoint, status.checkpointed_source_seq, checks[id].config.db, checks[id].config.couchUrl)
      checks[id].lastCheckpoint = status.checkpointed_source_seq
      return // something has changed
    }

    // nothing has changed, time to bump!
    console.log('Giving the replicator a jolt... [%s %s]', checks[id].config.db, checks[id].config.couchUrl)
    checks[id].lastCheckpoint = null
    checks[id].replicator.del(function (err) {
      if (err)
        return console.error('Got error deleting replication doc: %s [%s %s]', err.message, checks[id].config.db, checks[id].config.couchUrl)

      setTimeout(function () {
        // Add a new Date so we ensure the rev is different (helps with determinism)
        var doc = xtend(checks[id].config.replicationDoc, { created_at_date: new Date() })
        checks[id].replicator.put(doc, function (err) {
          if (err)
            return console.error('Error adding replication doc:%s [%s %s]', err.message, checks[id].config.db, checks[id].config.couchUrl)
        })
      }, 2000) // give it a moment to think
    })
  })
}

/**
 * Starts the application
 * @function main
 * @returns {Void}
 */
function main () {
  if (!Array.isArray(config))
    config = [config] // Maintain backward compatibility for single replications in config

  for (var id in config) {
  	checks[id] = {}
    checks[id].replicator = new CouchReplicator(config[id].couchUrl, config[id].couchUser, config[id].couchPass, config[id].db, (config[id].doc_id?config[id].doc_id:false))
    checks[id].lastCheckpoint = null
    checks[id].config = config[id]
    setInterval(check.bind(null, id), config[id].checkInterval)
    check(id)
    console.log('Started replication checks [%s %s]', config[id].db, config[id].couchUrl);
  }
  return;
}

main()