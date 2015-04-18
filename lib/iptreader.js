#!/usr/bin/env node

/*
Copyright (c) 2015 Sam Decrock <sam.decrock@gmail.com>

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/



var licenseStart = new Buffer([0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00]);
var licenseEnd = new Buffer([0x29, 0x00, 0x00, 0x00]); // ')'
var stringStart = new Buffer([0x1F, 0x00, 0x00, 0x00]);


function replaceLicense(data, license) {
	var s = findStartAndEndPositionOfLicense(data);
	if(s == null) return null;

	// get first part of data:
	var firstBuf = new Buffer(s.start);
	data.copy(firstBuf, 0, 0, s.start);

	var lastBuf = new Buffer(data.length - s.end);
	data.copy(lastBuf, 0, s.end);

	// add all to one buffer:
	var buffers = [];
	buffers.push(firstBuf);
	buffers.push(license);
	buffers.push(lastBuf);

	var newData = Buffer.concat(buffers);
	return newData;
}


function findLicense (data) {
	var startEnd = findStartAndEndPositionOfLicense(data);
	if(startEnd == null) return null;


	var license = new Buffer(startEnd.end-startEnd.start)

	data.copy(license, 0, startEnd.start, startEnd.end);

	return license;
}

function findStartAndEndPositionOfLicense(data) {
	var startMatches = findMatches(data, licenseStart);
	if(startMatches.length == 0) return null;

	var start = startMatches[startMatches.length-1] + licenseStart.length - 4;

	var endMatches = findMatches(data, licenseEnd, start);
	if(endMatches.length == 0) return null;
	
	var end = endMatches[0] + licenseEnd.length + 2;

	return {
		start: start,
		end: end
	};
}

// returns an array with indexes where the needle starts:
function findMatches (haystack, needle, start) {
	if(!start) start = 0;

	var matches = []; 

	for (var i = start; i < haystack.length; i++) {
		if(haystack[i] == needle[0]){

			var isMatch = true;
			for (var j = 0; j < needle.length; j++) {

				if(i+j >= haystack.length){
					isMatch = false;
					break;
				}

				if(haystack[i+j] != needle[j]){
					isMatch = false;
					break;
				}

			};

			if(isMatch){
				matches.push(i);
			}
		}
	};

	return matches;
}

function findStrings (license) {
	var matches = findMatches(license, stringStart);

	for (var i = 0; i < matches.length; i++) {
		var pos = matches[i];
		pos += 4;
		var stringLength = license.readUInt16LE(pos); pos += 4;

		// console.log('stringLength', stringLength);

		var stringBuffer = new Buffer(stringLength*2);
		license.copy(stringBuffer, 0, pos, pos + stringLength*2); pos += stringLength*2;
		var string = stringBuffer.toString('utf16le');

		// console.log(stringBuffer);
		console.log('|', string, '|');

		// string ends with 2 zeros
		pos += 2;
	};
}

function readString (license, p) {
	var la = license.readUInt16LE(p.pos); p.pos+=4;
	if(la != 0x1F) return null;

	var stringLength = license.readUInt16LE(p.pos); p.pos+=4;

	var stringBuffer = new Buffer(stringLength*2 - 2);
	license.copy(stringBuffer, 0, p.pos, p.pos + stringLength*2 - 2); p.pos+=stringLength*2;
	// console.log(stringBuffer);
	var string = stringBuffer.toString('utf16le');

	// string ends with 2 zeros
	p.pos += 2;

	return string;
}

function parseLicense (license) {
	var p = {
		pos: 0
	};

	var licenseParts = [];

	while(p.pos < license.length){

		var la = license.readUInt32LE(p.pos); // read 4 bytes (8*4=32)
		
		if(la == 0x1F){
			var str = readString(license, p);
			licenseParts.push(str);
		}else{
			// p.pos+=4;
			// licenseParts.push('0x' + pad(la.toString(16).toUpperCase(),8));

			for (var i = 0; i < 4; i++) {
				var la = license.readUInt8(p.pos); p.pos+=1;
				licenseParts.push('0x' + pad(la.toString(16).toUpperCase(),2));
			};
			
		}
	}

	return licenseParts;
}

function parsedLicenseToBytes(parsedLicense) {
	var buffers = [];


	for (var i = 0; i < parsedLicense.length; i++) {
		var line = parsedLicense[i];

		if(line.match(/^0x/)){
			// is hex:

			var hexString = line.substr(2);

			var value = parseInt(hexString, 16);

			var buffer = new Buffer(1);
			
			buffer.writeUInt8(value, 0);

			buffers.push(buffer);
		}else{
			var str = line;

			var buffer = new Buffer(str.length*2 + 12);

			buffer.writeUInt32LE(0x1F, 0);

			buffer.writeUInt32LE(str.length + 1, 4);

			buffer.write(str, 8, str.length*2, 'utf16le');
			
			buffer.writeUInt32LE(0x00000000, 8 + str.length*2); //pad with 4 zeros
			
			buffers.push(buffer);
		}
	};

	var license = Buffer.concat(buffers);
	return license;
}

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function getLicense (data) {
	var license = findLicense(data);
	return parseLicense(license);
}

function setLicense (data, license) {
	var newLicense = parsedLicenseToBytes(license);
	return replaceLicense(data, newLicense);
}


exports.getLicense = getLicense;
exports.setLicense = setLicense;




