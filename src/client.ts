import qs from 'qs'
import deepmerge from 'deepmerge'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Domain = string
type Path = string
type Data = object
interface IRequest extends RequestInit {
	url: Request['url']
}

type Next<T> = (updates?: Partial<IRequest>) => Promise<T>
export type Middleware<T = Response, U = Response> = (req: IRequest, next: Next<U>) => Promise<T>
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

	[MIDDLEWARES]: Middleware[]

	constructor(
		readonly apiRoot: string, 
		readonly options: ClientOpts = {}
		) {
		this[MIDDLEWARES] = []
	}

	use(this: Client, fn: Middleware): void {
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
		const [, path, search] = rawPath.match(/([^\?]*)\??(.*)?/) as [string, string, string]
		const encodedPath = path.split(`/`).filter(v => v).map(encodeURIComponent).join(`/`)
		const parsedQs = qs.parse(search, this.options.qs?.parse)
		const query = qs.stringify({...parsedQs, ...(acceptsBody ? null : data)}, this.options.qs?.stringify)
		const url = `${this.apiRoot}/${encodedPath}${query && `?${query}`}` // eslint-disable-line no-undef

		// run request
		const middlewares = this[MIDDLEWARES].concat(...(opts.middlewares || []))
		return run({url, method, body}, middlewares)
	}

}

export class RequestError extends Error {
	constructor(readonly response: Response) {
		super(`Request failed: ${response.statusText}`)
	}
}

function run(req: IRequest, [fn, ...rest]: Middleware[]): Promise<any>  {
	if (!fn) return send(req as Request)

	return fn(req, (updates) => run(merge(req, updates ?? {}) as IRequest, rest))
	
}

function merge(obj1: object, obj2: object): object {
	return obj2 ? deepmerge(obj1, obj2) : obj1
}

async function send({url, method, headers, ...rest}: Request): Promise<Response> {
	const requestOpts = {
		...rest,
		method: method.toUpperCase(),
		headers: new Headers(headers)
	}

	const response = await fetch(url, requestOpts)
	if (!response.ok) throw new RequestError(response)
	return response
}