import { expect } from "chai"
import { spy, fake } from "sinon"
import { compose, Middleware } from "../src/middleware"

const empty = () => Promise.resolve(new Response())

describe(`compose`, function () {
	it("calls with the initial request", async () => {
		const m1 = fake()
		const m2 = fake()
		await compose(m1, m2)({ url: `https://api.test.com/v1/account` }, empty)
		expect(m2).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
		})
		expect(m1).not.to.have.been.called
	})

	it('calls with the original request', async () => {
		const m1 = fake()
		const m2 = spy((_, next) => next())
		await compose(m1, m2)({ url: `https://api.test.com/v1/account` }, empty)
		expect(m2).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
		})
		expect(m1).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
		})
	})

	it("calls with the updated request", async () => {
		const m1 = fake()
		const m2 = spy(addHeader(`Content-Type`, `application/json`))
		await compose(m1, m2)({ url: `https://api.test.com/v1/account` }, empty)
		expect(m1).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
			headers: {
				"Content-Type": "application/json",
			},
		})
	})

	it("passes through the response", async () => {
		const m1 = spy(respond(200))
		const m2 = spy(status)
		const res = await compose(m1, m2)(
			{ url: `https://api.test.com/v1/account` },
			empty
		)
		expect(res).to.equal(200)
	})

	it("correctly threads request / response through many middlewares", async () => {
		const m1 = spy(respond(200, { success: true }))
		const m2 = spy(addHeader(`Content-Type`, `application/json`))
		const m3 = spy(addHeader(`Accept`, `application/json`))
		const m4 = spy(method('post'))
		const m5 = spy(json)
		const res = await compose(compose(compose(compose(m1, m2), m3), m4), m5)(
			{ url: `https://api.test.com/v1/account` },
			empty
		)
		expect(res).to.deep.equal({ success: true })
		expect(m1).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
			method: 'post',
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		})
		expect(m2).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
			method: 'post',
			headers: {
				Accept: "application/json",
			}
		})
		expect(m3).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
			method: 'post',
		})
		expect(m4).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
		})
		expect(m5).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
		})
	})

	it("works when composed middleware is passed in as the second argument", async () => {
		const m1 = spy(respond(200, { success: true }))
		const m2 = spy(addHeader(`Content-Type`, `application/json`))
		const m3 = spy(addHeader(`Accept`, `application/json`))
		const m4 = spy(method('post'))
		const m5 = spy(json)
		const res = await compose(m1, compose(m2, compose(m3, compose(m4, m5))))(
			{ url: `https://api.test.com/v1/account` },
			empty
		)
		expect(res).to.deep.equal({ success: true })
		expect(m1).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
			method: 'post',
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		})
		expect(m2).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
			method: 'post',
			headers: {
				Accept: "application/json",
			}
		})
		expect(m3).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
			method: 'post',
		})
		expect(m4).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
		})
		expect(m5).to.have.been.calledWith({
			url: `https://api.test.com/v1/account`,
		})
	})
})

const respond: (s: number, d?: string | object) => Middleware = (status, data = {}) => (req) => {
	const body = JSON.stringify(data)
	return Promise.resolve(new Response(body, { status }))
}

const method: (m: 'get' | 'post' | 'put' | 'delete') => Middleware = (method) => (_, next) => next({ method })

const addHeader: (k: string, v: string) => Middleware =
	(key, value) => (_, next) => {
		return next({ headers: { [key]: value } })
	}

const status: Middleware<Response, number> = (_, next) => {
	return next().then((r) => r.status)
}

const json: Middleware<Response, object> = (_, next) => {
	return next().then((r) => r.json())
}