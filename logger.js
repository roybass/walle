const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');

const prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

module.exports = bunyan.createLogger({
  name: 'momoney',
  streams: [{
    level: 'debug',
    type: 'raw',
    stream: prettyStdOut
  }]
});
