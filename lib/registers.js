// Contains register lists for the BME280

module.exports = {
  CALIBRATION: {
    DIG_T1_LSB_REG:       0x88,
    DIG_T1_MSB_REG:       0x89,
    DIG_T2_LSB_REG:       0x8A,
    DIG_T2_MSB_REG:       0x8B,
    DIG_T3_LSB_REG:       0x8C,
    DIG_T3_MSB_REG:       0x8D,
    DIG_P1_LSB_REG:       0x8E,
    DIG_P1_MSB_REG:       0x8F,
    DIG_P2_LSB_REG:       0x90,
    DIG_P2_MSB_REG:       0x91,
    DIG_P3_LSB_REG:       0x92,
    DIG_P3_MSB_REG:       0x93,
    DIG_P4_LSB_REG:       0x94,
    DIG_P4_MSB_REG:       0x95,
    DIG_P5_LSB_REG:       0x96,
    DIG_P5_MSB_REG:       0x97,
    DIG_P6_LSB_REG:       0x98,
    DIG_P6_MSB_REG:       0x99,
    DIG_P7_LSB_REG:       0x9A,
    DIG_P7_MSB_REG:       0x9B,
    DIG_P8_LSB_REG:       0x9C,
    DIG_P8_MSB_REG:       0x9D,
    DIG_P9_LSB_REG:       0x9E,
    DIG_P9_MSB_REG:       0x9F,
    DIG_H1_REG:           0xA1,
    DIG_H2_LSB_REG:       0xE1,
    DIG_H2_MSB_REG:       0xE2,
    DIG_H3_REG:           0xE3,
    DIG_H4_MSB_REG:       0xE4,
    DIG_H4_LSB_REG:       0xE5,
    DIG_H5_MSB_REG:       0xE6,
    DIG_H6_REG:           0xE7,
  },
  CHIP_ID_REG:          0xD0, //Chip ID
  RST_REG:              0xE0, //Softreset Reg
  CTRL_HUMIDITY_REG:    0xF2, //Ctrl Humidity Reg
  STAT_REG:             0xF3, //Status Reg
  CTRL_MEAS_REG:        0xF4, //Ctrl Measure Reg
  CONFIG_REG:           0xF5, //Configuration Reg
  PRESSURE_MSB_REG:     0xF7, //Pressure MSB
  PRESSURE_LSB_REG:     0xF8, //Pressure LSB
  PRESSURE_XLSB_REG:    0xF9, //Pressure XLSB
  TEMPERATURE_MSB_REG:  0xFA, //Temperature MSB
  TEMPERATURE_LSB_REG:  0xFB, //Temperature LSB
  TEMPERATURE_XLSB_REG: 0xFC, //Temperature XLS
  HUMIDITY_MSB_REG:     0xFD, //Humidity MSB
  HUMIDITY_LSB_REG:     0xFE, //Humidity LSB
};