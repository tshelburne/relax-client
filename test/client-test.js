import chai, {expect} from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fetchMock from 'fetch-mock'
import create, {RequestError} from '../src/client'

chai.use(chaiAsPromised)

describe(`a basic client`, function() {

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
			method: `get`,
			headers: new Headers({}),
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
			method: `post`,
			headers: new Headers({}),
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
			method: `put`,
			headers: new Headers({}),
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
			method: `delete`,
			headers: new Headers({}),
			body: undefined,
		})
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