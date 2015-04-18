# Autodesk Inventor License Reader

iptreader is a node.js library to read and change the license of IPT-files (Autodesk Inventor files).


The license may not be acurate as this is all done using reverse engineering.

## Install

You can install __iptreader__ using the Node Package Manager (npm):

    npm install iptreader

## Simple example
```js
var iptreader = require('iptreader');

var someLicense = [
    'Some Name',
    '0x00',
    '0x00',
    '0x00',
    '0x00',
    '0x00',
    '0x00',
    '0x00',
    '0x00',
    '0x00',
    'Some Build Number'
];


fs.readFile('./original.ipt', function (err, data) {
    if (err) return console.log(err);

    var currentLicense = iptreader.getLicense(data);
    console.log('currentLicense', currentLicense);

    console.log('setting new licence:', someLicense);
    var newData = iptreader.setLicense(data, someLicense);

    fs.writeFile('./new.ipt', newData, function (err) {
        if(err) return console.log(err);
        console.log('done');
    });
});

```

