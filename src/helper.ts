import { ec as EC } from 'elliptic';

export const generateJsonRPCObject = (method: string, parameters: any) => ({
    jsonrpc: '2.0',
    method,
    id: 10,
    params: parameters,
})

export const getPublicKeyHex = (args: { X: any, Y: any }) => {
    const ec = new EC('secp256k1');
    const key = ec.keyFromPublic({ x: args.X.toString(16), y: args.Y.toString(16) }).getPublic()
    const X = key.getX().toString(16)
    const Y = key.getY().toString(16)
    return { X, Y }
}

export const post = async (url: string, body: any): Promise<ResultInterface> => {
    const request = await fetch(url, {
        body: JSON.stringify(body),
        method: "POST",
        headers: {
            "Content-type": "application/json"
        }
    });

    if (request.status >= 400) {
        const err = await request.text();
        return {
            ok: false,
            response: err
        } as ResultInterface;
    } else {
        const result = await request.json();
        return {
            ok: true,
            response: result
        } as ResultInterface;
    }
}

export function afterThreshold<T, U>(promises: Array<Promise<U>>, thresholdCount = promises.length, callback: (r: any[]) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const results = new Array(promises.length).fill(undefined);
        const errors = new Array(promises.length).fill(undefined);
        let done = false;
        let count = 0;
        promises.forEach((promise, i) => {
            promise.then(response => {
                results[i] = response
            })
                .catch(error => {
                    errors[i] = error
                })
                .finally(() => {
                    if (done) return;
                    count += 1
                    if (count >= thresholdCount) {
                        callback(results.slice(0)).then((data: T) => {
                            done = true;
                            return resolve(data);
                        }).catch((err: Error) => {
                            console.log({ err })
                        }).finally(() => {
                            if (count === thresholdCount && !done) {
                                return reject(`Could not finish after all resolution: errors: ${JSON.stringify(errors)}`)
                            }
                        })
                    }
                });
        });
    })
}

export const thresholdSame = <T>(arr:Array<T>, t: number): T => {
    const hashMap = {}
    for (let i = 0; i < arr.length; i += 1) {
        const str = JSON.stringify(arr[i])
        hashMap[str] = hashMap[str] ? hashMap[str] + 1 : 1
        if (hashMap[str] === t) {
            return arr[i]
        }
    }
    return undefined
}

interface ResultInterface {
    response: any | string;
    ok: boolean;
}