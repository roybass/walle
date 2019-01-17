const readEachLineSync = require('read-each-line-sync');

const idToType = {};
const lowercaseNameToType = {};

readEachLineSync('static/types.csv', 'utf8', function(line) {
	//typeID,groupID,typeName,mass,volume,capacity,portionSize,raceID,basePrice,published,marketGroupID,iconID,soundID,graphicID
	  const parts = splitCsv(line);
	  if (parts.length !== 14) {
	  	console.log(line);
	  	return;
	  }

	  const json = {
	  	typeID: parts[0],
	  	groupId: parts[1],
	  	typeName: parts[2],
	  	mass: parseFloat(parts[3]),
	  	volume: parseFloat(parts[4]),
	  	capacity: parseFloat(parts[5]),
	  	marketGroupID: parts[10] == 'None' ? null : parseInt(parts[10])
	  }

	  idToType[json.typeID] = json;
	  lowercaseNameToType[json.typeName.toLowerCase()] = json;	  
});

function splitCsv(str) {
        var matches = str.match(/(\s*"[^"]+"\s*|\s*[^,]+|,)(?=,|$)/g);
        for (var n = 0; n < matches.length; ++n) {
            matches[n] = matches[n].trim();
            if (matches[n] == ',') matches[n] = '';
        }
        if (str[0] == ',') matches.unshift("");
        return matches;
}

function findById(id) {
	return idToType[id];
}

function findByName(name) {
	return lowercaseNameToType[name.toLowerCase()];
}
module.exports = {
		findById,
		findByName
}