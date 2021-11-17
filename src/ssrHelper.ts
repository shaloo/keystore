import BN from 'bn.js';
import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');
// const { BN } = require("bn.js");

export const getAllCombinations = (
  s: Array<number> | number,
  k: number
): Array<Array<number>> => {
  let set = s;
  if (typeof set === 'number') {
    set = Array.from({ length: set }, (_, i) => i);
  }
  if (k > set.length || k <= 0) {
    return [];
  }

  if (k === set.length) {
    return [set];
  }

  if (k === 1) {
    return set.reduce((acc, cur) => [...acc, [cur]], []);
  }

  const combs: Array<Array<number>> = [];
  let tailCombs = [];

  for (let i = 0; i <= set.length - k + 1; i += 1) {
    tailCombs = getAllCombinations(set.slice(i + 1), k - 1);
    for (let j = 0; j < tailCombs.length; j += 1) {
      combs.push([set[i], ...tailCombs[j]]);
    }
  }

  return combs;
};

export type BigNumber = BN;

export function lagrangeInterpolation(
  shares: Array<BN>,
  nodeIndex: Array<BN>
): BN {
  if (shares.length !== nodeIndex.length) {
    return null;
  }
  let secret = new BN(0);
  for (let i = 0; i < shares.length; i += 1) {
    let upper = new BN(1);
    let lower = new BN(1);
    for (let j = 0; j < shares.length; j += 1) {
      if (i !== j) {
        upper = upper.mul(nodeIndex[j].neg());
        upper = upper.umod(ec.curve.n);
        let temp = nodeIndex[i].sub(nodeIndex[j]);
        temp = temp.umod(ec.curve.n);
        lower = lower.mul(temp).umod(ec.curve.n);
      }
    }
    let delta = upper.mul(lower.invm(ec.curve.n)).umod(ec.curve.n);
    delta = delta.mul(shares[i]).umod(ec.curve.n);
    secret = secret.add(delta);
  }
  return secret.umod(ec.curve.n);
}
