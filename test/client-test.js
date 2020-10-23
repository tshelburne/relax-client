import chai, {expect} from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fetchMock from 'fetch-mock'
import create, {RequestError} from '../src/client'
import json from '../src/middlewares/json'
import form from '../src/middlewares/form'
import { checkDeepEqualHeaders } from './utils'

chai.use(chaiAsPromised)

describe(`a basic client`, function() {

	// This is a generic header object since deep equal comparisons don't work
	// on this object. We ensure our expectation by getting the header values
	// specifically and checking equality.
	const headers = new Headers({})

	beforeEach(function() {
		this.client = create(`https://api.test.com/v1`)
	})

	afterEach(function() {
		fetchMock.reset()
	})

	it(`makes GET requests`, async function() {
		fetchMock.get(`https://api.test.com/v1/account?test=data`, 200)

		const response = await this.client.get(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?test=data`)
		expect(options).to.deep.equal({
			method: `GET`,
			headers,
			body: undefined,
		})
	})

	it(`makes POST requests`, async function() {
		fetchMock.post(`https://api.test.com/v1/account`, 200)

		const response = await this.client.post(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options).to.deep.equal({
			method: `POST`,
			headers,
			body: `{"test":"data"}`,
		})
	})

	it(`makes PUT requests`, async function() {
		fetchMock.put(`https://api.test.com/v1/account`, 200)

		const response = await this.client.put(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options).to.deep.equal({
			method: `PUT`,
			headers,
			body: `{"test":"data"}`,
		})
	})

	it(`makes PATCH requests`, async function() {
		fetchMock.patch(`https://api.test.com/v1/account`, 200)

		const response = await this.client.patch(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options).to.deep.equal({
			method: `PATCH`,
			headers,
			body: `{"test":"data"}`,
		})
	})

	it(`makes DELETE requests`, async function() {
		fetchMock.delete(`https://api.test.com/v1/account?test=data`, 200)

		const response = await this.client.destroy(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?test=data`)
		expect(options).to.deep.equal({
			method: `DELETE`,
			headers,
			body: undefined,
		})
	})

	it(`allows using one-off middlewares`, async function() {
		fetchMock.post(`https://api.test.com/v1/account`, {data: true})

		const response = await this.client.post(`account`, {test: `data`}, {
			middlewares: [json()]
		})

		expect(response).to.deep.equal({data: true})

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options).to.deep.equal({
			method: `POST`,
			headers,
			body: `{"test":"data"}`,
		})
		checkDeepEqualHeaders(options.headers, {
			'Content-Type': `application/json`,
			'Accept': `application/json`
		})
	})

	it(`appends one-off middlewares to existing ones`, async function() {
		fetchMock.post(`https://api.test.com/v1/account`, {data: true})

		this.client = create(`https://api.test.com/v1`, [json()])
		const response = await this.client.post(`account`, {test: `data`}, {
			middlewares: [form()]
		})

		expect(response).to.deep.equal({data: true})

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options.method).to.equal(`POST`)
		checkDeepEqualHeaders(options.headers, {
			'Content-Type': `multipart/form-data`,
			'Accept': `application/json`
		})
		expect(options.body._streams[0]).to.contain(`name="test"`)
		expect(options.body._streams[1]).to.equal(`data`)
	})

	it(`ignores the query string entirely`, async function() {
		fetchMock.get(`https://api.test.com/v1/account`, 200)

		const response = await this.client.get(`account`)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
	})

	it(`appends to the query string`, async function() {
		fetchMock.get(`https://api.test.com/v1/account?original=true&test=data`, 200)

		const response = await this.client.get(`account?original=true`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?original=true&test=data`)
	})

	it(`throws on requests with failure status codes`, function() {
		fetchMock.get(`https://api.test.com/v1/account`, 400)

		expect(this.client.get(`account`)).to.eventually.be.rejectedWith(RequestError, `Request failed: Bad Request`)
	})

})