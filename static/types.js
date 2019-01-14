var readEachLineSync = require('read-each-line-sync');

let count = 0;
let multiline = '';
readEachLineSync('invTypes.csv', 'utf8', function(line) {
  // count++;
  try {
	  multiline += line;
	  count++;
	  const parentheses = (multiline.match(/\"/g) || []).length;
	  if (parentheses % 2 === 0) {
	  	if (count > 0) {
	 		console.log(count + ": " + line);
	  	}
	  	count = 0;
	  	//console.log(parentheses + " - " + multiline.split(',')[0]);
	  	multiline = '';
	  } else {
	  	count
	  	console.log(count + ": " + line);
	  }

	} catch(e) {
		console.log(e);
	}
});

console.log(count);
console.log("Done");