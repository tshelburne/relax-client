import fetchMock from 'fetch-mock'

fetchMock.addMatcher({
	name: 'credentials',
	matcher: ({credentials}) => (_, opts) => {
		return credentials === (opts.credentials === 'include')
	}
})

fetchMock.addMatcher({
	name: 'rawBody',
	usesBody: true,
	matcher: ({rawBody}) => (_, {body}) =>
		typeof rawBody === 'function' ? rawBody(body) : rawBody === body
})
