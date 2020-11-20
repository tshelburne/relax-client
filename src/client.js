import qs from 'qs'
import deepmerge from 'deepmerge'

function create(apiRoot, middlewares = [], options = {}) {
	const client = new Client(apiRoot, options)
	middlewares.forEach((fn) => client.use(fn))
	return [`get`, `post`, `put`, `patch`, `destroy`].reduce((acc, k) => ({
		...acc,
		[k]: client[k].bind(client),
	}), client)
}

export default create

const MIDDLEWARES = Symbol(`MIDDLEWARES`)

export class Client {

	constructor(apiRoot, options = {}) {
		this.apiRoot = apiRoot
		this.options = options
		this[MIDDLEWARES] = []
	}

	use(fn) {
		this[MIDDLEWARES].push(fn)
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

	patch(...args) {
		return this.request(`patch`, ...args)
	}

	destroy(...args) {
		return this.request(`delete`, ...args)
	}

	request(method, rawPath, data = {}, opts = {}) {
		const body = [`post`, `put`, `patch`].includes(method) ? JSON.stringify(data) : undefined

		const [, path, search] = rawPath.match(/([^\?]*)\??(.*)?/)
		const encodedPath = path.split(`/`).filter(v => v).map(encodeURIComponent).join(`/`)
		const parsedQs = qs.parse(search, this.options.qs?.parse)
		const query = qs.stringify({...parsedQs, ...(body ? null : data)}, this.options.qs?.stringify)
		const url = `${this.apiRoot}/${encodedPath}${query && `?${query}`}` // eslint-disable-line no-undef

		const middlewares = this[MIDDLEWARES].concat(...(opts.middlewares || []), send())
		return run({url, method, body}, middlewares)
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

function merge(obj1, obj2) {
	return obj2 ? deepmerge(obj1, obj2) : obj1
}

function send() {
	return async (request) => {
		const {url, headers, method, ...rest} = request
		const response = await fetch(url, {
			...rest,
			method: method.toUpperCase(),
			headers: new Headers(headers)})
		if (!response.ok) throw new RequestError(response)
		return response
	}
}