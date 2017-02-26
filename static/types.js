var readEachLineSync = require('read-each-line-sync');

let count = 0;
readEachLineSync('types.txt', 'utf8', function(line) {
  count++;
  if (count > 30) {
    let parts = line.split(',');

  }

});


console.log(count);
console.log("Done");