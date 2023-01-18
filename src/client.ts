import qs from 'qs'
import deepmerge from 'deepmerge'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Domain = string
type Path = string
type Data = object

export interface Req extends RequestInit {
	url: Request['url']
}

export interface Middleware<In = Response, Out = In> {
	(req: Req, next: (updates?: Partial<Req>) => Promise<In>): Promise<Out>
}
type In<M> = M extends Middleware<infer I, any> ? I : never
type Out<M> = M extends Middleware<any, infer O> ? O : never

export interface ClientOpts {
	qs?: {
		parse?: qs.IParseOptions
		stringify?: qs.IStringifyOptions
	}
}

export interface RequestOpts<T, U> {
	middleware?: Middleware<T, U>
}

function create(apiRoot: Domain, options: ClientOpts = {}) {
	return Client.start(apiRoot, options)
}

export default create

export class Client<M extends Middleware<any, any> = never> {

	get lastResponse() {
		return this._lastResponse
	}

	private _lastResponse: Response | null = null

	private constructor(
		readonly apiRoot: Domain, 
		readonly options: ClientOpts = {},
		private _middleware: M,
		) {}

	static start(apiRoot: Domain, options: ClientOpts = {}) {
		const client = new Client(apiRoot, options, async (req: Req): Promise<Response> => {
			const requestOpts = {
				...req,
				method: req.method?.toUpperCase() ?? 'GET',
				headers: new Headers(req.headers)
			}
		
			client._lastResponse = await fetch(req.url, requestOpts)
			if (!client._lastResponse.ok) throw new RequestError(client._lastResponse)
			return client._lastResponse
		})
		return client
	}

	use<T>(fn: Middleware<Out<M>, T>): Client<Middleware<In<M>, T>> { 
		return new Client(this.apiRoot, this.options, compose(this._middleware, fn))
	}

	get<T>(...args: [Path, Data?, RequestOpts<Out<M>, T>?]) {
		return this.request(`get`, ...args)
	}

	post<T>(...args: [Path, Data?, RequestOpts<Out<M>, T>?]) {
		return this.request(`post`, ...args)
	}

	put<T>(...args: [Path, Data?, RequestOpts<Out<M>, T>?]) {
		return this.request(`put`, ...args)
	}

	patch<T>(...args: [Path, Data?, RequestOpts<Out<M>, T>?]) {
		return this.request(`patch`, ...args)
	}

	destroy<T>(...args: [Path, Data?, RequestOpts<Out<M>, T>?]) {
		return this.request(`delete`, ...args)
	}

	async request<T>(method: Method, rawPath: Path, data: Data = {}, opts: RequestOpts<Out<M>, T> = {}): Promise<Response> {
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
		const run = opts?.middleware ? compose(this._middleware, opts.middleware) : this._middleware
		// @ts-ignore
		return run({url, method, body})
	}

}

function compose<T, U, V>(m1: Middleware<T, U>, m2: Middleware<U, V>): Middleware<T, V> {
	return async (req, next) => {
		const nextFn = (updates?: Partial<Req>) => m1(merge(req, updates ?? {}) as Req, next)
		return m2(req, nextFn)
	}
}

export class RequestError extends Error {
	constructor(readonly response: Response) {
		super(`Request failed: ${response.statusText}`)
	}
}

function merge(obj1: object, obj2: object): object {
	return obj2 ? deepmerge(obj1, obj2) : obj1
}