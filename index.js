'use strict';

//let util = require('util');
//let EventEmitter = require('events').EventEmitter;
let _ = require('underscore')
let bigint = require('bigintjs');
let registers = require('./lib/registers');
let mocks = require('./lib/mocks');

try {
    var tessel = require("tessel");
} catch(e) {
    var Tessel = require('../tessel-mocks');
    tessel = new Tessel();
}

module.exports = class BME280{
  constructor(){
      this.name = 'BME280';
      this.addr = 0x77;
      this.iface; // set in init()
      this.calibrated = false;
      this.regs = registers;
      this.calibration = {};
      this.mocks = mocks;

      this.mode = {
        I2C: true,
        SPI: false
      };

      this.settings = {
        chipSelectPin: 10,
        runMode: 3,
        tStandby: 0,
        filter: 0,
        tempOverSample: 1,
        pressOverSample: 1,
        humidOverSample: 1
      }
  }

  use(port, mode){
    this.port = port;

    if(!mode || (mode === 'I2C')){
      this.mode.I2C = true;
      this.mode.SPI = false;
    } else if(mode === 'SPI'){
      this.mode.I2C = false;
      this.mode.SPI = true;
    }
  }

  init(){
    return new Promise((resolve, reject)=>{
      if(this.mode.I2C){
        this.iface = new this.port.I2C(this.addr);
      } else{
        this.iface = new this.port.SPI({
          clockSpeed: 4*1000*1000,  // 4MHz
          cpol: 1,  // polarity
          cpha: 0   // clock phase
        });
      }

      this.calibrate().then(()=>{
        this.getId().then(resolve);
      });
    });
  }

  read(rxlen){
    return new Promise((resolve, reject)=>{
      this.iface.read(rxlen, (err, rx)=>{
        if(err) reject(err);
        resolve(rx);
      });
    });
  }

  write(regId, data){
    return new Promise((resolve, reject)=>{
      var send = [regId];
      if(data) send.push(data);

      this.iface.send(new Buffer(send), (err, rx)=>{
        if(err) reject(err);
        resolve(rx);
      });
    });
  }

  transfer(txbuf, rxlen, mockErr, mockRet){
    return new Promise((resolve, reject)=>{
      if(this.mode.I2C){

        // I2C
        this.iface.transfer(txbuf, rxlen, (err, rx) => {
          if(err) reject(err);
          resolve(rx);
        }, mockErr, mockRet)
      } else{

        // SPI
        this.iface.transfer(txbuf, (err, rx) => {
          if(err) reject(err);
          resolve(rx);
        }, mockErr, mockRet)
      }
    });
  }

  calibrate(){
    return new Promise((resolve, reject)=>{
      var calRegAddrs = _.values(this.regs.CALIBRATION);
      var calRegNames = _.keys(this.regs.CALIBRATION);

      var calPromises = [];

      _.each(this.regs.CALIBRATION, (register, name)=>{
        calPromises.push( this.transfer( new Buffer([register]), 1, null, new Buffer([this.mocks.CALIBRATION[name]]) ) );
      });

      Promise.all(calPromises).then(pResults => {
        _.each(pResults, (value, index)=>{
          this.calibration[calRegNames[index]] = value;
        });

        this.compressedCalib = {
          dig_T1: bigint('0x'+this.calibration.DIG_T1_MSB_REG.toString('hex')).shiftLeft(8).add( bigint('0x'+this.calibration.DIG_T1_LSB_REG.toString('hex')) ),
          dig_T2: bigint('0x'+this.calibration.DIG_T2_MSB_REG.toString('hex')).shiftLeft(8).add( bigint('0x'+this.calibration.DIG_T2_LSB_REG.toString('hex')) ),
          dig_T3: bigint('0x'+this.calibration.DIG_T3_MSB_REG.toString('hex')).shiftLeft(8).add( bigint('0x'+this.calibration.DIG_T3_LSB_REG.toString('hex')) ),
        }

      }).then(()=>{

        //config will only be writeable in sleep mode, so first insure that.
        var p1 = this.write(this.regs.CTRL_MEAS_REG, 0x00);

        //Set the config word
        var dataToWrite = (this.settings.tStandby << 0x5) & 0xE0;
        dataToWrite |= (this.settings.filter << 0x02) & 0x1C;
        var p2 = this.write(this.regs.CONFIG_REG, dataToWrite);

        //Set ctrl_hum first, then ctrl_meas to activate ctrl_hum
        dataToWrite = this.settings.humidOverSample & 0x07; //all other bits can be ignored
        var p3 = this.write(this.regs.CTRL_HUMIDITY_REG, dataToWrite);

        //set ctrl_meas
        //First, set temp oversampling
        dataToWrite = (this.settings.tempOverSample << 0x5) & 0xE0;
        //Next, pressure oversampling
        dataToWrite |= (this.settings.pressOverSample << 0x02) & 0x1C;
        //Last, set mode
        dataToWrite |= (this.settings.runMode) & 0x03;
        //Load the byte
        var p4 = this.write(this.regs.CTRL_MEAS_REG, dataToWrite);

        Promise.all([p1, p2, p3, p4]).then(value => {
          this.calibrated = true;
          resolve();
        });

      });



    });
  }

  getId(){
    return new Promise((resolve, reject)=>{
      this.transfer(new Buffer([0xD0]), 1, null, new Buffer([0x60])).then(resolve);
    });
  }

  getTemp(system){

    return new Promise((resolve, reject) => {

      var tempPromises = [
        this.transfer( new Buffer([this.regs.TEMPERATURE_MSB_REG]), 1, null, new Buffer([0x82]) ),
        this.transfer( new Buffer([this.regs.TEMPERATURE_LSB_REG]), 1, null, new Buffer([0x97]) ),
        this.transfer( new Buffer([this.regs.TEMPERATURE_XLSB_REG]), 1, null, new Buffer([0x00]) )
      ];

      Promise.all(tempPromises).then(rxTempByte => {

        var tempMsb = bigint('0x'+rxTempByte[0].toString('hex')).shiftLeft(12);
        var tempLsb = bigint('0x'+rxTempByte[1].toString('hex')).shiftLeft(4);
        var tempXsb = bigint('0x'+rxTempByte[2].toString('hex')).shiftRight(4);

        var adc_T = bigint(tempMsb).or( tempLsb ).or(tempXsb);

        // Calibration
        var var1, var2;
        var var11 = adc_T.shiftRight(3).subtract(this.compressedCalib.dig_T1.shiftLeft(1));
        var var12 = var11.multiply(this.compressedCalib.dig_T2);
        var1 = var12.shiftRight(11);

        var var21 = adc_T.shiftRight(4).subtract(this.compressedCalib.dig_T1);
        var var22 = var21.shiftRight(12);
        var var23 = var22.multiply(this.compressedCalib.dig_T3)
        var2 = var23.shiftRight(14);

        var t_fine = var1 + var2;
        var output = ((t_fine * 5 + 128) >> 8) / 100;

        if(system == 'F'){
          resolve( (output * 9) / 5 + 32);
        }

        resolve(output);
      });

    });
  }

  getPressure(){
    return new Promise((resolve, reject) => {
      let output = 0;

      /* In Progress!
      https://github.com/sparkfun/SparkFun_BME280_Arduino_Library/blob/master/src/SparkFunBME280.cpp#L158

      // Returns pressure in Pa as unsigned 32 bit integer in Q24.8 format (24 integer bits and 8 fractional bits).
      // Output value of “24674867” represents 24674867/256 = 96386.2 Pa = 963.862 hPa
      int32_t adc_P = ((uint32_t)readRegister(BME280_PRESSURE_MSB_REG) << 12) | ((uint32_t)readRegister(BME280_PRESSURE_LSB_REG) << 4) | ((readRegister(BME280_PRESSURE_XLSB_REG) >> 4) & 0x0F);

      int64_t var1, var2, p_acc;
      var1 = ((int64_t)t_fine) - 128000;
      var2 = var1 * var1 * (int64_t)calibration.dig_P6;
      var2 = var2 + ((var1 * (int64_t)calibration.dig_P5)<<17);
      var2 = var2 + (((int64_t)calibration.dig_P4)<<35);
      var1 = ((var1 * var1 * (int64_t)calibration.dig_P3)>>8) + ((var1 * (int64_t)calibration.dig_P2)<<12);
      var1 = (((((int64_t)1)<<47)+var1))*((int64_t)calibration.dig_P1)>>33;

      // avoid exception caused by division by zero
      if (var1 == 0){
        reject(0);
      }

      p_acc = 1048576 - adc_P;
      p_acc = (((p_acc<<31) - var2)*3125)/var1;
      var1 = (((int64_t)calibration.dig_P9) * (p_acc>>13) * (p_acc>>13)) >> 25;
      var2 = (((int64_t)calibration.dig_P8) * p_acc) >> 19;
      p_acc = ((p_acc + var1 + var2) >> 8) + (((int64_t)calibration.dig_P7)<<4);

      output = (float)p_acc / 256.0;
      */

      resolve(output);
    });
  }

  getAltitude(system){
    return new Promise((resolve, reject) => {
      resolve(0);
    });
  }

  getHumidity(){
    return new Promise((resolve, reject) => {
      resolve(0);
    });
  }
}
