import qs from 'qs'
import { Req, Middleware, compose } from './middleware'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Domain = string
type Path = string
type Data = object

type Out<M> = M extends Middleware<any, infer O> ? O : never

export interface ClientOpts {
	qs?: {
		parse?: qs.IParseOptions
		stringify?: qs.IStringifyOptions
	}
}

export interface RequestOpts {
	middleware?: Middleware
}

function create(apiRoot: Domain, options: ClientOpts = {}) {
	return Client.start(apiRoot, options)
}

export default create

export class Client<M extends Middleware<Response, any>> {

	get lastResponse() {
		return this._lastResponse
	}

	private _lastResponse: Response | null = null

	private constructor(
		readonly apiRoot: Domain, 
		readonly options: ClientOpts = {},
		private _middleware: M,
		) {}

	static start(apiRoot: Domain, options: ClientOpts = {}): Client<Middleware> {
		const client = new Client(apiRoot, options, (_, next) => next())
		return client
	}

	use<T>(fn: Middleware<Out<M>, T>) { 
		return new Client(this.apiRoot, this.options, compose(this._middleware, fn))
	}

	get(...args: [Path, Data?, RequestOpts?]) {
		return this.request(`get`, ...args)
	}

	post(...args: [Path, Data?, RequestOpts?]) {
		return this.request(`post`, ...args)
	}

	put(...args: [Path, Data?, RequestOpts?]) {
		return this.request(`put`, ...args)
	}

	patch(...args: [Path, Data?, RequestOpts?]) {
		return this.request(`patch`, ...args)
	}

	destroy(...args: [Path, Data?, RequestOpts?]) {
		return this.request(`delete`, ...args)
	}

	async request(method: Method, rawPath: Path, data: Data = {}, opts: RequestOpts = {}): Promise<Out<M>> {
		// prepare body
		const acceptsBody = [`post`, `put`, `patch`].includes(method)
		const body = acceptsBody ? JSON.stringify(data) : undefined

		// prepare url
		const [, path, search] = rawPath.match(/([^\?]*)\??(.*)?/) as [string, string, string]
		const encodedPath = path.split(`/`).filter(v => v).map(encodeURIComponent).join(`/`)
		const parsedQs = qs.parse(search, this.options.qs?.parse)
		const query = qs.stringify({...parsedQs, ...(acceptsBody ? null : data)}, this.options.qs?.stringify)
		const url = `${this.apiRoot}/${encodedPath}${query && `?${query}`}` // eslint-disable-line no-undef

		// run request
		const middleware = opts?.middleware ? compose(opts.middleware, this._middleware) : this._middleware
		const run = compose(async (req: Req): Promise<Response> => {
			const requestOpts = {
				...req,
				method: req.method?.toUpperCase() ?? 'GET',
				headers: new Headers(req.headers)
			}
		
			this._lastResponse = await fetch(req.url, requestOpts)
			if (!this._lastResponse.ok) throw new RequestError(this._lastResponse)
			return this._lastResponse
		}, middleware)
		// @ts-ignore
		return run({url, method, body})
	}

}

export class RequestError extends Error {
	constructor(readonly response: Response) {
		super(`Request failed: ${response.statusText}`)
	}
}
