'use strict';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const YEAR = DAY * 365.24;
const NORMAL_YEAR = DAY * 365;
const LEAP_YEAR = DAY * 366;
const DECADE = 10 * YEAR;
const HALF_YEAR = YEAR / 2;
const AVERAGE_MONTH = YEAR / 12;

module.exports = {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  YEAR,
  NORMAL_YEAR,
  LEAP_YEAR,
  DECADE,
  HALF_YEAR,
  AVERAGE_MONTH
};