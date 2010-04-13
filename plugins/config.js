#!coffee -p

# Host and port of IMAP server.

exports.host:                 "localhost"
exports.port:                 143

# Millisec, 0 or negative to disable.

exports.status_poll_interval: 30000
exports.keepalive_interval:   150000
