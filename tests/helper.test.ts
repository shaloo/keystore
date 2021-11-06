import {
  generateJsonRPCObject,
  afterThreshold,
  thresholdSame,
} from '../src/helper';
import { LOG_LEVEL, setLogLevel, freezeLogLevel } from '../src/logger';

setLogLevel(LOG_LEVEL.NOLOGS);
freezeLogLevel();

describe('thresholdSame<T>(array: []T, threshold: number)', () => {
  const sampleInput = ['a', 'b', 'c', 'a', 'd', 'e', 'a', 'a'];
  it('should return a is threshold <= 4', () => {
    expect(thresholdSame<string>(sampleInput, 3)).toBe('a');
  });
  it('should return undefined is threshold > 4', () => {
    expect(thresholdSame<string>(sampleInput, 5)).toBe(undefined);
  });
});

describe('afterThreshold', () => {
  const returnStringFunc = async () => 'test';
  it('should return string after threshold met', async () => {
    const samplePromises = [
      returnStringFunc(),
      returnStringFunc(),
      returnStringFunc(),
    ];
    const response = await afterThreshold<string, string>(
      samplePromises,
      3,
      async (responses: Array<string>) => {
        return responses[0];
      }
    );
    expect(response).toBe('test');
  });
  // One more test needed when promises throw error
  it('should throw error on all callback err', async () => {
    const samplePromises = [
      returnStringFunc(),
      returnStringFunc(),
      returnStringFunc(),
      returnStringFunc(),
    ];
    try {
      await afterThreshold<string, string>(
        samplePromises,
        3,
        async (responses: Array<string>) => {
          throw new Error('Invalid');
        }
      );
    } catch (e) {
      expect(e.startsWith('Could not finish after all resolution')).toBe(true);
    }
  });
  it('should be called only response length >= threshold count', async () => {
    const returnStringFunc = (delay: number): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          return resolve('test');
        }, delay * 500);
      });
    };
    const samplePromises = [
      returnStringFunc(1),
      returnStringFunc(2),
      returnStringFunc(3),
      returnStringFunc(4),
    ];
    const called = [];
    const expectation = [3, 4];
    const res = await afterThreshold<string, string>(
      samplePromises,
      3,
      async (responses: Array<string>) => {
        let count = 0;
        responses.forEach((r) => {
          if (r == 'test') {
            count += 1;
          }
        });
        called.push(count);
        if (count == 4) {
          return String(called);
        } else {
          throw new Error('Go to next');
        }
      }
    );
    expect(res).toBe(String(expectation));
  });
});

describe('generateJsonRPCObject', () => {
  it('should return expected json rpc object', () => {
    const rpcObj = generateJsonRPCObject('test', { param: 'testparam' });
    expect(rpcObj.method).toBe('test');
    expect(rpcObj.id).toBe(10);
    expect(rpcObj.jsonrpc).toBe('2.0');
    expect(rpcObj.params.param).toBe('testparam');
  });
});
