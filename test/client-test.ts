import { expect } from "chai"
import fetchMock from "fetch-mock"
import create, { Client, RequestError } from "../src/client"
import { Middleware } from "../src/middleware"

describe(`a basic client`, function () {
	afterEach(function () {
		fetchMock.reset()
	})

	it(`makes GET requests`, async function () {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?test=data`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").get(
			`account`,
			{ test: `data` }
		)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes POST requests`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			rawBody: `{"test":"data"}`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").post(
			`account`,
			{ test: `data` }
		)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes PUT requests`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.put({
			url: `https://api.test.com/v1/account`,
			rawBody: `{"test":"data"}`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").put(
			`account`,
			{ test: `data` }
		)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes PATCH requests`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.patch({
			url: `https://api.test.com/v1/account`,
			rawBody: `{"test":"data"}`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").patch(
			`account`,
			{ test: `data` }
		)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes DELETE requests`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.delete({
			url: `https://api.test.com/v1/account?test=data`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").destroy(
			`account`,
			{ test: `data` }
		)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`exposes the last response through the client`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account`,
			response: 200,
		})
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/org`,
			response: 200,
		})

		const client = Client.start("https://api.test.com/v1")

		const res1 = await client.get(`account`)
		expect(client.lastResponse).to.equal(res1)

		const res2 = await client.get(`org`)
		expect(client.lastResponse).to.equal(res2)
	})

	it(`allows using middlewares`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: {
				Accept: `application/json`,
			},
			rawBody: `{"test":"data"}`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1")
			.use(addHeader(`Accept`, `application/json`))
			.post(`account`, { test: `data` })

		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`stacks middlewares to adjust the request`, async function () {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: {
				Accept: `application/json`,
				"X-Test": "false",
			},
			rawBody: `{"test":"data"}`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1")
			.use(addHeader(`Accept`, `application/json`))
			.use((req, next) => next({
				headers: {
					"X-Test": (req.headers as any)["X-Test"] === "true" ? "false" : "none",
				}
			}))
			.use(addHeader(`X-Test`, `true`))
			.post(`account`, { test: `data` })

		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`allows using one-off middlewares`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: {
				Accept: `application/json`,
			},
			rawBody: `{"test":"data"}`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").post(
			`account`,
			{ test: `data` },
			{
				middleware: addHeader(`Accept`, `application/json`),
			}
		)

		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`stacks one-off middlewares to adjust the request`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: {
				Accept: `application/json`,
				"X-Test": `false`,
			},
			rawBody: `{"test":"data"}`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1")
			.use(addHeader("Accept", "application/json"))
			.use(addHeader("X-Test", "true"))
			.post(
				`account`,
				{ test: `data` },
				{
					middleware: (req, next) =>
						next({
							headers: {
								"X-Test": (req.headers as any)['X-Test'] === "true" ? "false" : "none",
							},
						}),
				}
			)
			
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`ignores the query string entirely`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").get(
			`account`
		)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`appends to the query string`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?original=true&test=data`,
			response: 200,
		})

		const response = await Client.start("https://api.test.com/v1").get(
			`account?original=true`,
			{ test: `data` }
		)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`handles custom qs options`, async function (this: Mocha.Context & {}) {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/query?test%5B0%5D=one&test%5B1%5D=two&test%5B2%5D=three`,
			response: 200,
		})
		// @ts-ignore
		fetchMock.get({
			url: `https://api.query-test.com/v1/query?test=one&test=two&test=three`,
			response: 200,
		})

		const defaultResponse = await Client.start("https://api.test.com/v1").get(
			`query`,
			{ test: ["one", "two", "three"] }
		)
		expect(defaultResponse.ok).to.be.true
		expect(defaultResponse.status).to.equal(200)

		const optionsClient = create(`https://api.query-test.com/v1`, {
			qs: { stringify: { indices: false } },
		})
		const optionsResponse = await optionsClient.get(`query`, {
			test: ["one", "two", "three"],
		})
		expect(optionsResponse.ok).to.be.true
		expect(optionsResponse.status).to.equal(200)
	})

	it(`throws on requests with failure status codes`, function () {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account`,
			response: 400,
		})

		expect(
			Client.start("https://api.test.com/v1").get(`account`)
		).to.eventually.be.rejectedWith(RequestError, `Request failed: Bad Request`)
	})
})

function addHeader(name: string, value: string): Middleware {
	return (_, next) => {
		return next({
			headers: {
				[name]: value,
			},
		})
	}
}
