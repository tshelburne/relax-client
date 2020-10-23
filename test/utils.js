import {expect} from 'chai'

export function checkDeepEqualHeaders(headers, expectation) {
    for (let key of Object.keys(expectation)) {
        expect(headers.get(key)).to.equal(expectation[key])
    }

    let count = 0
    headers.forEach(_ => count++)
    expect(count).to.equal(Object.keys(expectation).length)
}