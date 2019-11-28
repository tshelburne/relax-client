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

const {get, post, put, destroy} = create(`https://api.test.com/v1`, [
	json(),
	bearerAuth(`storage-key`),
])

export const login = (username, password) => post(`login`, {username, password})
export const logout = () => get(`logout`)

export const getAccount = () => get(`account`)
export const updateAccount = (username) => put(`account`, {username})
export const deleteAccount = () => destroy(`account`)

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

Middlewares are passed as the second argument to the `create` function, or if you prefer an Express-like
interface, as the only argument to the `Client.use` function (both shown below).

Each middleware function is called with two arguments - the current `request` details and a callback that
accepts an update object for those request details. The callback will return a Promise that ultimately
resolves with the response object, and your middlewares can further process the response.

Depending on what actions your middlewares take, the order can matter. They take effect in the order they
are added for the creation of the request, and in reverse order for handling the response.

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

const {get, post, put, destroy} = create(`https://api.test.com/v1`, [
	form(),
	custom(),
])

// is equivalent to

const client = new Client(`https://api.test.com/v1`)
client.use(form())
client.use(custom())

// client.get | client.post | etc.
```