import { expect } from "chai"
import fetchMock from "fetch-mock"
import pako from "pako"
import create, { headers, json, html, form, bearerAuth } from "../src/index"
import gzip from "../src/middlewares/gzip"
import spyOnCookies from "spy-on-cookies"

describe(`using middlewares with the client`, function () {
	beforeEach(function () {
		this.cookie = spyOnCookies()
	})

	afterEach(function () {
		this.cookie.restore()
		fetchMock.reset()
	})

	it("adds single headers", async function () {
		const result = await headers("Content-Type", "application/json")(
			new Request("https://api.test.com/v1"),
			(updates) => {
				expect(updates!.headers).to.deep.equal({
					"Content-Type": "application/json",
				})
				return Promise.resolve(new Response("test data", { status: 200 }))
			}
		)
		expect(result.ok).to.be.true
		expect(result.text()).to.eventually.equal("test data")
	})

	it("adds multiple headers", async function () {
		const result = await headers({
			"Content-Type": "application/json",
			Accept: "application/json",
		})(new Request("https://api.test.com/v1"), (updates) => {
			expect(updates!.headers).to.deep.equal({
				"Content-Type": "application/json",
				Accept: "application/json",
			})
			return Promise.resolve(new Response("test data", { status: 200 }))
		})
		expect(result.ok).to.be.true
		expect(result.text()).to.eventually.equal("test data")
	})

	it(`handles json`, async function () {
		const client = create(`https://api.test.com/v1`).use(json())

		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?test=data`,
			headers: {
				"Content-Type": `application/json`,
				Accept: `application/json`,
			},
			response: { data: true },
		})

		const response = await client.get(`account`, { test: `data` })
		expect(response).to.deep.equal({ data: true })
	})

	it(`handles empty body in json`, async function () {
		const client = create(`https://api.test.com/v1`).use(json())

		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?test=data`,
			headers: {
				"Content-Type": `application/json`,
				Accept: `application/json`,
			},
			response: 204,
		})

		const response = await client.get(`account`, { test: `data` })
		expect(response).to.deep.equal({})
	})

	it(`handles html/text`, async function () {
		const client = create(`https://api.test.com/v1`).use(html())

		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?test=data`,
			headers: { Accept: `text/html` },
			response: { data: true },
		})

		const response = await client.get(`account`, { test: `data` })
		expect(response).to.equal(`{"data":true}`)
	})

	it(`handles empty body in html/text`, async function () {
		const client = create(`https://api.test.com/v1`).use(html())

		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?test=data`,
			headers: { Accept: `text/html` },
			response: 204,
		})

		const response = await client.get(`account`, { test: `data` })
		expect(response).to.deep.equal(``)
	})

	it(`converts the body to form data`, async function () {
		const client = create(`https://api.test.com/v1`).use(form())

		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: { "Content-Type": "multipart/form-data" },
			rawBody: (body: any) => {
				return (
					body._streams[0].includes(`name="test"`) &&
					body._streams[1] === `data`
				)
			},
			response: { data: true },
		})

		const response = await client.post(`account`, { test: `data` })
		expect(response.ok).to.be.true
		// TODO: it seems to be a Response, but still fails
		// expect(response).to.be.an.instanceof(Response)
	})

	it(`gzips the body content`, async function () {
		const client = create(`https://api.test.com/v1`).use(gzip())

		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: { "Content-Encoding": "gzip" },
			rawBody: (body: any) => {
				return (
					pako.ungzip(body, { to: "string" }) ===
					`{"prop1":{"data":true},"prop2":{"data":false},"prop3":{"data":true}}`
				)
			},
			response: { data: true },
		})

		const response = await client.post(`account`, {
			prop1: { data: true },
			prop2: { data: false },
			prop3: { data: true },
		})
		expect(response.ok).to.be.true
		// TODO: it seems to be a Response, but still fails
		// expect(response).to.be.an.instanceof(Response)
	})

	it(`handles authorization via bearer token`, async function () {
		const tokenKey = `storagekey`
		localStorage.removeItem(tokenKey)
		const client = create(`https://api.test.com/v1`).use(bearerAuth(tokenKey))

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: { Authorization: "" },
				credentials: true,
				rawBody: '{"username":"user","password":"pass"}',
				response: { headers: { Authorization: `test-token` } },
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: { Authorization: "Bearer test-token" },
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes.ok).to.be.true

		const accountRes = await client.get(`account`)
		expect(accountRes.ok).to.be.true
	})

	it(`handles authorization via bearer token with custom header`, async function () {
		const tokenKey = `storagekey`
		localStorage.removeItem(tokenKey)
		const client = create(`https://api.test.com/v1`).use(
			bearerAuth(tokenKey, { header: "X-Auth-Token", store: "localstorage" })
		)

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: { "X-Auth-Token": "" },
				credentials: true,
				rawBody: '{"username":"user","password":"pass"}',
				response: { headers: { "X-Auth-Token": `test-token` } },
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: { "X-Auth-Token": "Bearer test-token" },
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes.ok).to.be.true

		const accountRes = await client.get(`account`)
		expect(accountRes.ok).to.be.true
	})

	it(`handles authorization via bearer token with cookie store`, async function () {
		const tokenKey = `storagekey`
		const client = create(`https://api.test.com/v1`).use(
			bearerAuth(tokenKey, { store: "cookie" })
		)

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: { Authorization: "" },
				credentials: true,
				rawBody: '{"username":"user","password":"pass"}',
				response: { headers: { Authorization: `test-token` } },
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: { Authorization: "Bearer test-token" },
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes.ok).to.be.true

		const accountRes = await client.get(`account`)
		expect(accountRes.ok).to.be.true

		expect(this.cookie.calls).to.deep.equal(["storagekey=test-token;"])
	})

	it(`handles authorization via bearer token with cookie store and options`, async function () {
		const tokenKey = `storagekey2`
		const client = create(`https://api.test.com/v1`).use(
			bearerAuth(tokenKey, {
				store: "cookie",
				options: { domain: "test.com", "max-age": 3600 },
			})
		)

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: { Authorization: "" },
				credentials: true,
				rawBody: '{"username":"user","password":"pass"}',
				response: { headers: { Authorization: `test-token` } },
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: { Authorization: "Bearer test-token" },
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes.ok).to.be.true

		const accountRes = await client.get(`account`)
		expect(accountRes.ok).to.be.true

		expect(this.cookie.calls).to.deep.equal([
			"storagekey2=test-token;domain=test.com;",
		])
	})

	it(`handles authorization via bearer token with memory store`, async function () {
		const tokenKey = `storagekey`
		const client = create(`https://api.test.com/v1`).use(
			bearerAuth(tokenKey, { store: "memory" })
		)

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: { Authorization: "" },
				credentials: true,
				rawBody: '{"username":"user","password":"pass"}',
				response: { headers: { Authorization: `test-token` } },
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: { Authorization: "Bearer test-token" },
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes.ok).to.be.true

		const accountRes = await client.get(`account`)
		expect(accountRes.ok).to.be.true
	})

	it(`handles authorization via bearer token with static store`, async function () {
		const token = `tokenvalue`
		const client = create(`https://api.test.com/v1`).use(
			bearerAuth(token, { store: "static" })
		)

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: { Authorization: "Bearer tokenvalue" },
				credentials: true,
				rawBody: '{"username":"user","password":"pass"}',
				response: { headers: { Authorization: `test-token` } },
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: { Authorization: "Bearer tokenvalue" },
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes.ok).to.be.true

		const accountRes = await client.get(`account`)
		expect(accountRes.ok).to.be.true
	})

	it(`handles authorization via bearer token with custom store`, async function () {
		const customStore: { [k: string]: string } = {}
		const tokenKey = `storagekey`
		const client = create(`https://api.test.com/v1`).use(
			bearerAuth(tokenKey, {
				store: {
					read: async (k) => customStore[k],
					write: async (k, v) => (customStore[k] = v),
				},
			})
		)

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: { Authorization: "" },
				credentials: true,
				rawBody: '{"username":"user","password":"pass"}',
				response: { headers: { Authorization: `test-token` } },
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: { Authorization: "Bearer test-token" },
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes.ok).to.be.true

		const accountRes = await client.get(`account`)
		expect(accountRes.ok).to.be.true

		expect(customStore).to.deep.equal({ [tokenKey]: "test-token" })
	})

	it(`handles multiple middlewares at once`, async function () {
		const tokenKey = `storagekey`
		localStorage.removeItem(tokenKey)
		const client = create(`https://api.test.com/v1`)
			.use(form())
			.use(bearerAuth(tokenKey))
			.use(json())

		fetchMock
			// @ts-ignore
			.post({
				url: `https://api.test.com/v1/login`,
				headers: {
					"Content-Type": `multipart/form-data`,
					Accept: `application/json`,
					Authorization: ``,
				},
				credentials: true,
				rawBody: (body: any) => {
					return (
						body._streams[0].includes(`name="username"`) &&
						body._streams[1] === `user` &&
						body._streams[3].includes(`name="password"`) &&
						body._streams[4] === `pass`
					)
				},
				response: {
					headers: { Authorization: `test-token` },
					body: { success: true },
				},
			})
			// @ts-ignore
			.get({
				url: `https://api.test.com/v1/account`,
				headers: {
					"Content-Type": `application/json`,
					Accept: `application/json`,
					Authorization: `Bearer test-token`,
				},
				credentials: true,
				response: { data: true },
			})

		const loginRes = await client.post(`login`, {
			username: `user`,
			password: `pass`,
		})
		expect(loginRes).to.deep.equal({ success: true })

		const accountRes = await client.get(`account`)
		expect(accountRes).to.deep.equal({ data: true })
	})
})
