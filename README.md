relax-client
============

[![CircleCI](https://circleci.com/gh/tshelburne/relax-client.svg?style=svg)](https://circleci.com/gh/tshelburne/relax-client)

A super-simple REST client creation tool to encourage custom API clients for every business.

## Intention

Every time I stepped into a project, the frontend code was littered with bespoke, individual
`fetch` (or `axios`, flavor-of-the-week, etc.) requests being made every time the developer
needed to hit the API. When I see that, my eyes cross and I get tired. So I started always
creating custom API clients for every project.

This library aims to make that task a little easier.

`relax-client` is a wrapper around fetch that uses middlewares to apply helpful additional
features. The library ships with several middlewares, but writing new ones is trivial.

## Usage

```bash
npm install --save relax-client
```

```js
// api-client.js

import create, {bearerAuth, json} from 'relax-client'

const client = create(`https://api.test.com/v1`)
	.use(bearerAuth(`storage-key`))
	.use(json())

export const login = (username, password) => client.post(`login`, {username, password})
export const logout = () => client.get(`logout`)

export const getAccount = () => client.get(`account`)
export const updateAccount = (username) => client.put(`account`, {username})
export const deleteAccount = () => client.destroy(`account`)

// app.js

import * as client from './api-client'

loginForm.on(`submit`, async function(e) {
	e.preventDefault()

	const username = loginForm.querySelector(`[name="username"]`).value
	const password = loginForm.querySelector(`[name="password"]`).value

	const {success} = await client.login(username, password)
	if (success) {
		const account = await client.getAccount()
	}
})
```

### Middleware

Middlewares are added via the `use` function. Each middleware function is called with two arguments - 
the current `request` details and a callback that accepts an update object for those request details. 
The callback will return a Promise that ultimately resolves with the response object, and your 
middlewares can further process the response.

Depending on what actions your middlewares take, the order can matter. They take effect in the order they
are added for the creation of the response (FILO), and in reverse order for updating the request (LIFO).

```js
import create, {Client, form} from 'relax-client'

function custom() {
	return (request, next) => {
		console.log(`requesting ${request.url}`)
		const response = await next({url: `${request.url}?some-extra-data`})
		const text = await response.text()
		console.log(`response: ${text}`)
		return text
	}
}

const {get, post, put, destroy} = create(`https://api.test.com/v1`)
	.use(form())
	.use(custom())

// client.get | client.post | etc.
```

An individual request can also be configured to use a "one-off" middleware in the event it differs
from the conventions of the API at large (eg. a particularly large request body needs compression).

```js
import create, {json} from 'relax-client'
import gzip from 'relax-client/dist/middlewares/gzip'

const client = create(`https://api.test.com/v1`).use(json())

export const createAccount = (username, criminalRecord) =>
	client.post(`account`, {username, criminalRecord}, { middleware: gzip() })
export const getAccount = () => client.get(`account`)
```

#### Bearer Auth

The bearer auth middleware can be used to automatically configure all requests to the API with
authentication headers. By default, it uses the `Authorization` header and stores auth tokens
in `localStorage`, but can be configured according to your use case.

```js
import create, {bearerAuth} from 'relax-client'

// the following all store an auth token in local storage
const authMiddleware = bearerAuth(`storage-key`)
const authMiddleware = bearerAuth(`storage-key`, {store: bearerAuth.THIS_SUBDOMAIN})
const authMiddleware = bearerAuth(`storage-key`, {store: 'localstorage'})

// the following all store an auth token in a cookie
const authMiddleware = bearerAuth(`storage-key`, {store: bearerAuth.ALL_SUBDOMAINS})
const authMiddleware = bearerAuth(`storage-key`, {store: 'cookie'})

// the following all store an auth token in memory
const authMiddleware = bearerAuth(`storage-key`, {store: bearerAuth.THIS_SESSION})
const authMiddleware = bearerAuth(`storage-key`, {store: 'memory'})

// this will use X-Auth-Token as both the request and response header for the token
const authMiddleware = bearerAuth(`storage-key`, {header: `X-Auth-Token`})

// client usage
const client = create(`https://api.test.com/v1`).use(authMiddleware)

// this should return a response with an Authorization (or custom) header containing an auth token
await client.post('/login', {username, password})

// all subsequent requests will automatically contain an Authorization (or custom) header with the token
const res = await client.get('/account')
```

The store config value can also be an object with functions `read` and `write`. In that case, `read`
will take the storage key as an argument, and `write` will take both the storage key and token value.
Either or both functions can return a simple value or a promise. In the example below, some tokens
service is responsible both for generating the key that's used and for reading / writing to some
other custom storage location.

```js
import create, {bearerAuth} from 'relax-client'
import tokens from './services/tokens'

// the following all store an auth token in local storage
const authMiddleware = bearerAuth(tokens.getKey(), {
	store: {
		read: (k) => tokens.get(k),
		write: (k, v) => tokens.put(k, v),
	}
})
```

#### Gzip

A gzip middleware for compressing request bodies is available, but it uses Pako, which is too large
a library to include by default. Given that, it's not exposed from the index file, so it will need
to be explicitly loaded from the dist directory.

```js
import create, {Client, json} from 'relax-client'
import gzip from 'relax-client/dist/middlewares/gzip'

const {get, post, put, destroy} = create(`https://api.test.com/v1`)
	.use(json())
	.use(gzip())
```
