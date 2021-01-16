
var inherits = require('util').inherits;
var MemoryStore = require('express-session').MemoryStore;
var debug = require('debug')('express-session');
const EventEmitter = require("events");

/** this code is based on an old PR from https://github.com/catamphetamine */

class SessionEvents extends EventEmitter {
    
}

var ExtendedMemoryStore = function (options) {
    MemoryStore.call(this,options);
    this.session_events = new SessionEvents();
    this.session_timers = {};
  // set up the store
  this.options = {
    timeout: -1 // sessions never expire by default
  }

  if (options) {
    if (typeof options.timeout !== 'undefined') {
      this.options.timeout = options.timeout
    }
  }

  debug('session timeout is set to ' + this.options.timeout)
  const intervalStep = 1000;
  // run the session timeout checker
  if (this.options.timeout >= 0) {
    var self = this
    this.session_timeout_checker = setInterval(function() {
      debug('checking sessions for timeout')
      for (var sessionId in self.session_timers) {
        if (self.session_timers[sessionId] === 0 || self.session_timers[sessionId] < 0) {
          debug('session ' + sessionId + ' timed out, destroying it');
          self.destroy(sessionId);
        }
        else {
          self.session_timers[sessionId] = self.session_timers[sessionId] - intervalStep;
        }
      }
    }, 
    intervalStep) // runs every interval step
  }
};
inherits(ExtendedMemoryStore, MemoryStore);

ExtendedMemoryStore.prototype.destroy = function (sid, fn) {
    this.session_events.emit("session_end",sid);
    delete this.session_timers[sid];
    MemoryStore.prototype.destroy.call(this, sid, fn);
};

ExtendedMemoryStore.prototype.hookupGenerateSession = function(req) {
  var old = this.generate;
  this.generate = function(req) {
    old(req);
    this.session_events.emit("session_start",req.sessionID);
  }
}
ExtendedMemoryStore.prototype.set = function set(sessionId, session, callback) {
    var session_created = false;
    if (typeof this.sessions[sessionId] === 'undefined') {
      debug('session created');
      session_created = true;
      this.session_timers[sessionId] = this.options.timeout
    }
    MemoryStore.prototype.set.call(this,sessionId, session, callback);
}




ExtendedMemoryStore.prototype.getSession = function(sessionId) {

    debug('get session #' + sessionId);
    var sess = this.sessions[sessionId]
  
    if (!sess) {
      return
    }

    debug('Prolonging life for session #' + sessionId);
    this.session_timers[sessionId] = this.options.timeout;
  
    // parse
    sess = JSON.parse(sess)
  
    if (sess.cookie) {
      var expires = typeof sess.cookie.expires === 'string'
        ? new Date(sess.cookie.expires)
        : sess.cookie.expires
  
      // destroy expired session
      if (expires && expires <= Date.now()) {
        delete this.sessions[sessionId];
        delete this.session_timers[sessionId];
        return;
      }
    }
  
    return sess;
  }

module.exports = ExtendedMemoryStore;