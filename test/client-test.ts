import {expect} from 'chai'
import fetchMock from 'fetch-mock'
import create, {RequestError} from '../src/client'
import json from '../src/middlewares/json'
import form from '../src/middlewares/form'

describe(`a basic client`, function() {

	beforeEach(function() {
		this.client = create(`https://api.test.com/v1`)
	})

	afterEach(function() {
		fetchMock.reset()
	})

	it(`makes GET requests`, async function() {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?test=data`,
			response: 200
		})

		const response = await this.client.get(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes POST requests`, async function() {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			rawBody: `{"test":"data"}`,
			response: 200
		})

		const response = await this.client.post(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes PUT requests`, async function() {
		// @ts-ignore
		fetchMock.put({
			url: `https://api.test.com/v1/account`,
			rawBody: `{"test":"data"}`,
			response: 200
		})

		const response = await this.client.put(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes PATCH requests`, async function() {
		// @ts-ignore
		fetchMock.patch({
			url: `https://api.test.com/v1/account`,
			rawBody: `{"test":"data"}`,
			response: 200
		})

		const response = await this.client.patch(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`makes DELETE requests`, async function() {
		// @ts-ignore
		fetchMock.delete({
			url: `https://api.test.com/v1/account?test=data`,
			response: 200
		})

		const response = await this.client.destroy(`account`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`allows using one-off middlewares`, async function() {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: {
				'Content-Type': `application/json`,
				'Accept': `application/json`
			},
			rawBody: `{"test":"data"}`,
			response: {data: true}
		})

		const response = await this.client.post(`account`, {test: `data`}, {
			middlewares: [json()]
		})

		expect(response).to.deep.equal({data: true})
	})

	it(`appends one-off middlewares to existing ones`, async function() {
		// @ts-ignore
		fetchMock.post({
			url: `https://api.test.com/v1/account`,
			headers: {
				'Content-Type': `multipart/form-data`,
				'Accept': `application/json`
			},
			rawBody: (body: any) => {
				return body._streams[0].includes(`name="test"`) && body._streams[1] === `data`
			},
			response: {data: true}
		})

		this.client = create(`https://api.test.com/v1`, [json()])
		const response = await this.client.post(`account`, {test: `data`}, {
			middlewares: [form()]
		})

		expect(response).to.deep.equal({data: true})
	})

	it(`ignores the query string entirely`, async function() {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account`,
			response: 200,
		})

		const response = await this.client.get(`account`)
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`appends to the query string`, async function() {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account?original=true&test=data`,
			response: 200,
		})

		const response = await this.client.get(`account?original=true`, {test: `data`})
		expect(response.ok).to.be.true
		expect(response.status).to.equal(200)
	})

	it(`handles custom qs options`, async function() {
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

		const defaultResponse = await this.client.get(`query`, {test: ['one', 'two', 'three']})
		expect(defaultResponse.ok).to.be.true
		expect(defaultResponse.status).to.equal(200)

		const optionsClient = create(`https://api.query-test.com/v1`, [], {qs: {stringify: {indices: false}}})
		const optionsResponse = await optionsClient.get(`query`, {test: ['one', 'two', 'three']})
		expect(optionsResponse.ok).to.be.true
		expect(optionsResponse.status).to.equal(200)
	})

	it(`throws on requests with failure status codes`, function() {
		// @ts-ignore
		fetchMock.get({
			url: `https://api.test.com/v1/account`,
			response: 400,
		})

		expect(this.client.get(`account`)).to.eventually.be.rejectedWith(RequestError, `Request failed: Bad Request`)
	})

})