import { LOG_LEVEL, setLogLevel, freezeLogLevel } from '../src/logger';
import {
  getAllCombinations,
  BigNumber,
  lagrangeInterpolation,
} from '../src/ssrHelper';
const { BN } = require('bn.js');

setLogLevel(LOG_LEVEL.NOLOGS);
freezeLogLevel();

const sampleValues: Array<BigNumber> = [
  new BN('462D5898A170E', 16),
  new BN('2BDC575F64E68C', 16),
  new BN('1B69B69B9F10178', 16),
];
const sampleIndexes: Array<BigNumber> = [
  new BN('1', 16),
  new BN('2', 16),
  new BN('3', 16),
];
const expectedSecret = new BN('1402ee4386092fe', 16);

const expectedCombinations = [
  [0, 1],
  [0, 2],
  [1, 2],
];
describe('lagrangeInterpolation(values, indexes)', () => {
  it('should return expected secret on sample values', () => {
    const secret = lagrangeInterpolation(sampleValues, sampleIndexes);
    expect(secret.cmp(expectedSecret)).toEqual(0);
  });
});

describe('kCombinations(totalShareCount, thresholdCount)', () => {
  it('should return expected combinations of k shares from totalShareCount', () => {
    const totalShareCount = 3;
    const thresholdCount = 2;
    const combis = getAllCombinations(totalShareCount, thresholdCount);
    expect(combis.sort()).toEqual(expectedCombinations.sort());
  });
  it('should return empty array if k > totalShareCount', () => {
    const totalShareCount = 2;
    const thresholdCount = 3;
    const combis = getAllCombinations(totalShareCount, thresholdCount);
    expect(combis.length).toBe(0);
  });
});
