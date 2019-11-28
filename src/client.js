import qs from 'qs'
import merge from 'deepmerge'

function create(apiRoot, middlewares) {
	const client = new Client(apiRoot)
	middlewares.forEach((fn) => client.use(fn))
	return [`get`, `post`, `put`, `destroy`].map((k) => client[k].bind(client))
}

export default create

const MIDDLEWARES = Symbol(`MIDDLEWARES`)

export class Client {

	constructor(apiRoot) {
		this.apiRoot = apiRoot
		this[MIDDLEWARES] = [send()]
	}

	use(fn) {
		this[MIDDLEWARES].unshift(fn)
	}

	get(...args) {
		return this.request(`get`, ...args)
	}

	post(...args) {
		return this.request(`post`, ...args)
	}

	put(...args) {
		return this.request(`put`, ...args)
	}

	destroy(...args) {
		return this.request(`destroy`, ...args)
	}

	request(method, rawPath, data = {}) {
		const body = [`post`, `put`].includes(method) ? JSON.stringify(data) : undefined

		const [, path, search] = rawPath.match(/(.*)(\?.*)?/)
		const encodedPath = path.split(`/`).map(encodeURIComponent).join(`/`)
		const query = qs.stringify({...qs.parse(search), ...(body ? null : data)})
		const url = `${this.apiRoot}/${encodedPath}${query && `?${query}`}` // eslint-disable-line no-undef

		return run({url, method, body}, this[MIDDLEWARES])
	}

}

export class RequestError extends Error {
	constructor(response) {
		super(`Request failed: ${response.statusText}`)
		this.response = response
	}
}

function run(request, [fn, ...rest]) {
	if (!rest.length) return fn(request)

	return fn(request, (updates) => run(merge(request, updates), rest))
}

function send() {
	return async (request) => {
		const {headers, ...rest} = request
		const response = await fetch(new Request({...rest, headers: new Headers(headers)}))
		if (!response.ok) throw new RequestError(response)
		return response
	}
}