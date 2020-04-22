import chai, {expect} from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fetchMock from 'fetch-mock'
import create, {RequestError, json, html, blob, form, bearerAuth} from '../src/index'

chai.use(chaiAsPromised)

describe(`using middlewares with the client`, function() {

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
			method: `get`,
			headers: new Headers({
				'Content-Type': `application/json`,
				Accept: `application/json`
			}),
			body: undefined,
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
			method: `get`,
			headers: new Headers({
				'Content-Type': `application/json`,
				Accept: `application/json`
			}),
			body: undefined,
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
			method: `get`,
			headers: new Headers({
				Accept: `text/html`
			}),
			body: undefined,
		})
	})

	it(`handles empty body in html/text`, async function() {
		const {get} = create(`https://api.test.com/v1`, [html()])

		fetchMock.get(`https://api.test.com/v1/account?test=data`, 204)

		const response = await get(`account`, {test: `data`})
		expect(response).to.deep.equal(``)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account?test=data`)
		expect(options).to.deep.equal({
			method: `get`,
			headers: new Headers({
				Accept: `text/html`
			}),
			body: undefined,
		})
	})

	it(`converts the body to form data`, async function() {
		const {post} = create(`https://api.test.com/v1`, [form()])

		fetchMock.post(`https://api.test.com/v1/account`, {data: true})

		const response = await post(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response).to.be.an.instanceof(Response)

		const [url, options] = fetchMock.calls()[0]
		expect(url).to.equal(`https://api.test.com/v1/account`)
		expect(options.method).to.equal(`post`)
		expect(options.headers).to.deep.equal(new Headers({'Content-Type': `multipart/form-data`}))
		expect(options.body._streams[0]).to.contain(`name="test"`)
		expect(options.body._streams[1]).to.equal(`data`)
	})

	it(`handles authorization via bearer token`, async function() {
		const lsKey = `storagekey`
		localStorage.removeItem(lsKey)
		const {get, post} = create(`https://api.test.com/v1`, [bearerAuth(lsKey)])

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
			method: `post`,
			credentials: `include`,
			headers: new Headers({
				Authorization: ``,
			}),
			body: `{"username":"user","password":"pass"}`,
		})

		const [url2, options2] = fetchMock.calls()[1]
		expect(url2).to.equal(`https://api.test.com/v1/account`)
		expect(options2).to.deep.equal({
			method: `get`,
			credentials: `include`,
			headers: new Headers({
				Authorization: `Bearer test-token`,
			}),
			body: undefined,
		})
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
		expect(options1.method).to.equal(`post`)
		expect(options1.credentials).to.equal(`include`)
		expect(options1.headers).to.deep.equal(new Headers({
			'Content-Type': `multipart/form-data`,
			Accept: `application/json`,
			Authorization: ``,
		}))
		expect(options1.body._streams[0]).to.contain(`name="username"`)
		expect(options1.body._streams[1]).to.equal(`user`)
		expect(options1.body._streams[3]).to.contain(`name="password"`)
		expect(options1.body._streams[4]).to.equal(`pass`)

		const [url2, options2] = fetchMock.calls()[1]
		expect(url2).to.equal(`https://api.test.com/v1/account`)
		expect(options2).to.deep.equal({
			method: `get`,
			credentials: `include`,
			headers: new Headers({
				'Content-Type': `application/json`,
				Accept: `application/json`,
				Authorization: `Bearer test-token`,
			}),
			body: undefined,
		})
	})

})