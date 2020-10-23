import chai, {expect} from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fetchMock from 'fetch-mock'
import pako from 'pako'
import create, {RequestError, json, html, blob, form, bearerAuth} from '../src/index'
import gzip from '../src/middlewares/gzip'
import {checkDeepEqualHeaders} from './utils'

chai.use(chaiAsPromised)

describe(`using middlewares with the client`, function() {

	// This is a generic header object since deep equal comparisons don't work
	// on this object. We ensure our expectation by getting the header values
	// specifically and checking equality.
	const headers = new Headers({})

	afterEach(function() {
		fetchMock.reset()
	})

	it(`handles json`, async function() {
		const {get} = create(`https://api.test.com/v1`, [json()])

		fetchMock.get(`https://api.test.com/v1/account?test=data`, {data: true})

		const response = await get(`account`, {test: `data`})
		expect(response).to.deep.equal({data: true})

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?test=data`)
		expect(options).to.deep.equal({
			method: `GET`,
			headers,
			body: undefined,
		})
		checkDeepEqualHeaders(options.headers, {
			'Content-Type': `application/json`,
			'Accept': `application/json`
		})
	})

	it(`handles empty body in json`, async function() {
		const {get} = create(`https://api.test.com/v1`, [json()])

		fetchMock.get(`https://api.test.com/v1/account?test=data`, 204)

		const response = await get(`account`, {test: `data`})
		expect(response).to.deep.equal({})

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?test=data`)
		expect(options).to.deep.equal({
			method: `GET`,
			headers,
			body: undefined,
		})
		checkDeepEqualHeaders(options.headers, {
			'Content-Type': `application/json`,
			'Accept': `application/json`
		})
	})

	it(`handles html/text`, async function() {
		const {get} = create(`https://api.test.com/v1`, [html()])

		fetchMock.get(`https://api.test.com/v1/account?test=data`, {data: true})

		const response = await get(`account`, {test: `data`})
		expect(response).to.equal(`{"data":true}`)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?test=data`)
		expect(options).to.deep.equal({
			method: `GET`,
			headers,
			body: undefined,
		})
		checkDeepEqualHeaders(options.headers, { 'Accept': `text/html` })
	})

	it(`handles empty body in html/text`, async function() {
		const {get} = create(`https://api.test.com/v1`, [html()])

		fetchMock.get(`https://api.test.com/v1/account?test=data`, 204)

		const response = await get(`account`, {test: `data`})
		expect(response).to.deep.equal(``)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?test=data`)
		expect(options).to.deep.equal({
			method: `GET`,
			headers,
			body: undefined,
		})
		checkDeepEqualHeaders(options.headers, { 'Accept': `text/html` })
	})

	it(`converts the body to form data`, async function() {
		const {post} = create(`https://api.test.com/v1`, [form()])

		fetchMock.post(`https://api.test.com/v1/account`, {data: true})

		const response = await post(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response).to.be.an.instanceof(Response)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options.method).to.equal(`POST`)
		checkDeepEqualHeaders(options.headers, { 'Content-Type': `multipart/form-data` })
		expect(options.body._streams[0]).to.contain(`name="test"`)
		expect(options.body._streams[1]).to.equal(`data`)
	})

	it(`gzips the body content`, async function() {
		const {post} = create(`https://api.test.com/v1`, [gzip()])

		fetchMock.post(`https://api.test.com/v1/account`, {data: true})

		const response = await post(`account`, {prop1: {data: true}, prop2: {data: false}, prop3: {data: true}})
		expect(response.ok).to.be.true
		expect(response).to.be.an.instanceof(Response)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options.method).to.equal(`POST`)
		checkDeepEqualHeaders(options.headers, { 'Content-Encoding': `gzip` })
		expect(options.body).to.equal(`\u001f\b\u0000\u0000\u0000\u0000\u0000\u0000\u0003«V*(Ê/0T²ªVJI,IT²*)*M­Õ\u0001\u001a!DÓ\u0012saÂÆhk\u0001Jè²D\u0000\u0000\u0000`)
		expect(pako.ungzip(options.body, {to: 'string'})).to.equal(`{"prop1":{"data":true},"prop2":{"data":false},"prop3":{"data":true}}`)
	})

	it(`handles authorization via bearer token`, async function() {
		const lsKey = `storagekey`
		localStorage.removeItem(lsKey)
		const {get, post} = create(`https://api.test.com/v1`, [bearerAuth(lsKey, 'localstorage')])

		fetchMock
			.post(`https://api.test.com/v1/login`, {headers: {Authorization: `test-token`}})
			.get(`https://api.test.com/v1/account`, {data: true})

		const loginRes = await post(`login`, {username: `user`, password: `pass`})
		expect(loginRes.ok).to.be.true

		const accountRes = await get(`account`)
		expect(accountRes.ok).to.be.true

		const [url1, options1] = fetchMock.calls()[0]
		expect(url1).to.equal(`https://api.test.com/v1/login`)
		expect(options1).to.deep.equal({
			method: `POST`,
			credentials: `include`,
			headers,
			body: `{"username":"user","password":"pass"}`,
		})
		checkDeepEqualHeaders(options1.headers, { 'Authorization': `` })

		const [url2, options2] = fetchMock.calls()[1]
		expect(url2).to.equal(`https://api.test.com/v1/account`)
		expect(options2).to.deep.equal({
			method: `GET`,
			credentials: `include`,
			headers: new Headers({
				Authorization: `Bearer test-token`,
			}),
			body: undefined,
		})
		checkDeepEqualHeaders(options2.headers, { 'Authorization': `Bearer test-token` })
	})

	it(`handles multiple middlewares at once`, async function() {
		const lsKey = `storagekey`
		localStorage.removeItem(lsKey)
		const {get, post} = create(`https://api.test.com/v1`, [json(), bearerAuth(lsKey), form()])

		fetchMock
			.post(`https://api.test.com/v1/login`, {headers: {Authorization: `test-token`}, body: {success: true}})
			.get(`https://api.test.com/v1/account`, {data: true})

		const loginRes = await post(`login`, {username: `user`, password: `pass`})
		expect(loginRes).to.deep.equal({success: true})

		const accountRes = await get(`account`)
		expect(accountRes).to.deep.equal({data: true})

		const [url1, options1] = fetchMock.calls()[0]
		expect(url1).to.equal(`https://api.test.com/v1/login`)
		expect(options1.method).to.equal(`POST`)
		expect(options1.credentials).to.equal(`include`)
		checkDeepEqualHeaders(options1.headers, {
			'Content-Type': `multipart/form-data`,
			'Accept': `application/json`,
			'Authorization': ``
		})
		expect(options1.body._streams[0]).to.contain(`name="username"`)
		expect(options1.body._streams[1]).to.equal(`user`)
		expect(options1.body._streams[3]).to.contain(`name="password"`)
		expect(options1.body._streams[4]).to.equal(`pass`)

		const [url2, options2] = fetchMock.calls()[1]
		expect(url2).to.equal(`https://api.test.com/v1/account`)
		expect(options2).to.deep.equal({
			method: `GET`,
			credentials: `include`,
			headers,
			body: undefined,
		})
		checkDeepEqualHeaders(options2.headers, {
			'Content-Type': `application/json`,
			'Accept': `application/json`,
			'Authorization': `Bearer test-token`
		})
	})

})