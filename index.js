'use strict';

let EventEmitter = require('events').EventEmitter;

try {
    var tessel = require("tessel");
} catch(e) {
    var Tessel = require('tessel-mocks');
    tessel = new Tessel();
}

module.exports = class BME280{
    constructor(){
        this.name = 'BME280';
        this.addr = 0x77;
        this.port;
        this.i2c;
    }

    use(port){
      this.port = port;
    }

    init(){
      this.i2c = new this.port.I2C(this.addr);
      this.getId();
    }

    getId(){
      this.i2c.transfer(new Buffer([0xD0]), 1, (err, rx) => {
        console.log('error returned by I2C Slave: ', err)
        console.log(`buffer returned by I2C slave (${this.addr.toString(16)}):`, rx);
      }, null, 60)
    }
}
