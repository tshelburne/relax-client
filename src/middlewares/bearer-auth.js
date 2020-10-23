const stores = {
	cookie: {
		read: (k) => {
			const res = document.cookie.match(new RegExp(`${k}=([^;]*)`))
			return res ? res[1] : null
		},
		write: (k, v) => document.cookie = `${k}=${v}`,
	},
	localstorage: {
		read: localStorage.getItem,
		write: localStorage.setItem,
	},
	memory: {
		_store: {},
		read: (k) => stores.memory._store[k],
		write: (k, v) => stores.memory._store[k] = v,
	}
}

function bearerAuth(tokenKey, {store = 'localstorage'} = {}) {
	return async (_, next) => {
		const {read, write} = typeof store === 'object' ? store : stores[store]

		const token = await read(tokenKey)
		const response = await next({
			credentials: `include`,
			headers: {
				Authorization: token ? `Bearer ${token}` : ``,
			}
		})

		if (response.headers.has(`Authorization`)) {
			await write(tokenKey, response.headers.get(`Authorization`))
		}

		return response
	}
}

bearerAuth.ALL_SUBDOMAINS = 'cookie'
bearerAuth.THIS_SUBDOMAIN = 'localstorage'
bearerAuth.THIS_SESSION = 'memory'

export default bearerAuth