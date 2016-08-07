var assert = require('assert');
var chai = require('chai');
var should = chai.should();
var expect = chai.expect;

var BME280 = require('../index');
var sensor;

beforeEach(function () {
  sensor = new BME280();
});

describe('Class', function() {
  it('should have a name', function() {
    expect(sensor).to.have.property('name');
  });
});