import qs from 'qs'
import deepmerge from 'deepmerge'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Domain = string
type Path = string
type Data = object
interface IRequest extends RequestInit {
	url: Request['url']
}

type Middleware = (req: IRequest, next?: (req: Partial<IRequest>) => IRequest) => IRequest
interface ClientOpts {
	qs?: {
		parse?: qs.IParseOptions
		stringify?: qs.IStringifyOptions
	}
}
interface RequestOpts {
	middlewares?: Middleware[]
}

type CreateReturn = Pick<Client, 'get' | 'post' | 'put' | 'patch' | 'destroy'>
function create(apiRoot: Domain, middlewares: Middleware[] = [], options: ClientOpts = {}): CreateReturn {
	const client = new Client(apiRoot, options)
	middlewares.forEach((fn) => client.use(fn))
	return {
		get: client.get.bind(client),
		post: client.post.bind(client),
		put: client.put.bind(client),
		patch: client.patch.bind(client),
		destroy: client.destroy.bind(client),
	}
}

export default create

const MIDDLEWARES = Symbol(`MIDDLEWARES`)

export class Client {

	constructor(
		readonly apiRoot: string, 
		readonly options: ClientOpts = {}
		) {
		this[MIDDLEWARES] = []
	}

	use(this: Client, fn) {
		this[MIDDLEWARES].push(fn)
	}

	get(this: Client, ...args: [Path, Data?, RequestOpts?]) {
		return this.request(`get`, ...args)
	}

	post(this: Client, ...args: [Path, Data?, RequestOpts?]) {
		return this.request(`post`, ...args)
	}

	put(this: Client, ...args: [Path, Data?, RequestOpts?]) {
		return this.request(`put`, ...args)
	}

	patch(this: Client, ...args: [Path, Data?, RequestOpts?]) {
		return this.request(`patch`, ...args)
	}

	destroy(this: Client, ...args: [Path, Data?, RequestOpts?]) {
		return this.request(`delete`, ...args)
	}

	async request(this: Client, method: Method, rawPath: Path, data: Data = {}, opts: RequestOpts = {}): Promise<Response> {
		// prepare body
		const acceptsBody = [`post`, `put`, `patch`].includes(method)
		const body = acceptsBody ? JSON.stringify(data) : undefined

		// prepare url
		const [, path, search] = rawPath.match(/([^\?]*)\??(.*)?/)
		const encodedPath = path.split(`/`).filter(v => v).map(encodeURIComponent).join(`/`)
		const parsedQs = qs.parse(search, this.options.qs?.parse)
		const query = qs.stringify({...parsedQs, ...(acceptsBody ? null : data)}, this.options.qs?.stringify)
		const url = `${this.apiRoot}/${encodedPath}${query && `?${query}`}` // eslint-disable-line no-undef

		// prepare request
		const middlewares = this[MIDDLEWARES].concat(...(opts.middlewares || []), finalize())
		const {url: finalUrl, ...requestOpts} = prepare({url, method, body}, middlewares)
		
		// fetch response
		const response = await fetch(finalUrl, requestOpts)
		if (!response.ok) throw new RequestError(response)
		return response
	}

}

export class RequestError extends Error {
	readonly response: Response
	
	constructor(response) {
		super(`Request failed: ${response.statusText}`)
		this.response = response
	}
}

function prepare(req: IRequest, [fn, ...rest]: Middleware[]) {
	if (!fn) return req
	if (!rest.length) return fn(req)

	return fn(req, (updates) => prepare(merge(req, updates) as IRequest, rest))
	
}

function merge(obj1: object, obj2: object): object {
	return obj2 ? deepmerge(obj1, obj2) : obj1
}

function finalize(): Middleware {
	return ({method, headers, ...rest}) => {
		return {
			...rest,
			method: method.toUpperCase(),
			headers: new Headers(headers)
		}
	}
}