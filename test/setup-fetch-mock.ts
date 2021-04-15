// @ts-ignore this is necessary b/c, for some reason, addMatcher isn't available in TS context on fetchMock
import Route from 'fetch-mock/cjs/Route/index'

Route.addMatcher({
	name: 'credentials',
	matcher: (m: {credentials: boolean}) => (_: string, opts: {credentials?: string}) =>
	    m.credentials === (opts.credentials === 'include')
})

Route.addMatcher({
	name: 'rawBody',
	usesBody: true,
	matcher: (m: {rawBody: Function | string}) => (_: string, opts: {body: string}) =>
		typeof m.rawBody === 'function' ? m.rawBody(opts.body) : m.rawBody === opts.body
})