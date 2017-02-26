const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');

const prettyStdOut = new PrettyStream({mode: 'short'});
prettyStdOut.pipe(process.stdout);

module.exports = bunyan.createLogger({
  name: 'walle',
  streams: [{
    level: 'debug',
    type: 'raw',
    stream: prettyStdOut
  }]
});
